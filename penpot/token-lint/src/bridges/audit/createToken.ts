import { buildResolvedIndex } from '../../canvas/tokens/buildResolvedIndex'
import { matchValue } from '../../canvas/audit/matchValue'
import { applyTokens } from './applyTokens'
import type { Token, TokenType } from '@penpot/plugin-types'
import type { TokenCategory } from '../../app/types/tokens'
import type { CreateTokenRequest, CreateTokenResult } from '../../app/types/audit'

/**
 * Picks a Penpot TokenType from the audit category + the propertyPath the
 * request hints at. Optimizes for the common case (a group is almost
 * always homogeneous) rather than trying to be exhaustive.
 */
const inferTokenType = (
  category: TokenCategory,
  propertyPathHint: string
): TokenType => {
  if (category === 'color') return 'color'
  if (category === 'radius') return 'borderRadius'
  if (category === 'spacing') return 'spacing'
  if (category === 'typography') {
    if (propertyPathHint === 'fontWeight') return 'fontWeights'
    if (propertyPathHint === 'letterSpacing') return 'letterSpacing'
    // fontSize, and the lineHeight fallback (lineHeight itself has no
    // discrete TokenType — the UI does not offer "create token" for a
    // lineHeight-only group, see DeviationGroupRow.tsx).
    return 'fontSizes'
  }
  // dimension
  if (propertyPathHint === 'width' || propertyPathHint === 'height')
    return 'sizing'
  if (propertyPathHint.endsWith('strokeWidth')) return 'borderWidth'
  return 'dimension'
}

/**
 * The set the user picked in the dialog (see listActiveTokenSets.ts /
 * GET_ACTIVE_TOKEN_SETS). Re-validated here rather than trusted as-is — the
 * UI's list can be a moment stale (a set could be deactivated between the
 * dialog opening and the user confirming).
 */
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
    // Penpot's own uniqueness/validation rules can still reject a name this
    // pre-check didn't catch (e.g. a case-insensitive collision).
    return {
      groupId: request.groupId,
      success: false,
      reason: 'CREATE_FAILED',
    }
  }

  // Local, synchronous read of a mutation this call just made — unlike
  // shape.applyToken(), no known eventual-consistency gap here. Safe to
  // re-match immediately so the UI can move the group without a full re-audit.
  const index = buildResolvedIndex()
  const match = matchValue(request.rawValue, request.category, index)

  // The token was created to hold exactly this raw value, so the match is
  // (barring a normalization edge case) always EXACT — apply it to every
  // occurrence right away, reusing the normal GROUP-mode apply path.
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
