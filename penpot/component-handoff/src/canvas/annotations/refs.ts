import { parseNumericLike } from '../../utils/numeric'
import { getAppliedTokenName } from './tokens'
import type { Shape, Text, TokenProperty } from '@penpot/plugin-types'

interface TypoEntry {
  name: string
  fontFamily: string
  fontSize: string
  fontWeight: string
  lineHeight: string
  letterSpacing: string
}

// Reference resolution context. Precedence: token, else style, else raw.
export interface RefCtx {
  colors: Map<string, string> // color style id -> display name
  typos: Array<TypoEntry>
}

const fullName = (e: { name: string; path: string }): string =>
  e.path ? `${e.path} / ${e.name}` : e.name

// Tokens and styles are always resolved.
export const makeRefCtx = (): RefCtx => {
  const ctx: RefCtx = { colors: new Map(), typos: [] }
  const libs = [penpot.library.local, ...penpot.library.connected]
  for (const lib of libs) {
    for (const c of lib.colors) ctx.colors.set(c.id, fullName(c))
    for (const t of lib.typographies)
      ctx.typos.push({
        name: fullName(t),
        fontFamily: t.fontFamily,
        fontSize: t.fontSize,
        fontWeight: t.fontWeight,
        lineHeight: t.lineHeight,
        letterSpacing: t.letterSpacing,
      })
  }
  return ctx
}

export const tokenOf = (
  _ctx: RefCtx,
  shape: Shape,
  prop: TokenProperty
): string | undefined =>
  getAppliedTokenName(shape, prop)

export const colorStyleName = (
  ctx: RefCtx,
  refId: string | undefined
): string | undefined =>
  refId ? ctx.colors.get(refId) : undefined

const NUMERIC = /^-?[\d.,]+(px)?$/

const same = (a: unknown, b: unknown): boolean => {
  if (a === b) return typeof a === 'string'
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (!NUMERIC.test(a.trim()) || !NUMERIC.test(b.trim())) return false
  const na = parseNumericLike(a)
  const nb = parseNumericLike(b)
  return !isNaN(na) && !isNaN(nb) && Math.abs(na - nb) < 0.0001
}

// Typography styles have no readable reference: match the text values
// exactly against the libraries. The result is "matched", never "applied".
export const matchTypography = (
  ctx: RefCtx,
  text: Text
): string | undefined => {
  return ctx.typos.find(
    (t) =>
      same(text.fontFamily, t.fontFamily) &&
      same(text.fontSize, t.fontSize) &&
      same(text.fontWeight, t.fontWeight) &&
      same(text.lineHeight, t.lineHeight) &&
      same(text.letterSpacing, t.letterSpacing)
  )?.name
}
