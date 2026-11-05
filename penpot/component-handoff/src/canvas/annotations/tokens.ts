import { memoRead } from './memo'
import type { Shape, TokenProperty } from '@penpot/plugin-types'

// Same source as Token Lint (src/canvas/tokens/readAppliedToken.ts):
// `shape.tokens[property]` holds the applied token's NAME.
export const getAppliedTokenName = (
  shape: Shape,
  property: TokenProperty
): string | undefined =>
  // shape.tokens converts the whole map on every access: read it once per run.
  memoRead(`tokens:${shape.id}`, () => shape.tokens ?? null)?.[property] || undefined

/**
 * Read once per generation (RefCtx). Only ACTIVE sets count: they decide which
 * token a name designates, and the later set wins when a name exists in
 * several of them (TokenCatalog.sets documents that precedence).
 */

export interface TokenInfo {
  name: string
  type: string // TokenType
  value: unknown // as defined in the token; may be a `{reference}`
  resolved: unknown // calculated value, references followed
  set: string // name of the set holding the winning definition
}

const REFERENCE = /^\{([^{}]+)\}$/

export const referenceOf = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const m = REFERENCE.exec(value.trim())
  return m ? m[1] : null
}

export const referencesIn = (value: unknown): Array<string> => {
  const text = typeof value === 'string' ? value : JSON.stringify(value) ?? ''
  const out: Array<string> = []
  const re = /\{([^{}"]+)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) out.push(m[1])
  return out
}

const display = (v: unknown): string =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : (JSON.stringify(v) ?? '')

export class TokenIndex {
  byName = new Map<string, TokenInfo>()
  types = new Set<string>() // token types present in the file's active sets

  get(name: string): TokenInfo | undefined {
    return this.byName.get(name)
  }

  /**
   * `button.bg → color.action.primary → #0B5FFF`, or null when the token does
   * not reference another one (or is unknown).
   */
  chain(name: string): Array<string> | null {
    const path = [name]
    let cur = this.byName.get(name)
    const seen = new Set<string>([name])
    while (cur) {
      const next = referenceOf(cur.value)
      if (!next || seen.has(next)) break
      seen.add(next)
      path.push(next)
      cur = this.byName.get(next)
    }
    if (path.length === 1) return null
    const last = this.byName.get(path[path.length - 1])
    if (last?.resolved !== undefined) path.push(display(last.resolved))
    return path
  }
}

const safeRead = <T>(fn: () => T, fallback: T): T => {
  try {
    return fn()
  } catch {
    return fallback
  }
}

export const makeTokenIndex = (): TokenIndex => {
  const index = new TokenIndex()
  const libs = safeRead(
    () => [penpot.library.local, ...penpot.library.connected],
    []
  )
  for (const lib of libs) {
    const sets = safeRead(() => lib.tokens.sets, [])
    for (const set of sets) {
      if (!safeRead(() => set.active, false)) continue
      for (const token of safeRead(() => set.tokens, [])) {
        const t = token as unknown as {
          name: string
          type: string
          value?: unknown
          resolvedValue?: unknown
          resolvedValueString?: string
        }
        index.types.add(t.type)
        index.byName.set(t.name, {
          name: t.name,
          type: t.type,
          value: t.value,
          resolved: t.resolvedValue ?? t.resolvedValueString,
          set: safeRead(() => set.name, ''),
        })
      }
    }
  }
  return index
}
