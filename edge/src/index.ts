/**
 * tapp-store-stats — Cloudflare Worker
 *
 * Routes:
 *   GET  /health
 *   GET  /v1/stats?apps=a,b | ?app=id | ?top=N
 *   POST /v1/hit
 *   OPTIONS *  (CORS preflight)
 */

import { preflight, withCors } from './cors.ts'
import { handleHit } from './hit.ts'
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
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }),
      )
    }
  },
}

/** hit/stats need KV; /health works without it so first deploy can succeed. */
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
    return new Response(
      JSON.stringify({
        ok: true,
        service: 'tapp-store-stats',
        version: SERVICE_VERSION,
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

  return new Response(
    JSON.stringify({
      ok: false,
      error: 'not found',
      code: 'not_found',
    } satisfies ErrorBody),
    {
      status: 404,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    },
  )
}
