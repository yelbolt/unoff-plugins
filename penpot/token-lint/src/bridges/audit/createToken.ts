import { buildResolvedIndex } from '../../canvas/tokens/buildResolvedIndex'
import { matchValue } from '../../canvas/audit/matchValue'
import { applyTokens } from './applyTokens'
import type { Token, TokenType } from '@penpot/plugin-types'
import type { TokenCategory } from '../../app/types/tokens'
import type { CreateTokenRequest, CreateTokenResult } from '../../app/types/audit'

const inferTokenType = (
  category: TokenCategory,
  propertyPathHint: string
): TokenType => {
  if (category === 'color') return 'color'
  if (category === 'radius') return 'borderRadius'
  if (category === 'spacing') return 'spacing'
  if (category === 'opacity') return 'opacity'
  if (category === 'rotation') return 'rotation'
  if (category === 'typography') {
    if (propertyPathHint === 'fontWeight') return 'fontWeights'
    if (propertyPathHint === 'letterSpacing') return 'letterSpacing'
    if (propertyPathHint === 'fontFamily') return 'fontFamilies'
    if (propertyPathHint === 'textCase') return 'textCase'
    if (propertyPathHint === 'textDecoration') return 'textDecoration'
    // lineHeight has no discrete TokenType and falls back here; the UI never offers it.
    return 'fontSizes'
  }
  if (propertyPathHint === 'width' || propertyPathHint === 'height')
    return 'sizing'
  if (propertyPathHint.endsWith('strokeWidth')) return 'borderWidth'
  return 'dimension'
}

/** Re-validated: the UI's set list can be stale (set deactivated while the dialog is open). */
const findTargetSet = (setId: string) => {
  const set = penpot.library.local.tokens.getSetById(setId)
  return set && set.active ? set : undefined
}

export const createToken = async (
  request: CreateTokenRequest
): Promise<CreateTokenResult> => {
  const targetSet = findTargetSet(request.setId)
  if (!targetSet)
    return { groupId: request.groupId, success: false, reason: 'NO_ACTIVE_SET' }

  if (targetSet.tokens.some((token) => token.name === request.name))
    return {
      groupId: request.groupId,
      success: false,
      reason: 'NAME_ALREADY_EXISTS',
    }

  const type = inferTokenType(request.category, request.propertyPathHint)

  let token: Token
  try {
    token = targetSet.addToken({
      type,
      name: request.name,
      value: request.rawValue,
    })
  } catch {
    // Penpot can still reject a name the pre-check missed (e.g. case-insensitive collision).
    return {
      groupId: request.groupId,
      success: false,
      reason: 'CREATE_FAILED',
    }
  }

  // Unlike shape.applyToken(), addToken is synchronous: safe to re-match immediately.
  const index = buildResolvedIndex()
  const match = matchValue(request.rawValue, request.category, index)

  // Barring a normalization edge case the match is always EXACT.
  const applyResult =
    match.tier === 'EXACT'
      ? await applyTokens({
          mode: 'GROUP',
          tokenId: token.id,
          deviationGroupId: request.groupId,
          scope: request.scope,
          categories: request.categories,
          options: request.options,
        })
      : undefined

  return {
    groupId: request.groupId,
    success: true,
    token: { tokenId: token.id, tokenName: token.name, setName: targetSet.name },
    tier: match.tier,
    candidateTokens: match.candidateTokens,
    applyResult,
  }
}
