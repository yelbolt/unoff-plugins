import type { Shape, TokenProperty } from '@penpot/plugin-types'

/** `shape.tokens` is keyed by TokenProperty names ('fill', not 'fillColor') and holds the token NAME, not id. */
export const isPropertyTokenBound = (
  shape: Shape,
  property: TokenProperty
): boolean => Boolean(shape.tokens?.[property])

export const getAppliedTokenName = (
  shape: Shape,
  property: TokenProperty
): string | undefined => shape.tokens?.[property] || undefined
