/**
 * Short-lived caches. Every read of a Penpot shape property crosses into the
 * host (ClojureScript) and converts data: the same property must be read once
 * per run, not once per consumer.
 *
 *  - `remember`  : results shared between runs for a few seconds (fingerprints,
 *                  reference catalog, analysis). Dropped by `invalidate()` on
 *                  each user-triggered action, on contentsave and pagechange,
 *                  and by TTL.
 *  - `memoRead`  : raw shape reads (children, tokens, spacing…). Active ONLY
 *                  inside `readPhase`, where the plugin reads and never
 *                  writes; dropped when the outermost phase ends, so drawing
 *                  code (which mutates shapes) never sees a stale value.
 */

const TTL = 2500

/** Last time the plugin itself wrote to the file (see `isSelfSave`). */
let lastSelfWrite = 0
const SELF_SAVE_WINDOW = 3000

/** Call right after the plugin writes to the file (shapes, plugin data). */
export const markSelfWrite = (): void => {
  lastSelfWrite = Date.now()
}

/**
 * A contentsave this soon after the plugin's own write is most likely that
 * write being saved: it changed no documented component, so fingerprints can
 * be kept. Trade-off: an edit made by the designer within the window is only
 * detected at the next save.
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
