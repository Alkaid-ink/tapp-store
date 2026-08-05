/** Optional HMAC verification for trusted backend hits. */

import type { Env, HitRequestBody } from './types.ts'

/**
 * When `INGEST_HMAC_SECRET` is set:
 * - `client=myriad-backend` MUST send header `X-Stats-Signature: sha256=<hex>`
 *   over canonical string: `${app_id}\n${event}\n${idempotency_key}\n${version||''}`
 * - browser / other clients remain anonymous (no signature required).
 */
export async function verifyHitAuth(
  request: Request,
  env: Env,
  body: HitRequestBody,
): Promise<{ ok: true } | { ok: false; error: string; code: string }> {
  const secret = env.INGEST_HMAC_SECRET?.trim()
  if (!secret) return { ok: true }

  const client = (body.client || 'other').toString()
  if (client !== 'myriad-backend') {
    // Anonymous path still allowed for browser fallback; rate limit + allowlist apply.
    return { ok: true }
  }

  const sigHeader = request.headers.get('X-Stats-Signature') || ''
  const match = /^sha256=([a-f0-9]{64})$/i.exec(sigHeader.trim())
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
