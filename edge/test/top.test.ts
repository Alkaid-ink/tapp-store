import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  addTrackedApp,
  mergeTopEntry,
  parseTopList,
  rebuildTopFromCounters,
  shouldUpdateTopIndex,
} from '../src/top.ts'

describe('mergeTopEntry', () => {
  it('inserts and ranks by installs', () => {
    const list = mergeTopEntry([], 'com.a.b', 3, 10)
    const next = mergeTopEntry(list, 'com.c.d', 10, 10)
    assert.equal(next[0].id, 'com.c.d')
    assert.equal(next[1].id, 'com.a.b')
  })

  it('updates existing app installs', () => {
    let list = mergeTopEntry([], 'com.a.b', 1, 10)
    list = mergeTopEntry(list, 'com.a.b', 50, 10)
    assert.equal(list.length, 1)
    assert.equal(list[0].installs, 50)
  })

  it('caps length', () => {
    let list = [] as ReturnType<typeof mergeTopEntry>
    for (let i = 0; i < 5; i++) {
      list = mergeTopEntry(list, `com.app.n${i}`, i + 1, 3)
    }
    assert.equal(list.length, 3)
    assert.equal(list[0].installs, 5)
  })
})

describe('parseTopList', () => {
  it('filters junk', () => {
    const raw = JSON.stringify([
      { id: 'com.a.b', installs: 2 },
      { id: 'x', installs: 0 },
      null,
      { id: 'com.c.d', installs: -1 },
    ])
    const list = parseTopList(raw)
    assert.deepEqual(list, [{ id: 'com.a.b', installs: 2 }])
  })
})

describe('shouldUpdateTopIndex', () => {
  it('writes for free slots and board members only when needed', () => {
    const board = [
      { id: 'com.a', installs: 10 },
      { id: 'com.b', installs: 5 },
    ]
    assert.equal(shouldUpdateTopIndex(board, 'com.c', 3, 5), true) // free slot
    assert.equal(shouldUpdateTopIndex(board, 'com.c', 3, 2), false) // below tail
    assert.equal(shouldUpdateTopIndex(board, 'com.c', 6, 2), true) // beats tail
    assert.equal(shouldUpdateTopIndex(board, 'com.a', 11, 2), true) // on board
  })
})

describe('tracked + rebuild', () => {
  it('addTrackedApp is idempotent', () => {
    const a = addTrackedApp([], 'com.a.b', 10)
    const b = addTrackedApp(a, 'com.a.b', 10)
    assert.equal(b, a)
    assert.deepEqual(a, ['com.a.b'])
  })

  it('rebuildTopFromCounters sorts and caps', () => {
    const top = rebuildTopFromCounters(
      [
        { id: 'com.low', installs: 1 },
        { id: 'com.high', installs: 9 },
        { id: 'com.zero', installs: 0 },
      ],
      10,
    )
    assert.deepEqual(
      top.map((t) => t.id),
      ['com.high', 'com.low'],
    )
  })
})
