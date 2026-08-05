/** POST /v1/hit — no secrets.
 *  Cap: 1 count / instance / app / event / UTC day.
 *  Hardening: no browser Origin, Myriad UA, IP + instance rate limits.
 */

import { isAppAllowed } from './catalog.ts'
import { instanceDayIdempotencyKey } from './instance.ts'
import {
  checkInstanceRateLimit,
  checkRateLimit,
  clientIp,
  incrementIfNew,
} from './kv.ts'
import type { Env, ErrorBody, HitResponse } from './types.ts'
import { parseBool, parsePositiveInt, validateHitBody } from './validate.ts'

const MYRIAD_UA_RE = /^Myriad-Store-Stats\//i

export async function handleHit(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonError(405, 'method not allowed', 'method_not_allowed')
  }

  const devRelaxed = parseBool(env.DEV_RELAXED, false)

  const origin = request.headers.get('Origin')
  if (!devRelaxed && origin) {
    return jsonError(
      403,
      'browser Origin not allowed on /v1/hit',
      'browser_origin_forbidden',
    )
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

  const client = (validated.body.client || 'other').toString()
  const allowAnonymous = parseBool(env.ALLOW_ANONYMOUS_HITS, false)
  if (client !== 'myriad-backend' && !allowAnonymous) {
    return jsonError(
      403,
      'browser cannot write stats directly — use Myriad install path',
      'anonymous_hits_disabled',
    )
  }

  if (client === 'myriad-backend' && !validated.body.instance_hash) {
    return jsonError(
      400,
      'instance_hash required (1 count/instance/app/day)',
      'missing_instance_hash',
    )
  }

  if (!devRelaxed && client === 'myriad-backend') {
    const ua = request.headers.get('User-Agent') || ''
    if (!MYRIAD_UA_RE.test(ua)) {
      return jsonError(
        403,
        'User-Agent must be Myriad-Store-Stats/*',
        'invalid_user_agent',
      )
    }
  }

  const baseLimit = parsePositiveInt(env.HIT_RATE_LIMIT_PER_MIN, 120)
  const browserLimit = parsePositiveInt(
    env.BROWSER_HIT_RATE_LIMIT_PER_MIN,
    Math.min(20, baseLimit),
  )
  const instLimit = parsePositiveInt(env.INSTANCE_HIT_RATE_LIMIT_PER_MIN, 30)
  const limit =
    client === 'myriad-backend' ? baseLimit : Math.min(baseLimit, browserLimit)

  const ip = clientIp(request)
  if (!(await checkRateLimit(env, ip, limit))) {
    return jsonError(429, 'rate limit exceeded', 'rate_limited')
  }
  if (
    validated.body.instance_hash &&
    !(await checkInstanceRateLimit(env, validated.body.instance_hash, instLimit))
  ) {
    return jsonError(429, 'instance rate limit exceeded', 'instance_rate_limited')
  }

  const allowUnknown = parseBool(env.ALLOW_UNKNOWN_APPS, false)
  const allowed = await isAppAllowed(env, validated.body.app_id, allowUnknown)
  if (!allowed) {
    return jsonError(400, 'app_id not in official catalog', 'unknown_app')
  }

  let idem = validated.body.idempotency_key
  if (validated.body.instance_hash) {
    idem = await instanceDayIdempotencyKey(
      validated.body.instance_hash,
      validated.body.app_id,
      validated.body.event,
    )
  }

  const { counted, counters } = await incrementIfNew(
    env,
    validated.body.app_id,
    validated.body.event,
    idem,
  )

  const body: HitResponse = {
    ok: true,
    counted,
    downloads: counters.installs,
    installs: counters.installs,
    updates: counters.updates,
  }

  return json(200, body, { 'Cache-Control': 'no-store' })
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
