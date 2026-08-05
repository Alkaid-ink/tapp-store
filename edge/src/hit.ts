/** POST /v1/hit handler. */

import { isAppAllowed } from './catalog.ts'
import { verifyHitAuth } from './hmac.ts'
import { checkRateLimit, clientIp, incrementIfNew } from './kv.ts'
import type { Env, ErrorBody, HitResponse } from './types.ts'
import { parseBool, parsePositiveInt, validateHitBody } from './validate.ts'

export async function handleHit(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonError(405, 'method not allowed', 'method_not_allowed')
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return jsonError(400, 'invalid JSON', 'invalid_json')
  }

  const validated = validateHitBody(raw)
  if (!validated.ok) {
    return jsonError(400, validated.error, validated.code)
  }

  const auth = await verifyHitAuth(request, env, validated.body)
  if (!auth.ok) {
    return jsonError(401, auth.error, auth.code)
  }

  // Stricter limit for anonymous browser / other clients (HMAC backends use full limit).
  const baseLimit = parsePositiveInt(env.HIT_RATE_LIMIT_PER_MIN, 60)
  const browserLimit = parsePositiveInt(
    env.BROWSER_HIT_RATE_LIMIT_PER_MIN,
    Math.min(20, baseLimit),
  )
  const client = (validated.body.client || 'other').toString()
  const limit =
    client === 'myriad-backend' ? baseLimit : Math.min(baseLimit, browserLimit)

  const ip = clientIp(request)
  const allowedRate = await checkRateLimit(env, ip, limit)
  if (!allowedRate) {
    return jsonError(429, 'rate limit exceeded', 'rate_limited')
  }

  const allowUnknown = parseBool(env.ALLOW_UNKNOWN_APPS, false)
  const allowed = await isAppAllowed(env, validated.body.app_id, allowUnknown)
  if (!allowed) {
    return jsonError(400, 'app_id not in official catalog', 'unknown_app')
  }

  const { counted, counters } = await incrementIfNew(
    env,
    validated.body.app_id,
    validated.body.event,
    validated.body.idempotency_key,
  )

  const body: HitResponse = {
    ok: true,
    counted,
    downloads: counters.installs,
    installs: counters.installs,
    updates: counters.updates,
  }

  return json(200, body, {
    'Cache-Control': 'no-store',
  })
}

function json(status: number, body: unknown, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
  })
}

function jsonError(status: number, error: string, code: string): Response {
  const body: ErrorBody = { ok: false, error, code }
  return json(status, body, { 'Cache-Control': 'no-store' })
}
