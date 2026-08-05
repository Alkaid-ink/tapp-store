/** Optional HMAC — only when REQUIRE_HMAC or a signature is presented. */

import type { Env, HitRequestBody } from './types.ts'
import { parseBool } from './validate.ts'

/**
 * Default (REQUIRE_HMAC=false): no secret needed; open to Myriad backends with
 * instance-day idempotency + allowlist + rate limit.
 *
 * If INGEST_HMAC_SECRET is set AND (REQUIRE_HMAC or client sent a signature),
 * verify signature for client=myriad-backend.
 */
export async function verifyHitAuth(
  request: Request,
  env: Env,
  body: HitRequestBody,
): Promise<{ ok: true } | { ok: false; error: string; code: string }> {
  const secret = env.INGEST_HMAC_SECRET?.trim()
  const requireHmac = parseBool(env.REQUIRE_HMAC, false)
  const sigHeader = (request.headers.get('X-Stats-Signature') || '').trim()
  const client = (body.client || 'other').toString()

  if (!secret) {
    if (requireHmac) {
      return {
        ok: false,
        error: 'REQUIRE_HMAC set but INGEST_HMAC_SECRET missing',
        code: 'hmac_not_configured',
      }
    }
    return { ok: true }
  }

  // Secret configured but not required: only verify if client sent a signature.
  if (!requireHmac && !sigHeader) {
    return { ok: true }
  }

  if (client !== 'myriad-backend') {
    return { ok: true }
  }

  const match = /^sha256=([a-f0-9]{64})$/i.exec(sigHeader)
  if (!match) {
    return {
      ok: false,
      error: 'missing or invalid X-Stats-Signature for myriad-backend',
      code: 'invalid_signature',
    }
  }

  const payload = [
    body.app_id,
    body.event,
    body.idempotency_key,
    body.version || '',
  ].join('\n')

  const expected = await hmacSha256Hex(secret, payload)
  if (!timingSafeEqualHex(expected, match[1].toLowerCase())) {
    return { ok: false, error: 'signature mismatch', code: 'invalid_signature' }
  }
  return { ok: true }
}

export async function hmacSha256Hex(
  secret: string,
  message: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(message),
  )
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return out === 0
}
