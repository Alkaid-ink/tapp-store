/** Shared types for tapp-store-stats edge worker. */

export type HitEvent = 'install' | 'update'

export type HitClient = 'myriad-backend' | 'myriad-browser' | 'other'

export interface Env {
  /** Required for hit/stats; optional until bound. */
  STATS?: KVNamespace
  /** Per-app atomic counters (Durable Object). */
  APP_COUNTER?: DurableObjectNamespace
  CATALOG_URL: string
  ALLOW_UNKNOWN_APPS: string
  HIT_RATE_LIMIT_PER_MIN: string
  /** Anonymous browser/other clients (default 20). Only if ALLOW_ANONYMOUS_HITS. */
  BROWSER_HIT_RATE_LIMIT_PER_MIN: string
  /** When false (default), only client=myriad-backend is accepted. */
  ALLOW_ANONYMOUS_HITS: string
  /** When true, refuse to serve hits if INGEST_HMAC_SECRET is unset. */
  REQUIRE_HMAC: string
  STATS_MAX_BATCH: string
  STATS_TOP_MAX: string
  CATALOG_IDS_TTL_SEC: string
  /** Bearer for admin repair endpoints (secret). Empty = admin routes 404. */
  ADMIN_TOKEN?: string
  /**
   * HMAC secret (secret). When set, `client=myriad-backend` hits must send
   * `X-Stats-Signature: sha256=<hex>`.
   */
  INGEST_HMAC_SECRET?: string
}

export interface AppCounters {
  installs: number
  updates: number
}

export interface HitRequestBody {
  app_id: string
  version?: string
  event: HitEvent
  source?: string
  idempotency_key: string
  client?: HitClient | string
  myriad_version?: string
  instance_hash?: string
}

export interface HitResponse {
  ok: true
  counted: boolean
  downloads: number
  installs: number
  updates: number
}

export interface StatsAppEntry {
  installs: number
  updates: number
  /** Alias of installs — matches index.json field name. */
  downloads: number
}

export interface StatsResponse {
  updated_at: string
  apps: Record<string, StatsAppEntry>
  /** Present for `?top=` — stable rank order (object key order alone is not enough for all clients). */
  ranked?: Array<{ id: string } & StatsAppEntry>
}

export interface ErrorBody {
  ok: false
  error: string
  code?: string
}

export const SERVICE_VERSION = '1.3.1'
export const COUNTER_KEY_PREFIX = 'c:v1:'
export const DEDUPE_KEY_PREFIX = 'd:v1:'
export const RATE_KEY_PREFIX = 'rl:v1:'
export const META_CATALOG_IDS = 'meta:v1:catalog_ids'
export const META_CATALOG_TS = 'meta:v1:catalog_ids_ts'
export const META_TOP_INDEX = 'meta:v1:top_installs'
/** Set of app ids that have ever received a counted hit (for top rebuild). */
export const META_TRACKED_APPS = 'meta:v1:tracked_apps'
export const DEDUPE_TTL_SEC = 48 * 60 * 60
export const RATE_TTL_SEC = 70
export const TOP_INDEX_CAP = 200
export const TRACKED_APPS_CAP = 50_000
