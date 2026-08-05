import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { instanceDayIdempotencyKey } from '../src/instance.ts'

describe('instanceDayIdempotencyKey', () => {
  it('is stable for same instance/app/event on same day', async () => {
    const a = await instanceDayIdempotencyKey('abc123def456', 'com.a.b', 'install')
    const b = await instanceDayIdempotencyKey('abc123def456', 'com.a.b', 'install')
    assert.equal(a, b)
    assert.ok(a.length >= 8 && a.length <= 128)
  })

  it('differs across instances and apps', async () => {
    const a = await instanceDayIdempotencyKey('inst1', 'com.a.b', 'install')
    const b = await instanceDayIdempotencyKey('inst2', 'com.a.b', 'install')
    const c = await instanceDayIdempotencyKey('inst1', 'com.c.d', 'install')
    assert.notEqual(a, b)
    assert.notEqual(a, c)
  })
})
