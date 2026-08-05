/**
 * tapp-store-stats — Cloudflare Worker v1.1
 *
 * Routes:
 *   GET  /health
 *   GET  /v1/stats?apps=a,b | ?app=id | ?top=N[&seed=app_id][&omit_zero=1]
 *   POST /v1/hit
 *   POST /v1/admin/rebuild-top   (Bearer ADMIN_TOKEN)
 *   POST /v1/admin/refresh-catalog
 *   OPTIONS *
 */

import { handleAdmin } from './admin.ts'
import { catalogSize, refreshCatalogIds } from './catalog.ts'
import { preflight, withCors } from './cors.ts'
import { handleHit } from './hit.ts'
import { kvPing, trackedCount } from './kv.ts'
import { handleStats } from './stats.ts'
import { SERVICE_VERSION, type Env, type ErrorBody } from './types.ts'

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

  /** Refresh official catalog allowlist every 6 hours. */
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
    error:
      'STATS KV binding missing — add binding STATS in CF Worker settings (or wrangler.toml [[kv_namespaces]])',
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
        tracked_apps: tracked,
        catalog_size: catalog,
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
