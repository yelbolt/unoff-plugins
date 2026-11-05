import type { Shape, Token, TokenProperty } from '@penpot/plugin-types'

export interface ApplyTokenOutcome {
  success: boolean
  error?: string
}

/** Penpot GH #9290: applyToken() can throw or silently no-op; only the throw is caught here, verifyIssuedWrites catches the no-op. */
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
