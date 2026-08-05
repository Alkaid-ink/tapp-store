/** KV counter / dedupe / rate / top / tracked-app helpers. */

import {
  COUNTER_KEY_PREFIX,
  DEDUPE_KEY_PREFIX,
  DEDUPE_TTL_SEC,
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

export async function getCounters(
  env: Env,
  appId: string,
): Promise<AppCounters> {
  const raw = await statsKv(env).get(counterKey(appId))
  return parseCounters(raw)
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
 * Increment counters if idempotency key is new.
 * Dedupe is claimed first so retries of the same install never double-count.
 * Concurrent *different* installs on the same app may rarely lose one under
 * pure KV RMW (eventual); acceptable for store popularity, not billing.
 */
export async function incrementIfNew(
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

  // Claim idempotency first (value records app+event for forensics).
  await kv.put(dKey, `${appId}:${event}`, { expirationTtl: DEDUPE_TTL_SEC })

  const current = await getCounters(env, appId)
  const counters: AppCounters = {
    installs: current.installs + (event === 'install' ? 1 : 0),
    updates: current.updates + (event === 'update' ? 1 : 0),
  }
  await kv.put(counterKey(appId), JSON.stringify(counters))

  await trackApp(env, appId)
  // downloads leaderboard is install-only
  if (event === 'install') {
    await touchTopIndex(env, appId, counters.installs)
  }

  return { counted: true, counters }
}

/** Soft IP rate limit. Returns false when over limit. */
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

async function touchTopIndex(
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

/**
 * Rebuild top index from tracked app counters.
 * Used when top is empty (legacy hits) or admin repair.
 */
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

/** Ensure top index is usable when legacy counters exist without top writes. */
export async function ensureTopIndex(
  env: Env,
  limit: number,
): Promise<TopEntry[]> {
  let top = await readTopIndex(env, limit)
  if (top.length > 0) return top

  // Seed tracked from any existing counter keys we know via a synthetic path:
  // if tracked is empty but music-player etc. have counters, top stays empty
  // until next hit. Admin rebuild + track on hit fixes forward.
  // Also try rebuild from tracked (may still be empty for pre-1.1 hits).
  const rebuilt = await rebuildTopIndex(env, TOP_INDEX_CAP)
  if (rebuilt.length > 0) return rebuilt.slice(0, limit)

  return top
}

/**
 * One-shot seed: ensure app is tracked and top reflects its live counters.
 * Called from admin repair or when?top=auto-heals a known empty index with
 * a single explicit app list is not available — keep for admin.
 */
export async function seedTrackedFromApp(
  env: Env,
  appId: string,
): Promise<AppCounters> {
  const counters = await getCounters(env, appId)
  if (counters.installs > 0 || counters.updates > 0) {
    await trackApp(env, appId)
    if (counters.installs > 0) {
      await touchTopIndex(env, appId, counters.installs)
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
