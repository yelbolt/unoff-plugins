/**
 * `remember`: results shared between runs (dropped by invalidate(), contentsave, pagechange, TTL).
 * `memoRead`: raw shape reads, active only inside `readPhase` (reads only), so drawing never sees a stale value.
 */

const TTL = 2500

let lastSelfWrite = 0
const SELF_SAVE_WINDOW = 3000

export const markSelfWrite = (): void => {
  lastSelfWrite = Date.now()
}

/**
 * A contentsave this soon after the plugin's own write is taken as that write, so fingerprints are kept.
 * Trade-off: a designer edit within the window is only detected at the next save.
 */
export const isSelfSave = (): boolean =>
  Date.now() - lastSelfWrite <= SELF_SAVE_WINDOW

interface Slot {
  at: number
  value: unknown
}

const kept = new Map<string, Slot>()
const reads = new Map<string, unknown>()
let phase = 0

export const invalidate = (...keepPrefixes: Array<string>): void => {
  if (keepPrefixes.length === 0) kept.clear()
  else
    for (const k of [...kept.keys()])
      if (!keepPrefixes.some((p) => k.startsWith(p))) kept.delete(k)
  reads.clear()
}

export const remember = <T>(
  key: string,
  compute: () => T,
  ttl: number = TTL
): T => {
  const now = Date.now()
  const hit = kept.get(key)
  if (hit && now - hit.at <= ttl) return hit.value as T
  const value = compute()
  kept.set(key, { at: Date.now(), value })
  return value
}

export const readPhase = <T>(fn: () => T): T => {
  phase++
  try {
    return fn()
  } finally {
    phase--
    if (phase === 0) reads.clear()
  }
}

export const memoRead = <T>(key: string, compute: () => T): T => {
  if (phase === 0) return compute()
  if (reads.has(key)) return reads.get(key) as T
  const value = compute()
  reads.set(key, value)
  return value
}
