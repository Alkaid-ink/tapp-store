/**
 * tapp-store-stats — Cloudflare Worker v1.3.2
 *
 * Routes:
 *   GET  /health
 *   GET  /v1/stats?apps=a,b | ?app=id | ?top=N
 *   POST /v1/hit          (myriad-backend + HMAC by default)
 *   POST /v1/admin/*      (Bearer ADMIN_TOKEN)
 *   OPTIONS *
 */

import { handleAdmin } from './admin.ts'
import { catalogSize, refreshCatalogIds } from './catalog.ts'
import { preflight, withCors } from './cors.ts'
import { handleHit } from './hit.ts'
import { kvPing, trackedCount } from './kv.ts'
import { handleStats } from './stats.ts'
import { SERVICE_VERSION, type Env, type ErrorBody } from './types.ts'
import { parseBool } from './validate.ts'

export { AppCounter } from './app-counter.ts'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const response = await route(request, env)
      return withCors(request, response)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'internal error'
      const body: ErrorBody = { ok: false, error: message, code: 'internal' }
      return withCors(
        request,
        new Response(JSON.stringify(body), {
          status: 500,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
          },
        }),
      )
    }
  },

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(
      refreshCatalogIds(env).then(() => undefined).catch(() => undefined),
    )
  },
}

function requireStats(env: Env): Response | null {
  if (env.STATS) return null
  const body: ErrorBody = {
    ok: false,
    error: 'STATS KV binding missing',
    code: 'kv_not_configured',
  }
  return new Response(JSON.stringify(body), {
    status: 503,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

async function route(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return preflight(request)
  }

  const url = new URL(request.url)
  const path = url.pathname.replace(/\/+$/, '') || '/'

  if (path === '/health' || path === '/') {
    const kv = await kvPing(env)
    let tracked = 0
    let catalog: number | null = null
    if (kv) {
      tracked = await trackedCount(env)
      catalog = await catalogSize(env)
    }
    return new Response(
      JSON.stringify({
        ok: true,
        service: 'tapp-store-stats',
        version: SERVICE_VERSION,
        kv,
        durable_objects: Boolean(env.APP_COUNTER),
        tracked_apps: tracked,
        catalog_size: catalog,
        hmac_required_for_backend: Boolean(env.INGEST_HMAC_SECRET?.trim()),
        require_hmac: parseBool(env.REQUIRE_HMAC, false),
        allow_anonymous_hits: parseBool(env.ALLOW_ANONYMOUS_HITS, false),
        admin_enabled: Boolean(
          env.ADMIN_TOKEN && env.ADMIN_TOKEN.trim().length >= 16,
        ),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      },
    )
  }

  if (path === '/v1/hit') {
    const missing = requireStats(env)
    if (missing) return missing
    return handleHit(request, env)
  }

  if (path === '/v1/stats') {
    const missing = requireStats(env)
    if (missing) return missing
    return handleStats(request, env)
  }

  if (path.startsWith('/v1/admin/')) {
    const missing = requireStats(env)
    if (missing) return missing
    return handleAdmin(request, env, path)
  }

  return new Response(
    JSON.stringify({
      ok: false,
      error: 'not found',
      code: 'not_found',
    } satisfies ErrorBody),
    {
      status: 404,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    },
  )
}
