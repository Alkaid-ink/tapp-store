import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { emptyCounters, parseCounters } from '../src/kv.ts'

describe('parseCounters', () => {
  it('parses valid counters', () => {
    assert.deepEqual(parseCounters('{"installs":3,"updates":1}'), {
      installs: 3,
      updates: 1,
    })
  })

  it('floors and clamps negatives', () => {
    assert.deepEqual(parseCounters('{"installs":-2,"updates":1.9}'), {
      installs: 0,
      updates: 1,
    })
  })

  it('handles null and junk', () => {
    assert.deepEqual(parseCounters(null), emptyCounters())
    assert.deepEqual(parseCounters('not-json'), emptyCounters())
  })
})
