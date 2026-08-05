/** Admin repair endpoints (optional ADMIN_TOKEN). */

import { refreshCatalogIds } from './catalog.ts'
import {
  rebuildTopIndex,
  seedTrackedFromApp,
  trackedCount,
} from './kv.ts'
import type { Env, ErrorBody } from './types.ts'
import { isValidAppId } from './validate.ts'

export async function handleAdmin(
  request: Request,
  env: Env,
  path: string,
): Promise<Response> {
  if (!env.ADMIN_TOKEN || env.ADMIN_TOKEN.length < 8) {
    return jsonError(404, 'not found', 'not_found')
  }

  const auth = request.headers.get('Authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (token !== env.ADMIN_TOKEN) {
    return jsonError(401, 'unauthorized', 'unauthorized')
  }

  if (request.method !== 'POST') {
    return jsonError(405, 'method not allowed', 'method_not_allowed')
  }

  if (path === '/v1/admin/rebuild-top') {
    let seedIds: string[] = []
    try {
      const body = (await request.json()) as { seed_apps?: string[] }
      if (Array.isArray(body.seed_apps)) {
        seedIds = body.seed_apps.filter(
          (id): id is string => typeof id === 'string' && isValidAppId(id),
        )
      }
    } catch {
      // empty body ok
    }
    for (const id of seedIds) {
      await seedTrackedFromApp(env, id)
    }
    const top = await rebuildTopIndex(env)
    return json(200, {
      ok: true,
      tracked: await trackedCount(env),
      top: top.slice(0, 20),
    })
  }

  if (path === '/v1/admin/refresh-catalog') {
    const ids = await refreshCatalogIds(env)
    return json(200, {
      ok: true,
      catalog_size: ids ? ids.size : null,
    })
  }

  return jsonError(404, 'not found', 'not_found')
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function jsonError(status: number, error: string, code: string): Response {
  const body: ErrorBody = { ok: false, error, code }
  return json(status, body)
}
