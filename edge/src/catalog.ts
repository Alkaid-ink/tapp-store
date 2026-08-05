/** Official catalog allowlist — memory + KV cache for ~10k app ids. */

import {
  META_CATALOG_IDS,
  META_CATALOG_TS,
  type Env,
} from './types.ts'
import { parsePositiveInt } from './validate.ts'

interface MemoryCache {
  ids: Set<string>
  loadedAt: number
  ttlMs: number
}

/** Per-isolate memory cache — avoids KV/GitHub on every hit. */
let memory: MemoryCache | null = null

export function clearCatalogMemoryCache(): void {
  memory = null
}

export async function isAppAllowed(
  env: Env,
  appId: string,
  allowUnknown: boolean,
): Promise<boolean> {
  if (allowUnknown) return true
  const ids = await getCatalogIds(env)
  // Never successfully cached: fail open so catalog outage does not block installs.
  if (ids === null) return true
  return ids.has(appId)
}

/**
 * Returns Set of allowed app ids, or null if no list is available yet.
 */
export async function getCatalogIds(env: Env): Promise<Set<string> | null> {
  const ttlSec = parsePositiveInt(env.CATALOG_IDS_TTL_SEC, 600)
  const ttlMs = ttlSec * 1000
  const now = Date.now()

  if (memory && now - memory.loadedAt < memory.ttlMs) {
    return memory.ids
  }

  if (!env.STATS) return null

  const tsRaw = await env.STATS.get(META_CATALOG_TS)
  const ts = tsRaw ? Number.parseInt(tsRaw, 10) : 0
  const ageMs = now - (Number.isFinite(ts) ? ts : 0)
  const cached = await env.STATS.get(META_CATALOG_IDS)

  if (cached && ageMs < ttlMs) {
    const set = parseIdSet(cached)
    memory = { ids: set, loadedAt: now, ttlMs }
    return set
  }

  const fresh = await refreshCatalogIds(env)
  if (fresh) {
    memory = { ids: fresh, loadedAt: now, ttlMs }
    return fresh
  }
  if (cached) {
    const set = parseIdSet(cached)
    // Stale but usable
    memory = { ids: set, loadedAt: now, ttlMs: Math.min(ttlMs, 60_000) }
    return set
  }
  return null
}

export async function refreshCatalogIds(
  env: Env,
): Promise<Set<string> | null> {
  const url = env.CATALOG_URL?.trim()
  if (!url || !env.STATS) return null
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'tapp-store-stats/1.1',
      },
      cf: { cacheTtl: 300, cacheEverything: true },
    } as RequestInit)
    if (!res.ok) return null
    const data = (await res.json()) as { apps?: Array<{ id?: string }> }
    const ids = new Set<string>()
    if (Array.isArray(data.apps)) {
      for (const app of data.apps) {
        if (app && typeof app.id === 'string' && app.id.trim()) {
          ids.add(app.id.trim())
        }
      }
    }
    if (ids.size > 50_000) return null
    const arr = [...ids]
    await env.STATS.put(META_CATALOG_IDS, JSON.stringify(arr))
    await env.STATS.put(META_CATALOG_TS, String(Date.now()))
    memory = {
      ids,
      loadedAt: Date.now(),
      ttlMs: parsePositiveInt(env.CATALOG_IDS_TTL_SEC, 600) * 1000,
    }
    return ids
  } catch {
    return null
  }
}

export async function catalogSize(env: Env): Promise<number | null> {
  const ids = await getCatalogIds(env)
  return ids ? ids.size : null
}

function parseIdSet(raw: string): Set<string> {
  try {
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return new Set()
    return new Set(
      arr.filter((x): x is string => typeof x === 'string' && x.length > 0),
    )
  } catch {
    return new Set()
  }
}
