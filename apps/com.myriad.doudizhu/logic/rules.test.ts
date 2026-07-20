/**
 * Unit tests for shipped 斗地主 pure rules.
 *
 *   pnpm exec tsx --test src/tapp/examples/doudizhu/rules.test.ts
 */
/* eslint-disable test/no-import-node-test -- node:test; project has no vitest dep */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Card, Rank, Suit } from './rules.ts'
import {
  applyBid,
  applyPlay,
  BOTTOM_SIZE,
  canBeat,
  createDeck,
  deal,
  DECK_SIZE,
  HAND_SIZE,
  identifyCombo,
  PLAYER_COUNT,
  rankValue,
  startDeal,
  totalCardsInState,
} from './rules.ts'

function c(suit: Suit, rank: Rank): Card {
  return { id: `${suit}-${rank}`, suit, rank }
}

function cards(...specs: [Suit, Rank][]): Card[] {
  return specs.map(([s, r]) => c(s, r))
}

describe('deck and deal', () => {
  it('createDeck has 54 unique cards incl. jokers', () => {
    const deck = createDeck()
    assert.equal(deck.length, DECK_SIZE)
    const ids = new Set(deck.map(x => x.id))
    assert.equal(ids.size, DECK_SIZE)
    assert.ok(deck.some(x => x.rank === 'SJ'))
    assert.ok(deck.some(x => x.rank === 'BJ'))
  })

  it('deal yields 17/17/17 + 3 bottom and preserves 54 cards', () => {
    const d = deal(42)
    assert.equal(d.hands[0].length, HAND_SIZE)
    assert.equal(d.hands[1].length, HAND_SIZE)
    assert.equal(d.hands[2].length, HAND_SIZE)
    assert.equal(d.bottom.length, BOTTOM_SIZE)
    const all = [...d.hands[0], ...d.hands[1], ...d.hands[2], ...d.bottom]
    assert.equal(all.length, DECK_SIZE)
    assert.equal(new Set(all.map(x => x.id)).size, DECK_SIZE)
  })

  it('deal is deterministic for the same seed', () => {
    const a = deal(99)
    const b = deal(99)
    assert.deepEqual(
      a.hands[0].map(x => x.id),
      b.hands[0].map(x => x.id),
    )
    assert.deepEqual(
      a.bottom.map(x => x.id),
      b.bottom.map(x => x.id),
    )
  })

  it('startDeal enters auction with all cards accounted for', () => {
    const s = startDeal(7, 1)
    assert.equal(s.phase, 'auction')
    assert.equal(s.turn, 1)
    assert.equal(totalCardsInState(s), DECK_SIZE)
    assert.equal(s.landlord, null)
  })
})

describe('auction', () => {
  it('produces a landlord when someone bids and others pass', () => {
    let s = startDeal(1, 0)
    let r = applyBid(s, { kind: 'bid', seat: 0, score: 1 })
    assert.equal(r.ok, true)
    s = r.state
    r = applyBid(s, { kind: 'pass', seat: 1 })
    assert.equal(r.ok, true)
    s = r.state
    r = applyBid(s, { kind: 'pass', seat: 2 })
    assert.equal(r.ok, true)
    s = r.state
    assert.equal(s.phase, 'playing')
    assert.equal(s.landlord, 0)
    assert.equal(s.hands[0].length, HAND_SIZE + BOTTOM_SIZE)
    assert.equal(s.turn, 0)
  })

  it('bid of 3 ends auction immediately', () => {
    let s = startDeal(2, 0)
    const r = applyBid(s, { kind: 'bid', seat: 0, score: 3 })
    assert.equal(r.ok, true)
    s = r.state
    assert.equal(s.phase, 'playing')
    assert.equal(s.landlord, 0)
    assert.equal(s.bidScore, 3)
  })

  it('all-pass signals redeal', () => {
    let s = startDeal(3, 0)
    let r = applyBid(s, { kind: 'pass', seat: 0 })
    s = r.state
    r = applyBid(s, { kind: 'pass', seat: 1 })
    s = r.state
    r = applyBid(s, { kind: 'pass', seat: 2 })
    assert.equal(r.ok, true)
    assert.equal(r.redeal, true)
    assert.equal(r.state.landlord, null)
  })

  it('rejects bid not higher than current', () => {
    let s = startDeal(4, 0)
    let r = applyBid(s, { kind: 'bid', seat: 0, score: 2 })
    s = r.state
    r = applyBid(s, { kind: 'bid', seat: 1, score: 1 })
    assert.equal(r.ok, false)
  })
})

describe('combinations', () => {
  it('identifies single, pair, triple, bomb, rocket', () => {
    assert.equal(identifyCombo(cards(['S', '3']))!.type, 'single')
    assert.equal(identifyCombo(cards(['S', '5'], ['H', '5']))!.type, 'pair')
    assert.equal(
      identifyCombo(cards(['S', '7'], ['H', '7'], ['D', '7']))!.type,
      'triple',
    )
    assert.equal(
      identifyCombo(cards(['S', '9'], ['H', '9'], ['D', '9'], ['C', '9']))!.type,
      'bomb',
    )
    assert.equal(
      identifyCombo(cards(['J', 'SJ'], ['J', 'BJ']))!.type,
      'rocket',
    )
  })

  it('identifies triple_one, triple_two, straight, pair_seq, airplane', () => {
    assert.equal(
      identifyCombo(cards(['S', '4'], ['H', '4'], ['D', '4'], ['C', '8']))!.type,
      'triple_one',
    )
    assert.equal(
      identifyCombo(
        cards(['S', '6'], ['H', '6'], ['D', '6'], ['C', '9'], ['S', '9']),
      )!.type,
      'triple_two',
    )
    assert.equal(
      identifyCombo(
        cards(['S', '3'], ['H', '4'], ['D', '5'], ['C', '6'], ['S', '7']),
      )!.type,
      'straight',
    )
    assert.equal(
      identifyCombo(
        cards(
          ['S', '3'],
          ['H', '3'],
          ['D', '4'],
          ['C', '4'],
          ['S', '5'],
          ['H', '5'],
        ),
      )!.type,
      'pair_seq',
    )
    assert.equal(
      identifyCombo(
        cards(
          ['S', '3'],
          ['H', '3'],
          ['D', '3'],
          ['C', '4'],
          ['S', '4'],
          ['H', '4'],
        ),
      )!.type,
      'airplane',
    )
  })

  it('rejects illegal straight with 2', () => {
    assert.equal(
      identifyCombo(
        cards(['S', 'J'], ['H', 'Q'], ['D', 'K'], ['C', 'A'], ['S', '2']),
      ),
      null,
    )
  })
})

describe('canBeat', () => {
  it('allows any legal lead', () => {
    const solo = identifyCombo(cards(['S', '3']))!
    assert.equal(canBeat(solo, null), true)
  })

  it('same type higher rank beats', () => {
    const low = identifyCombo(cards(['S', '3']))!
    const high = identifyCombo(cards(['H', 'K']))!
    assert.equal(canBeat(high, low), true)
    assert.equal(canBeat(low, high), false)
  })

  it('bomb beats non-bomb; rocket beats bomb', () => {
    const single = identifyCombo(cards(['S', 'A']))!
    const bomb = identifyCombo(
      cards(['S', '5'], ['H', '5'], ['D', '5'], ['C', '5']),
    )!
    const rocket = identifyCombo(cards(['J', 'SJ'], ['J', 'BJ']))!
    assert.equal(canBeat(bomb, single), true)
    assert.equal(canBeat(single, bomb), false)
    assert.equal(canBeat(rocket, bomb), true)
    assert.equal(canBeat(bomb, rocket), false)
  })

  it('higher bomb beats lower bomb', () => {
    const lowBomb = identifyCombo(
      cards(['S', '3'], ['H', '3'], ['D', '3'], ['C', '3']),
    )!
    const highBomb = identifyCombo(
      cards(['S', 'K'], ['H', 'K'], ['D', 'K'], ['C', 'K']),
    )!
    assert.equal(canBeat(highBomb, lowBomb), true)
  })
})

describe('play / pass / win', () => {
  it('legal beat and illegal play', () => {
    // Build a playing state with known hands
    let s = startDeal(10, 0)
    // Force landlord seat 0 with bid 3
    let r = applyBid(s, { kind: 'bid', seat: 0, score: 3 })
    s = r.state
    assert.equal(s.phase, 'playing')

    // Lead a single from landlord hand
    const leadCard = s.hands[0][0]!
    r = applyPlay(s, { kind: 'play', seat: 0, cards: [leadCard] })
    assert.equal(r.ok, true, r.error)
    s = r.state
    assert.equal(s.turn, 1)
    assert.ok(s.lastCombo)

    // Seat 1 tries illegal empty / wrong combo: play cards not in hand
    const fake = c('S', '3')
    // ensure fake might not be in hand — use a card definitely removed if it was lead
    r = applyPlay(s, {
      kind: 'play',
      seat: 1,
      cards: [leadCard], // already played, not in seat 1
    })
    assert.equal(r.ok, false)

    // Seat 1 passes is legal
    r = applyPlay(s, { kind: 'pass', seat: 1 })
    assert.equal(r.ok, true, r.error)
  })

  it('completed trick after consecutive passes returns free lead to trick winner', () => {
    let s = startDeal(11, 0)
    let r = applyBid(s, { kind: 'bid', seat: 0, score: 3 })
    s = r.state
    const lead = s.hands[0][0]!
    r = applyPlay(s, { kind: 'play', seat: 0, cards: [lead] })
    s = r.state
    r = applyPlay(s, { kind: 'pass', seat: 1 })
    s = r.state
    r = applyPlay(s, { kind: 'pass', seat: 2 })
    assert.equal(r.ok, true, r.error)
    s = r.state
    assert.equal(s.lastCombo, null)
    assert.equal(s.turn, 0) // seat 0 won the trick
    // Now leading: cannot pass
    r = applyPlay(s, { kind: 'pass', seat: 0 })
    assert.equal(r.ok, false)
  })

  it('win detection when one hand empties', () => {
    let s = startDeal(12, 0)
    let r = applyBid(s, { kind: 'bid', seat: 0, score: 3 })
    s = r.state
    // Force seat 0 to a single card for a quick win
    const last = s.hands[0][0]!
    s = {
      ...s,
      hands: [[last], s.hands[1], s.hands[2]],
    }
    r = applyPlay(s, { kind: 'play', seat: 0, cards: [last] })
    assert.equal(r.ok, true, r.error)
    assert.equal(r.state.phase, 'finished')
    assert.equal(r.state.winner, 0)
    assert.equal(r.state.winningSide, 'landlord')
    assert.equal(r.state.hands[0].length, 0)
  })

  it('farmer win when non-landlord empties first', () => {
    let s = startDeal(13, 0)
    let r = applyBid(s, { kind: 'bid', seat: 0, score: 3 })
    s = r.state
    // Landlord leads a low card, farmer responds and we force farmer to 1 card then empty
    const lead = s.hands[0].find(x => rankValue(x.rank) <= 10) || s.hands[0][0]!
    r = applyPlay(s, { kind: 'play', seat: 0, cards: [lead] })
    s = r.state
    // Give seat 1 one card that can beat lead
    const beater: Card = {
      id: 'X-win',
      suit: 'S',
      rank: '2',
    }
    // rank 2 always beats non-bomb singles that aren't 2/joker — if lead is 2, use joker
    const winCard
      = rankValue(lead.rank) < 15
        ? beater
        : c('J', 'BJ')
    s = {
      ...s,
      hands: [s.hands[0], [winCard], s.hands[2]],
    }
    r = applyPlay(s, { kind: 'play', seat: 1, cards: [winCard] })
    assert.equal(r.ok, true, r.error)
    assert.equal(r.state.phase, 'finished')
    assert.equal(r.state.winner, 1)
    assert.equal(r.state.winningSide, 'farmers')
  })
})

describe('constants', () => {
  it('player count is 3', () => {
    assert.equal(PLAYER_COUNT, 3)
  })
})
