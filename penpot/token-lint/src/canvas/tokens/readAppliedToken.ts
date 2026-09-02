import type { Shape, TokenProperty } from '@penpot/plugin-types'

/**
 * `shape.tokens` is keyed by Penpot's own `TokenProperty` names — 'fill',
 * not 'fillColor'; 'borderRadiusTopLeft', not 'borderRadius' — and holds the
 * applied token's NAME (not id). Used for coverage math: a property counts
 * as compliant when it is already token-bound, regardless of whether its
 * raw value happens to match a token.
 */
export const isPropertyTokenBound = (
  shape: Shape,
  property: TokenProperty
): boolean => Boolean(shape.tokens?.[property])

export const getAppliedTokenName = (
  shape: Shape,
  property: TokenProperty
): string | undefined => shape.tokens?.[property] || undefined
