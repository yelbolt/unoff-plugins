// Numeric-looking shape/token properties can arrive as strings with a unit
// suffix ("16px"), a locale decimal comma ("16,5"), a typographic minus sign
// (U+2212), or the literal string "mixed". `parseNumericLike` tolerates all
// of them and returns NaN for anything still unparseable.
const UNICODE_MINUS = /−/g

export const parseNumericLike = (value: unknown): number => {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return NaN

  const normalized = value.trim().replace(UNICODE_MINUS, '-').replace(',', '.')
  if (normalized === '' || normalized.toLowerCase() === 'mixed') return NaN

  return parseFloat(normalized)
}

/**
 * Rounds away floating-point noise (e.g. Penpot returning `19.999999523162862`
 * for a plain `20`) while keeping genuine sub-pixel values (e.g. 2.5) intact.
 */
export const roundNumeric = (value: number, decimals = 2): number => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}
