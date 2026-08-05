/** KV helpers: rate limit, top, tracked, counter mirror. Atomic +1 via Durable Object. */

import {
  COUNTER_KEY_PREFIX,
  DEDUPE_KEY_PREFIX,
  META_TOP_INDEX,
  META_TRACKED_APPS,
  RATE_KEY_PREFIX,
  RATE_TTL_SEC,
  TOP_INDEX_CAP,
  TRACKED_APPS_CAP,
  type AppCounters,
  type Env,
} from './types.ts'
import {
  addTrackedApp,
  mergeTopEntry,
  parseTopList,
  parseTrackedApps,
  rebuildTopFromCounters,
  shouldUpdateTopIndex,
  type TopEntry,
} from './top.ts'

export function counterKey(appId: string): string {
  return `${COUNTER_KEY_PREFIX}${appId}`
}

export function dedupeKey(idempotencyKey: string): string {
  return `${DEDUPE_KEY_PREFIX}${idempotencyKey}`
}

export function rateKey(ipHash: string, minuteBucket: number): string {
  return `${RATE_KEY_PREFIX}${ipHash}:${minuteBucket}`
}

export function emptyCounters(): AppCounters {
  return { installs: 0, updates: 0 }
}

export function parseCounters(raw: string | null): AppCounters {
  if (!raw) return emptyCounters()
  try {
    const o = JSON.parse(raw) as Partial<AppCounters>
    return {
      installs: Math.max(0, Math.floor(Number(o.installs) || 0)),
      updates: Math.max(0, Math.floor(Number(o.updates) || 0)),
    }
  } catch {
    return emptyCounters()
  }
}

function statsKv(env: Env): KVNamespace {
  if (!env.STATS) {
    throw new Error('STATS KV binding missing')
  }
  return env.STATS
}

/** Fast path: KV mirror (written after every successful DO increment). */
export async function getCounters(
  env: Env,
  appId: string,
): Promise<AppCounters> {
  const raw = await statsKv(env).get(counterKey(appId))
  const fromKv = parseCounters(raw)
  if (fromKv.installs > 0 || fromKv.updates > 0 || raw !== null) {
    return fromKv
  }
  // Cold / pre-DO migration: try Durable Object as source of truth.
  if (env.APP_COUNTER) {
    try {
      const id = env.APP_COUNTER.idFromName(appId)
      const stub = env.APP_COUNTER.get(id)
      const res = await stub.fetch('https://do/counters', { method: 'GET' })
      if (res.ok) {
        const c = (await res.json()) as AppCounters
        return {
          installs: Math.max(0, Math.floor(c.installs || 0)),
          updates: Math.max(0, Math.floor(c.updates || 0)),
        }
      }
    } catch {
      // fall through
    }
  }
  return emptyCounters()
}

export async function getCountersBatch(
  env: Env,
  appIds: string[],
): Promise<Record<string, AppCounters>> {
  const out: Record<string, AppCounters> = {}
  await Promise.all(
    appIds.map(async (id) => {
      out[id] = await getCounters(env, id)
    }),
  )
  return out
}

/**
 * Atomic increment via per-app Durable Object, then mirror to KV for batch reads.
 */
export async function incrementIfNew(
  env: Env,
  appId: string,
  event: 'install' | 'update',
  idempotencyKey: string,
): Promise<{ counted: boolean; counters: AppCounters }> {
  if (!env.APP_COUNTER) {
    // Fallback pure KV (dev without DO) — same as v1.2 semantics.
    return incrementKvOnly(env, appId, event, idempotencyKey)
  }

  // Seed DO from KV mirror so pre-DO history is preserved on first atomic hit.
  const seedRaw = await statsKv(env).get(counterKey(appId))
  const seed = parseCounters(seedRaw)

  const id = env.APP_COUNTER.idFromName(appId)
  const stub = env.APP_COUNTER.get(id)
  const res = await stub.fetch('https://do/increment', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      event,
      idempotency_key: idempotencyKey,
      seed:
        seed.installs > 0 || seed.updates > 0
          ? { installs: seed.installs, updates: seed.updates }
          : undefined,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`AppCounter DO failed: ${res.status} ${text}`)
  }
  const data = (await res.json()) as {
    counted: boolean
    counters: AppCounters
  }
  const counters = {
    installs: Math.max(0, Math.floor(data.counters?.installs || 0)),
    updates: Math.max(0, Math.floor(data.counters?.updates || 0)),
  }

  // Mirror for cheap multi-get / top rebuild.
  await statsKv(env).put(counterKey(appId), JSON.stringify(counters))
  // Keep KV dedupe in sync for any legacy readers / fallback path.
  await statsKv(env).put(dedupeKey(idempotencyKey), `${appId}:${event}`, {
    expirationTtl: 48 * 60 * 60,
  })

  if (data.counted) {
    await trackApp(env, appId)
    if (event === 'install') {
      await touchTopIndexConditional(env, appId, counters.installs)
    }
  }

  return { counted: Boolean(data.counted), counters }
}

/** Legacy KV path when DO binding is missing. */
async function incrementKvOnly(
  env: Env,
  appId: string,
  event: 'install' | 'update',
  idempotencyKey: string,
): Promise<{ counted: boolean; counters: AppCounters }> {
  const kv = statsKv(env)
  const dKey = dedupeKey(idempotencyKey)
  const existing = await kv.get(dKey)
  if (existing !== null) {
    return { counted: false, counters: await getCounters(env, appId) }
  }
  await kv.put(dKey, `${appId}:${event}`, { expirationTtl: 48 * 60 * 60 })
  const current = await getCounters(env, appId)
  const counters: AppCounters = {
    installs: current.installs + (event === 'install' ? 1 : 0),
    updates: current.updates + (event === 'update' ? 1 : 0),
  }
  await kv.put(counterKey(appId), JSON.stringify(counters))
  await trackApp(env, appId)
  if (event === 'install') {
    await touchTopIndexConditional(env, appId, counters.installs)
  }
  return { counted: true, counters }
}

/**
 * Cross-edge rate limit — always uses KV (accurate under multi-colo).
 * Memory only for instant local reject after local overage.
 */
export async function checkRateLimit(
  env: Env,
  ip: string,
  limitPerMin: number,
): Promise<boolean> {
  if (limitPerMin <= 0) return true
  const minuteBucket = Math.floor(Date.now() / 60_000)
  const ipHash = (await sha256Hex(ip)).slice(0, 16)
  const key = rateKey(ipHash, minuteBucket)
  const kv = statsKv(env)
  const raw = await kv.get(key)
  const count = raw ? Number.parseInt(raw, 10) || 0 : 0
  if (count >= limitPerMin) return false
  await kv.put(key, String(count + 1), { expirationTtl: RATE_TTL_SEC })
  return true
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function trackApp(env: Env, appId: string): Promise<void> {
  const kv = statsKv(env)
  const raw = await kv.get(META_TRACKED_APPS)
  const existing = parseTrackedApps(raw)
  if (existing.includes(appId)) return
  const next = addTrackedApp(existing, appId, TRACKED_APPS_CAP)
  await kv.put(META_TRACKED_APPS, JSON.stringify(next))
}

async function touchTopIndexConditional(
  env: Env,
  appId: string,
  installs: number,
): Promise<void> {
  const kv = statsKv(env)
  const list = parseTopList(await kv.get(META_TOP_INDEX))
  if (!shouldUpdateTopIndex(list, appId, installs, TOP_INDEX_CAP)) {
    return
  }
  const merged = mergeTopEntry(list, appId, installs, TOP_INDEX_CAP)
  await kv.put(META_TOP_INDEX, JSON.stringify(merged))
}

export async function forceTouchTopIndex(
  env: Env,
  appId: string,
  installs: number,
): Promise<void> {
  const kv = statsKv(env)
  const list = parseTopList(await kv.get(META_TOP_INDEX))
  const merged = mergeTopEntry(list, appId, installs, TOP_INDEX_CAP)
  await kv.put(META_TOP_INDEX, JSON.stringify(merged))
}

export async function readTopIndex(
  env: Env,
  limit: number,
): Promise<TopEntry[]> {
  const list = parseTopList(await statsKv(env).get(META_TOP_INDEX))
  return list.slice(0, limit)
}

export async function rebuildTopIndex(
  env: Env,
  cap: number = TOP_INDEX_CAP,
): Promise<TopEntry[]> {
  const kv = statsKv(env)
  const tracked = parseTrackedApps(await kv.get(META_TRACKED_APPS))
  if (tracked.length === 0) {
    return parseTopList(await kv.get(META_TOP_INDEX)).slice(0, cap)
  }
  const live = await getCountersBatch(env, tracked)
  const pairs = tracked.map((id) => ({
    id,
    installs: live[id]?.installs ?? 0,
  }))
  const top = rebuildTopFromCounters(pairs, cap)
  await kv.put(META_TOP_INDEX, JSON.stringify(top))
  return top
}

export async function ensureTopIndex(
  env: Env,
  limit: number,
): Promise<TopEntry[]> {
  const top = await readTopIndex(env, limit)
  if (top.length > 0) return top
  const rebuilt = await rebuildTopIndex(env, TOP_INDEX_CAP)
  return rebuilt.slice(0, limit)
}

export async function seedTrackedFromApp(
  env: Env,
  appId: string,
): Promise<AppCounters> {
  const counters = await getCounters(env, appId)
  if (counters.installs > 0 || counters.updates > 0) {
    await trackApp(env, appId)
    if (counters.installs > 0) {
      await forceTouchTopIndex(env, appId, counters.installs)
    }
  }
  return counters
}

export function clientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    '0.0.0.0'
  )
}

export async function kvPing(env: Env): Promise<boolean> {
  if (!env.STATS) return false
  try {
    await env.STATS.get('meta:v1:ping')
    return true
  } catch {
    return false
  }
}

export async function trackedCount(env: Env): Promise<number> {
  if (!env.STATS) return 0
  return parseTrackedApps(await env.STATS.get(META_TRACKED_APPS)).length
}
