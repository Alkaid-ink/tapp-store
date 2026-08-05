/** GET /v1/stats handler — batch / single / top (10k-safe, no full dump). */

import {
  ensureTopIndex,
  getCountersBatch,
  seedTrackedFromApp,
} from './kv.ts'
import type { Env, ErrorBody, StatsAppEntry, StatsResponse } from './types.ts'
import { parseAppIdList, parsePositiveInt } from './validate.ts'

export async function handleStats(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonError(405, 'method not allowed', 'method_not_allowed')
  }

  const url = new URL(request.url)
  const maxBatch = parsePositiveInt(env.STATS_MAX_BATCH, 100, 200)
  const topMax = parsePositiveInt(env.STATS_TOP_MAX, 100, 200)
  const omitZero = url.searchParams.get('omit_zero') === '1'

  // Leaderboard: maintained top index; auto-heal if empty.
  const topParam = url.searchParams.get('top')
  if (topParam !== null) {
    const n = Math.min(
      topMax,
      Math.max(1, Number.parseInt(topParam, 10) || 20),
    )
    let top = await ensureTopIndex(env, n)

    // One-shot heal for early production hits that never wrote top/tracked.
    if (top.length === 0) {
      const seedId = url.searchParams.get('seed')
      if (seedId) {
        await seedTrackedFromApp(env, seedId)
        top = await ensureTopIndex(env, n)
      }
    }

    const ids = top.map((e) => e.id)
    const live = await getCountersBatch(env, ids)
    const apps: Record<string, StatsAppEntry> = {}
    const ranked: Array<{ id: string } & StatsAppEntry> = []
    for (const id of ids) {
      const c = live[id] ?? { installs: 0, updates: 0 }
      if (omitZero && c.installs <= 0 && c.updates <= 0) continue
      const entry = toEntry(c.installs, c.updates)
      apps[id] = entry
      ranked.push({ id, ...entry })
    }
    // Re-sort by live installs (top index may lag slightly)
    ranked.sort(
      (a, b) => b.installs - a.installs || a.id.localeCompare(b.id),
    )
    return jsonStats(apps, ranked)
  }

  // Explicit app list (UI overlay path).
  const single = url.searchParams.get('app')
  const appsParam = url.searchParams.get('apps')
  if (single || appsParam || url.searchParams.getAll('app').length > 0) {
    const parsed = parseAppIdList(url.searchParams, maxBatch)
    if (!parsed.ok) {
      return jsonError(400, parsed.error, parsed.code)
    }
    const live = await getCountersBatch(env, parsed.ids)
    const apps: Record<string, StatsAppEntry> = {}
    // Lazy heal: counters written before tracked/top existed get re-indexed.
    const heal: Promise<unknown>[] = []
    for (const id of parsed.ids) {
      const c = live[id] ?? { installs: 0, updates: 0 }
      if (c.installs > 0 || c.updates > 0) {
        heal.push(seedTrackedFromApp(env, id))
      }
      if (omitZero && c.installs <= 0 && c.updates <= 0) continue
      apps[id] = toEntry(c.installs, c.updates)
    }
    if (heal.length > 0) {
      await Promise.all(heal)
    }
    return jsonStats(apps)
  }

  return jsonError(
    400,
    'provide apps=id1,id2, app=id, or top=N (full dump disabled for scale)',
    'query_required',
  )
}

function toEntry(installs: number, updates: number): StatsAppEntry {
  return { installs, updates, downloads: installs }
}

function jsonStats(
  apps: Record<string, StatsAppEntry>,
  ranked?: Array<{ id: string } & StatsAppEntry>,
): Response {
  const body: StatsResponse = {
    updated_at: new Date().toISOString(),
    apps,
  }
  if (ranked) body.ranked = ranked
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=30',
    },
  })
}

function jsonError(status: number, error: string, code: string): Response {
  const body: ErrorBody = { ok: false, error, code }
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
