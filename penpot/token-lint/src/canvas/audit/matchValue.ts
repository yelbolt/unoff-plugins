import { parseNumericLike } from '../../utils/numeric'
import { colorDistance, numericDistance } from './distance'
import type {
  MatchedToken,
  ResolvedTokenIndex,
  ResolvedTokenIndexEntry,
  TokenCategory,
} from '../../app/types/tokens'
import type { DeviationTier } from '../../app/types/audit'

export interface MatchResult {
  tier: DeviationTier
  /** EXACT: 1+ (ties surfaced, none picked); NEAR: 1 nearest with residual; ORPHAN: []. */
  candidateTokens: MatchedToken[]
}

// ── Normalization ───────────────────────────────────────────────────────
// Penpot doesn't guarantee matching casing/formatting between a shape's raw
// value and a token's resolvedValue, so all comparisons go through these
// normalizers on both sides instead of comparing raw values directly.

const NUMERIC_EPSILON_DECIMALS = 4

/** Guards against float representation noise (e.g. 8 vs 7.999999999998). */
const normalizeNumeric = (value: number): number => {
  const factor = 10 ** NUMERIC_EPSILON_DECIMALS
  return Math.round(value * factor) / factor
}

/** Trim + lowercase, and expand short hex (#abc -> #aabbcc). */
const normalizeColor = (value: string): string => {
  const trimmed = value.trim().toLowerCase()
  const short = trimmed.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/)
  if (short) {
    const [, r, g, b] = short
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return trimmed
}

/** Generic string normalization for non-color string categories (currently only `fontWeight`). */
const normalizeString = (value: string): string => value.trim().toLowerCase()

const normalizeForCompare = (
  value: string | number,
  category: TokenCategory
): string | number => {
  if (typeof value === 'number') return normalizeNumeric(value)
  return category === 'color' ? normalizeColor(value) : normalizeString(value)
}

/**
 * Coerces an index entry's `resolvedValue` to the same JS type as the raw
 * shape value it's compared against, instead of trusting
 * `typeof entry.resolvedValue` to match the `.d.ts` (Penpot's runtime has
 * been observed to disagree with it, e.g. returning `"16"` for a numeric
 * token). Returns `undefined` when the entry genuinely can't be compared —
 * a real type mismatch, not a formatting one.
 *
 * Goes through `parseNumericLike`, not a bare `Number(...)`, since a
 * resolvedValue can carry a unit suffix ("16px") or a locale decimal comma
 * ("16,5") that would otherwise return NaN and drop an otherwise-comparable
 * token.
 */
const coerceToRawType = (
  entryValue: string | number,
  rawValue: string | number
): string | number | undefined => {
  if (typeof rawValue === 'number') {
    const coerced =
      typeof entryValue === 'number' ? entryValue : parseNumericLike(entryValue)
    return Number.isNaN(coerced) ? undefined : coerced
  }
  return typeof entryValue === 'string' ? entryValue : String(entryValue)
}

const toMatched = (
  entries: ResolvedTokenIndexEntry[],
  residual?: number
): MatchedToken[] =>
  entries.map((entry) => ({
    tokenId: entry.tokenId,
    tokenName: entry.tokenName,
    setName: entry.setName,
    resolvedValue: entry.resolvedValue,
    ...(residual !== undefined ? { residual } : {}),
  }))

/**
 * Pure match of one raw value against the resolved-value index for its
 * category. EXACT = equality on normalized values on both sides; several
 * tokens resolving to the same value all surface, unpicked.
 *
 * - ORPHAN: zero active tokens of a comparable type in this category (a
 *   same-type restriction matters here: within 'typography', string
 *   fontWeight and numeric fontSize/lineHeight/letterSpacing share a
 *   category but a residual between them is meaningless).
 * - NEAR: catch-all otherwise — the single nearest comparable token is
 *   proposed with its residual. Ties are broken deterministically: lowest
 *   residual, then token name, then token id.
 */
export const matchValue = (
  rawValue: string | number,
  category: TokenCategory,
  index: ResolvedTokenIndex
): MatchResult => {
  // Defensive backstop — a gap in upstream filtering degrades to "no match"
  // instead of crashing `.trim()` on null in normalizeForCompare.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (rawValue == null) return { tier: 'ORPHAN', candidateTokens: [] }

  const entries = index.byCategory[category]

  // Coerce first, don't filter by strict `typeof` — see coerceToRawType.
  const comparable: { entry: ResolvedTokenIndexEntry; value: string | number }[] = []
  for (const entry of entries) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (entry.resolvedValue == null) continue
    const coerced = coerceToRawType(entry.resolvedValue, rawValue)
    if (coerced !== undefined) comparable.push({ entry, value: coerced })
  }

  if (comparable.length === 0) return { tier: 'ORPHAN', candidateTokens: [] }

  const rawNorm = normalizeForCompare(rawValue, category)

  const exact = comparable.filter(
    ({ value }) => normalizeForCompare(value, category) === rawNorm
  )
  if (exact.length > 0) {
    // Dedupe by tokenId: a composite 'typography' token decomposes into up
    // to four index entries sharing the same tokenId (buildResolvedIndex.ts).
    // If two of those decomposed fields hold the same value, both would
    // otherwise pass the `exact` filter and appear twice for one token —
    // a phantom tie, not a real one (real ties are different tokenIds).
    const seenTokenIds = new Set<string>()
    const dedupedEntries: ResolvedTokenIndexEntry[] = []
    for (const { entry } of exact) {
      if (seenTokenIds.has(entry.tokenId)) continue
      seenTokenIds.add(entry.tokenId)
      dedupedEntries.push(entry)
    }
    return { tier: 'EXACT', candidateTokens: toMatched(dedupedEntries) }
  }

  const scored = comparable.map(({ entry, value }) => {
    const entryNorm = normalizeForCompare(value, category)
    const residual =
      typeof rawNorm === 'number' && typeof entryNorm === 'number'
        ? numericDistance(rawNorm, entryNorm)
        : colorDistance(String(rawNorm), String(entryNorm))
    return { entry, residual }
  })

  scored.sort((a, b) => {
    if (a.residual !== b.residual) return a.residual - b.residual
    if (a.entry.tokenName !== b.entry.tokenName)
      return a.entry.tokenName < b.entry.tokenName ? -1 : 1
    return a.entry.tokenId < b.entry.tokenId ? -1 : 1
  })

  const best = scored[0]
  return { tier: 'NEAR', candidateTokens: toMatched([best.entry], best.residual) }
}
