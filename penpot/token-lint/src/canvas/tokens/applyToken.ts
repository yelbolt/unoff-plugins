import type { Shape, Token, TokenProperty } from '@penpot/plugin-types'

export interface ApplyTokenOutcome {
  success: boolean
  error?: string
}

/**
 * Wraps `shape.applyToken()`: it's reported unreliable for some
 * color/dimension/opacity configurations (Penpot GH #9290) and can throw or
 * silently no-op. We catch the throw case here; the silent no-op is caught
 * by the caller (`verifyIssuedWrites` in bridges/audit/applyTokens.ts),
 * which re-reads `shape.tokens[property]` in polled rounds instead of
 * judging on the first read.
 */
export const applyTokenToShape = (
  shape: Shape,
  token: Token,
  properties?: TokenProperty[]
): ApplyTokenOutcome => {
  try {
    shape.applyToken(token, properties)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
