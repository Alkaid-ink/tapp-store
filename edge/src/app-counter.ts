/**
 * Per-app Durable Object — atomic install/update counters + local idempotency.
 * Serializes concurrent hits for the same app_id so counts never lose +1.
 */

import type { AppCounters } from './types.ts'

const DEDUPE_TTL_MS = 48 * 60 * 60 * 1000

interface CounterState {
  installs: number
  updates: number
}

interface DedupeEntry {
  at: number
  event: string
}

export class AppCounter {
  private state: DurableObjectState

  constructor(state: DurableObjectState) {
    this.state = state
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (request.method === 'GET' && url.pathname === '/counters') {
      const c = await this.loadCounters()
      return Response.json(c)
    }

    if (request.method !== 'POST' || url.pathname !== '/increment') {
      return Response.json({ error: 'not found' }, { status: 404 })
    }

    let body: {
      event?: string
      idempotency_key?: string
      /** KV mirror seed when DO is empty (migration from pre-DO counters). */
      seed?: { installs?: number; updates?: number }
    }
    try {
      body = (await request.json()) as typeof body
    } catch {
      return Response.json({ error: 'invalid json' }, { status: 400 })
    }

    const event = body.event === 'update' ? 'update' : 'install'
    const key = (body.idempotency_key || '').trim()
    if (key.length < 8 || key.length > 128) {
      return Response.json({ error: 'invalid idempotency_key' }, { status: 400 })
    }

    // Single-threaded per DO instance — no lost updates under concurrency.
    const dedupeKey = `d:${key}`
    const existing = await this.state.storage.get<DedupeEntry>(dedupeKey)
    const now = Date.now()
    if (existing && now - existing.at < DEDUPE_TTL_MS) {
      const counters = await this.loadCounters()
      return Response.json({ counted: false, counters })
    }

    const counters = await this.loadCounters()
    // First-time DO for this app: adopt KV seed so history is not reset.
    if (
      counters.installs === 0 &&
      counters.updates === 0 &&
      body.seed &&
      ((body.seed.installs || 0) > 0 || (body.seed.updates || 0) > 0)
    ) {
      counters.installs = Math.max(0, Math.floor(body.seed.installs || 0))
      counters.updates = Math.max(0, Math.floor(body.seed.updates || 0))
    }
    if (event === 'install') counters.installs += 1
    else counters.updates += 1

    await this.state.storage.put('c', counters as CounterState)
    await this.state.storage.put(dedupeKey, {
      at: now,
      event,
    } satisfies DedupeEntry)

    // Opportunistic prune of very old dedupe keys (bounded list).
    await this.pruneDedupe(now)

    return Response.json({ counted: true, counters })
  }

  private async loadCounters(): Promise<AppCounters> {
    const c = await this.state.storage.get<CounterState>('c')
    return {
      installs: Math.max(0, Math.floor(c?.installs || 0)),
      updates: Math.max(0, Math.floor(c?.updates || 0)),
    }
  }

  private async pruneDedupe(now: number): Promise<void> {
    try {
      const list = await this.state.storage.list<DedupeEntry>({
        prefix: 'd:',
        limit: 50,
      })
      const toDelete: string[] = []
      for (const [k, v] of list) {
        if (!v || now - v.at >= DEDUPE_TTL_MS) toDelete.push(k)
      }
      if (toDelete.length > 0) {
        await this.state.storage.delete(toDelete)
      }
    } catch {
      // non-fatal
    }
  }
}
