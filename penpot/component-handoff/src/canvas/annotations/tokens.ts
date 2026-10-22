import type { Shape, TokenProperty } from '@penpot/plugin-types'

// Same source as Token Lint (src/canvas/tokens/readAppliedToken.ts):
// `shape.tokens[property]` holds the applied token's NAME.
export const getAppliedTokenName = (
  shape: Shape,
  property: TokenProperty
): string | undefined => shape.tokens?.[property] || undefined
