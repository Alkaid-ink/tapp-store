/** Instance-scoped daily idempotency: 1 count / instance / app / event / UTC day. */

export async function instanceDayIdempotencyKey(
  instanceHash: string,
  appId: string,
  event: string,
): Promise<string> {
  const day = new Date().toISOString().slice(0, 10) // YYYY-MM-DD UTC
  const material = `inst|${instanceHash}|${appId}|${event}|${day}`
  const data = new TextEncoder().encode(material)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const hex = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  // 32 hex chars, valid for idempotency regex
  return hex.slice(0, 32)
}
