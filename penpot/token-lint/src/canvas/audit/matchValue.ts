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

const NUMERIC_EPSILON_DECIMALS = 4

/** Guards against float representation noise (e.g. 8 vs 7.999999999998). */
const normalizeNumeric = (value: number): number => {
  const factor = 10 ** NUMERIC_EPSILON_DECIMALS
  return Math.round(value * factor) / factor
}

const normalizeColor = (value: string): string => {
  const trimmed = value.trim().toLowerCase()
  const short = trimmed.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/)
  if (short) {
    const [, r, g, b] = short
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return trimmed
}

const normalizeString = (value: string): string => value.trim().toLowerCase()

const normalizeForCompare = (
  value: string | number,
  category: TokenCategory
): string | number => {
  if (typeof value === 'number') return normalizeNumeric(value)
  return category === 'color' ? normalizeColor(value) : normalizeString(value)
}

/**
 * Penpot's runtime resolvedValue can disagree with the .d.ts (e.g. "16" for a numeric
 * token), so it is coerced to the raw value's type; `undefined` = genuine type mismatch.
 * parseNumericLike, not Number(): handles "16px" and "16,5".
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
 * EXACT = equality on normalized values; several tokens resolving to the same value
 * all surface, unpicked.
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
  // Null guard: degrades to "no match" instead of crashing `.trim()` in normalizeForCompare.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (rawValue == null) return { tier: 'ORPHAN', candidateTokens: [] }

  const entries = index.byCategory[category]

  // Coerce, don't filter by strict `typeof` (see coerceToRawType).
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
    // A composite 'typography' token yields up to four entries sharing a tokenId;
    // dedupe so equal fields don't create a phantom tie (real ties differ by tokenId).
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
