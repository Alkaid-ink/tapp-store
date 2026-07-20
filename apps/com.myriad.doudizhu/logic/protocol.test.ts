/**
 * Unit tests for shipped multiplayer 斗地主 protocol layer.
 *
 *   pnpm exec tsx --test src/tapp/examples/doudizhu/protocol.test.ts
 */
/* eslint-disable test/no-import-node-test -- node:test; project has no vitest dep */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  applyProtocolMessage,
  assignSeats,
  buildDealStart,
  canStartMatch,
  createSession,
  decodeRoomMessage,
  DOUDIZHU_MESSAGE_TYPE,
  encodeRoomPayload,
  hostNextSeq,
  hostProcessIntent,
  isIntent,
  makeIntent,
  ownHand,
  seatActor,
  seatForActor,
  toPublicView,
} from './protocol.ts'
import type { ProtocolMessage, SessionState } from './protocol.ts'
import { HAND_SIZE, handCounts } from './rules.ts'

const ACTORS = ['actor:carol', 'actor:alice', 'actor:bob'] as const

/** Fan-out: host emits, every session applies the same canonical messages. */
function fanout(
  sessions: SessionState[],
  msgs: ProtocolMessage[],
): SessionState[] {
  let out = sessions
  for (const msg of msgs) {
    out = out.map((s) => {
      const r = applyProtocolMessage(s, msg)
      assert.equal(r.ok, true, r.error)
      return r.session
    })
  }
  return out
}

describe('seat assignment', () => {
  it('is deterministic for 3 actors', () => {
    const s1 = assignSeats([...ACTORS])
    const s2 = assignSeats([...ACTORS].reverse())
    assert.deepEqual(s1, s2)
    assert.equal(Object.keys(s1).length, 3)
    const seats = new Set(Object.values(s1))
    assert.deepEqual([...seats].sort(), [0, 1, 2])
    assert.equal(s1['actor:alice'], 0)
    assert.equal(s1['actor:bob'], 1)
    assert.equal(s1['actor:carol'], 2)
  })

  it('seatForActor returns mapped seat', () => {
    const seats = assignSeats([...ACTORS])
    assert.equal(seatForActor(seats, 'actor:bob'), 1)
    assert.equal(seatForActor(seats, 'actor:nobody'), null)
  })

  it('seatActor fills free seats and is idempotent', () => {
    let seats: Record<string, 0 | 1 | 2> = {}
    seats = seatActor(seats, 'actor:alice')!
    assert.equal(seats['actor:alice'], 0)
    seats = seatActor(seats, 'actor:bob')!
    assert.equal(seats['actor:bob'], 1)
    seats = seatActor(seats, 'actor:alice')!
    assert.equal(seats['actor:alice'], 0)
    seats = seatActor(seats, 'actor:carol')!
    assert.equal(Object.keys(seats).length, 3)
    assert.equal(seatActor(seats, 'actor:dave'), null)
  })
})

describe('encode / decode', () => {
  it('round-trips room payload with message_type doudizhu', () => {
    const msg = buildDealStart(1, 42, [...ACTORS], 'actor:alice', 0)
    const encoded = encodeRoomPayload(msg)
    assert.equal(encoded.message_type, DOUDIZHU_MESSAGE_TYPE)
    const decoded = decodeRoomMessage(encoded)
    assert.ok(decoded)
    assert.equal(decoded!.type, 'deal_start')
    assert.equal((decoded as ProtocolMessage).seq, 1)
  })

  it('decodes WS-shaped envelope with nested data', () => {
    const msg = {
      type: 'bid' as const,
      seq: 2,
      seat: 0 as const,
      score: 1 as const,
    }
    const raw = {
      type: 'message',
      data: {
        message_type: DOUDIZHU_MESSAGE_TYPE,
        payload: msg,
      },
    }
    const decoded = decodeRoomMessage(raw)
    assert.ok(decoded)
    assert.equal(decoded!.type, 'bid')
  })

  it('decodes intent payloads', () => {
    const intent = makeIntent('actor:bob', { kind: 'ready', ready: true }, 'nonce-1')
    const decoded = decodeRoomMessage(encodeRoomPayload(intent))
    assert.ok(decoded)
    assert.ok(isIntent(decoded!))
    assert.equal(decoded!.actorId, 'actor:bob')
  })

  it('ignores non-doudizhu messages', () => {
    assert.equal(
      decodeRoomMessage({ message_type: 'chat', payload: { type: 'hi', seq: 1 } }),
      null,
    )
  })
})

describe('deal_start multiplayer consistency', () => {
  it('host deal/start yields same public state for all seats', () => {
    const dealMsg = buildDealStart(1, 100, [...ACTORS], 'actor:alice', 0)

    const sessions = ACTORS.map((id) => {
      let s = createSession(id)
      const r = applyProtocolMessage(s, dealMsg)
      assert.equal(r.ok, true, r.error)
      return r.session
    })

    const publics = sessions.map(s =>
      toPublicView(s.game, s.seats, s.hostActor),
    )
    for (let i = 1; i < publics.length; i++) {
      assert.equal(publics[i]!.phase, publics[0]!.phase)
      assert.equal(publics[i]!.seed, publics[0]!.seed)
      assert.deepEqual(publics[i]!.handCounts, publics[0]!.handCounts)
      assert.equal(publics[i]!.turn, publics[0]!.turn)
      assert.deepEqual(publics[i]!.seats, publics[0]!.seats)
    }
    assert.deepEqual(publics[0]!.handCounts, [HAND_SIZE, HAND_SIZE, HAND_SIZE])
    assert.equal(publics[0]!.phase, 'auction')
    assert.deepEqual(
      sessions[0]!.game.hands.map(h => h.map(c => c.id)),
      sessions[1]!.game.hands.map(h => h.map(c => c.id)),
    )
  })
})

describe('play apply idempotency', () => {
  it('applying the same play payload twice yields identical state', () => {
    const dealMsg = buildDealStart(1, 55, [...ACTORS], 'actor:alice', 0)
    let s = createSession('actor:alice')
    s = applyProtocolMessage(s, dealMsg).session

    const turnSeat = s.game.turn as 0 | 1 | 2
    const bidMsg = {
      type: 'bid' as const,
      seq: 2,
      seat: turnSeat,
      score: 3 as const,
    }
    s = applyProtocolMessage(s, bidMsg).session
    assert.equal(s.game.phase, 'playing')

    const landlord = s.game.landlord as 0 | 1 | 2
    const card = s.game.hands[landlord][0]!
    const playMsg = {
      type: 'play' as const,
      seq: 3,
      seat: landlord,
      cards: [card],
    }

    const r1 = applyProtocolMessage(s, playMsg)
    assert.equal(r1.ok, true, r1.error)
    const after1 = r1.session
    const counts1 = handCounts(after1.game)

    const r2 = applyProtocolMessage(after1, playMsg)
    assert.equal(r2.ok, true)
    const after2 = r2.session
    assert.deepEqual(handCounts(after2.game), counts1)
    assert.equal(after2.game.turn, after1.game.turn)
    assert.equal(after2.lastSeq, after1.lastSeq)
  })
})

describe('ready / start gate', () => {
  it('canStartMatch requires 3 ready seats', () => {
    const seats = assignSeats([...ACTORS])
    assert.equal(canStartMatch(seats, {}), false)
    assert.equal(
      canStartMatch(seats, {
        'actor:alice': true,
        'actor:bob': true,
        'actor:carol': false,
      }),
      false,
    )
    assert.equal(
      canStartMatch(seats, {
        'actor:alice': true,
        'actor:bob': true,
        'actor:carol': true,
      }),
      true,
    )
  })

  it('hostProcessIntent ready seats the joiner', () => {
    let host = createSession('actor:alice')
    host.hostActor = 'actor:alice'
    host.seats = { 'actor:alice': 0 }
    host.ready = { 'actor:alice': true }

    const r = hostProcessIntent(
      host,
      makeIntent('actor:bob', { kind: 'ready', ready: true }, 'bob-ready-1'),
    )
    assert.equal(r.ok, true, r.error)
    assert.ok(r.session.seats['actor:bob'] !== undefined)
    assert.equal(r.session.ready['actor:bob'], true)
    assert.ok(r.emit.some(m => m.type === 'ready'))
    assert.ok(r.emit.some(m => m.type === 'lobby_sync'))
    // Peer applying emit seats bob too
    let peer = createSession('actor:bob')
    for (const m of r.emit) {
      const a = applyProtocolMessage(peer, m)
      assert.equal(a.ok, true, a.error)
      peer = a.session
    }
    assert.ok(peer.seats['actor:bob'] !== undefined)
    assert.equal(peer.ready['actor:bob'], true)
  })
})

describe('ownHand', () => {
  it('returns only the requested seat cards', () => {
    const dealMsg = buildDealStart(1, 7, [...ACTORS], 'actor:alice', 0)
    let s = createSession('actor:bob')
    s = applyProtocolMessage(s, dealMsg).session
    const seat = seatForActor(s.seats, 'actor:bob')!
    const hand = ownHand(s.game, seat)
    assert.equal(hand.length, HAND_SIZE)
    assert.deepEqual(
      hand.map(c => c.id),
      s.game.hands[seat].map(c => c.id),
    )
  })
})

describe('multi-session host-sequenced multiplayer', () => {
  it('two independent clients apply each other actions without dropped plays', () => {
    // Host alice, peers bob & carol — host alone assigns seq
    let host = createSession('actor:alice')
    host.hostActor = 'actor:alice'
    let bob = createSession('actor:bob')
    let carol = createSession('actor:carol')

    // Seat everyone via host intents (as if peers sent ready)
    for (const [actor, nonce, ready] of [
      ['actor:alice', 'a1', true],
      ['actor:bob', 'b1', true],
      ['actor:carol', 'c1', true],
    ] as const) {
      const hr = hostProcessIntent(
        host,
        makeIntent(actor, { kind: 'ready', ready }, nonce),
      )
      assert.equal(hr.ok, true, hr.error)
      // hostProcessIntent already applied emit on host
      host = hr.session
      // peers only apply host-sequenced canonical messages
      for (const m of hr.emit) {
        const br = applyProtocolMessage(bob, m)
        const cr = applyProtocolMessage(carol, m)
        assert.equal(br.ok, true, br.error)
        assert.equal(cr.ok, true, cr.error)
        bob = br.session
        carol = cr.session
      }
    }

    assert.equal(Object.keys(host.seats).length, 3)
    assert.equal(canStartMatch(host.seats, host.ready), true)
    assert.deepEqual(host.seats, bob.seats)
    assert.deepEqual(host.seats, carol.seats)

    // Host deal — single seq stream continues from host.lastSeq
    const dealSeq = hostNextSeq(host)
    const dealMsg = buildDealStart(
      dealSeq,
      2024,
      Object.keys(host.seats),
      'actor:alice',
      0,
    )
    ;[host, bob, carol] = fanout([host, bob, carol], [dealMsg])
    assert.equal(host.game.phase, 'auction')
    assert.equal(bob.game.phase, 'auction')
    assert.equal(carol.game.phase, 'auction')
    assert.equal(host.lastSeq, bob.lastSeq)
    assert.equal(host.lastSeq, carol.lastSeq)

    // Whoever is turn seats bids 3 via intent → host rebroadcasts
    const turnSeat = host.game.turn as 0 | 1 | 2
    const turnActor = Object.keys(host.seats).find(
      a => host.seats[a] === turnSeat,
    )!
    const bidIntent = makeIntent(
      turnActor,
      { kind: 'bid', score: 3 },
      'bid-3',
    )
    const bidHost = hostProcessIntent(host, bidIntent)
    assert.equal(bidHost.ok, true, bidHost.error)
    host = bidHost.session
    for (const m of bidHost.emit) {
      bob = applyProtocolMessage(bob, m).session
      carol = applyProtocolMessage(carol, m).session
    }
    assert.equal(host.game.phase, 'playing')
    assert.equal(bob.game.phase, 'playing')
    assert.equal(carol.game.phase, 'playing')
    assert.equal(host.game.landlord, turnSeat)
    assert.equal(bob.game.landlord, host.game.landlord)

    // Landlord plays one card — even if that landlord is a peer (not host)
    const landlord = host.game.landlord as 0 | 1 | 2
    const landlordActor = Object.keys(host.seats).find(
      a => host.seats[a] === landlord,
    )!
    const card = host.game.hands[landlord][0]!
    const playIntent = makeIntent(
      landlordActor,
      { kind: 'play', cards: [card] },
      'play-1',
    )
    // Peer would send intent; host processes (even if host is not the actor)
    const playHost = hostProcessIntent(host, playIntent)
    assert.equal(playHost.ok, true, playHost.error)
    host = playHost.session
    for (const m of playHost.emit) {
      const br = applyProtocolMessage(bob, m)
      const cr = applyProtocolMessage(carol, m)
      assert.equal(br.ok, true, br.error)
      assert.equal(cr.ok, true, cr.error)
      bob = br.session
      carol = cr.session
    }

    // All three hands agree on public state after peer-authored play
    assert.deepEqual(handCounts(host.game), handCounts(bob.game))
    assert.deepEqual(handCounts(host.game), handCounts(carol.game))
    assert.equal(host.game.turn, bob.game.turn)
    assert.equal(host.game.hands[landlord].length, HAND_SIZE + 3 - 1) // +bottom -1 played
    assert.equal(bob.game.hands[landlord].length, host.game.hands[landlord].length)
    assert.equal(host.lastSeq, bob.lastSeq)
    assert.equal(host.lastSeq, carol.lastSeq)

    // Applying the same canonical play again is idempotent on all sessions
    const playMsg = playHost.emit[0]!
    const host2 = applyProtocolMessage(host, playMsg).session
    const bob2 = applyProtocolMessage(bob, playMsg).session
    assert.deepEqual(handCounts(host2.game), handCounts(host.game))
    assert.deepEqual(handCounts(bob2.game), handCounts(bob.game))
  })

  it('peer ready after host advanced seq is not dropped (intent path)', () => {
    let host = createSession('actor:alice')
    host.hostActor = 'actor:alice'
    host.seats = { 'actor:alice': 0 }
    host.ready = { 'actor:alice': false }
    host.lastSeq = 10 // host already advanced far

    let peer = createSession('actor:bob')
    peer.lastSeq = 10

    // Old broken model: peer would send ready with seq=1 and be dropped.
    // New model: peer sends intent; host assigns seq 11+
    const hr = hostProcessIntent(
      host,
      makeIntent('actor:bob', { kind: 'ready', ready: true }, 'late-bob'),
    )
    assert.equal(hr.ok, true, hr.error)
    host = hr.session
    assert.ok(host.seats['actor:bob'] !== undefined)
    assert.equal(host.ready['actor:bob'], true)
    assert.ok(hr.emit[0]!.seq > 10)

    for (const m of hr.emit) {
      const pr = applyProtocolMessage(peer, m)
      assert.equal(pr.ok, true, pr.error)
      peer = pr.session
    }
    assert.ok(peer.seats['actor:bob'] !== undefined)
    assert.equal(peer.ready['actor:bob'], true)
    assert.equal(peer.lastSeq, host.lastSeq)
  })
})
