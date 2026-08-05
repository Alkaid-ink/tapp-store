/** Pure top-index merge helpers (unit-testable). */

export interface TopEntry {
  id: string
  installs: number
}

export function mergeTopEntry(
  list: TopEntry[],
  appId: string,
  installs: number,
  cap: number,
): TopEntry[] {
  const filtered = list.filter(
    (e) => e && typeof e.id === 'string' && e.id !== appId,
  )
  if (installs > 0) {
    filtered.push({ id: appId, installs })
  }
  filtered.sort(
    (a, b) => b.installs - a.installs || a.id.localeCompare(b.id),
  )
  return filtered.slice(0, Math.max(1, cap))
}

export function parseTopList(raw: string | null): TopEntry[] {
  if (!raw) return []
  try {
    const list = JSON.parse(raw) as unknown
    if (!Array.isArray(list)) return []
    return list.filter(
      (e): e is TopEntry =>
        !!e &&
        typeof e === 'object' &&
        typeof (e as TopEntry).id === 'string' &&
        typeof (e as TopEntry).installs === 'number' &&
        Number.isFinite((e as TopEntry).installs) &&
        (e as TopEntry).installs > 0,
    )
  } catch {
    return []
  }
}

export function parseTrackedApps(raw: string | null): string[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return []
    return arr.filter((x): x is string => typeof x === 'string' && x.length > 0)
  } catch {
    return []
  }
}

export function addTrackedApp(
  existing: string[],
  appId: string,
  cap: number,
): string[] {
  if (existing.includes(appId)) return existing
  const next = [...existing, appId]
  if (next.length <= cap) return next
  // Prefer keeping head; rare overflow at 50k.
  return next.slice(next.length - cap)
}

export function rebuildTopFromCounters(
  pairs: Array<{ id: string; installs: number }>,
  cap: number,
): TopEntry[] {
  return pairs
    .filter((p) => p.installs > 0)
    .sort((a, b) => b.installs - a.installs || a.id.localeCompare(b.id))
    .slice(0, Math.max(1, cap))
}
