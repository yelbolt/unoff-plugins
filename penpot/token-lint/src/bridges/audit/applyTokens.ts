import { resolveScope } from '../../canvas/traversal/select'
import { buildResolvedIndex } from '../../canvas/tokens/buildResolvedIndex'
import { applyTokenToShape } from '../../canvas/tokens/applyToken'
import { isCandidateCompliant } from '../../canvas/audit/runAudit'
import { matchValue } from '../../canvas/audit/matchValue'
import { groupKey, stableHash } from '../../canvas/audit/buildReport'
import {
  collectAuditableProperties,
  type RawOccurrenceCandidate,
} from '../../canvas/audit/auditableProperties'
import type { Shape, Token, TokenProperty } from '@penpot/plugin-types'
import type {
  ApplySkipReason,
  ApplySkippedItem,
  ApplyTokenRequest,
  ApplyTokenResult,
  DeviationTier,
} from '../../app/types/audit'

interface ResolvedCandidate {
  shape: Shape
  candidate: RawOccurrenceCandidate
  groupId: string
  tier: DeviationTier
  candidateTokenIds: string[]
}

const VALID_PROPERTIES_BY_TOKEN_TYPE: Record<Token['type'], TokenProperty[]> = {
  borderRadius: [
    'borderRadiusTopLeft',
    'borderRadiusTopRight',
    'borderRadiusBottomRight',
    'borderRadiusBottomLeft',
  ],
  shadow: ['shadow'],
  color: ['fill', 'strokeColor'],
  dimension: ['x', 'y', 'strokeWidth'],
  fontFamilies: ['fontFamilies'],
  fontSizes: ['fontSize'],
  fontWeights: ['fontWeight'],
  letterSpacing: ['letterSpacing'],
  number: ['rotation'],
  rotation: ['rotation'],
  opacity: ['opacity'],
  sizing: [
    'width',
    'height',
    'layoutItemMinW',
    'layoutItemMaxW',
    'layoutItemMinH',
    'layoutItemMaxH',
  ],
  spacing: [
    'rowGap',
    'columnGap',
    'paddingLeft',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'marginLeft',
    'marginTop',
    'marginRight',
    'marginBottom',
  ],
  borderWidth: ['strokeWidth'],
  textCase: ['textCase'],
  textDecoration: ['textDecoration'],
  typography: ['typography'],
}

const isTokenCompatible = (
  token: Token,
  tokenProperties: TokenProperty[]
): boolean => {
  if (tokenProperties.length === 0) return false // e.g. lineHeight — see auditableProperties.ts
  const allowed = VALID_PROPERTIES_BY_TOKEN_TYPE[token.type] ?? []
  return tokenProperties.every((property) => allowed.includes(property))
}

const findTokenById = (tokenId: string): Token | undefined => {
  for (const set of penpot.library.local.tokens.sets) {
    if (!set.active) continue
    const token = set.getTokenById(tokenId)
    if (token) return token
  }
  return undefined
}

const gatherResolvedCandidates = (
  request: Pick<ApplyTokenRequest, 'scope' | 'categories' | 'options'>
): ResolvedCandidate[] => {
  const index = buildResolvedIndex()
  const { included } = resolveScope(request.scope, request.options)
  const results: ResolvedCandidate[] = []

  for (const traversed of included) {
    const candidates = collectAuditableProperties(traversed, request.categories)
    for (const candidate of candidates) {
      if (isCandidateCompliant(candidate)) continue
      const match = matchValue(candidate.rawValue, candidate.category, index)
      results.push({
        shape: traversed.shape,
        candidate,
        groupId: stableHash(groupKey(candidate.category, candidate.rawValue)),
        tier: match.tier,
        candidateTokenIds: match.candidateTokens.map((t) => t.tokenId),
      })
    }
  }

  return results
}

const skipItem = (
  candidate: RawOccurrenceCandidate,
  reason: ApplySkipReason
): ApplySkippedItem => ({
  shapeId: candidate.shapeId,
  shapeName: candidate.shapeName,
  propertyPath: candidate.propertyPath,
  reason,
})

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

// GH #9290: a write can silently no-op even on success — poll before trusting it.
const POST_WRITE_RECHECK_ATTEMPTS = 4
const POST_WRITE_RECHECK_DELAY_MS = 50

interface WriteIssued {
  candidate: RawOccurrenceCandidate
  target: Shape
}

interface PrecheckResult {
  issued?: WriteIssued
  skip?: ApplySkippedItem
}

const precheckAndIssue = (
  resolved: ResolvedCandidate,
  token: Token
): PrecheckResult => {
  const { shape, candidate } = resolved

  if (resolved.tier !== 'EXACT')
    return { skip: skipItem(candidate, 'TIER_NOT_APPLICABLE') }

  if (shape.blocked) return { skip: skipItem(candidate, 'LOCKED') }

  if (!isTokenCompatible(token, candidate.tokenProperties))
    return { skip: skipItem(candidate, 'TYPE_INCOMPATIBLE') }

  if (isCandidateCompliant(candidate))
    return { skip: skipItem(candidate, 'ALREADY_APPLIED') }

  const target = candidate.ownerShape

  const outcome = applyTokenToShape(target, token, candidate.tokenProperties)
  if (!outcome.success) return { skip: skipItem(candidate, 'WRITE_FAILED') }

  return { issued: { candidate, target } }
}

const verifyIssuedWrites = async (
  issued: WriteIssued[]
): Promise<{ applied: WriteIssued[]; failed: WriteIssued[] }> => {
  let pending = issued
  const applied: WriteIssued[] = []

  for (
    let attempt = 0;
    attempt < POST_WRITE_RECHECK_ATTEMPTS && pending.length > 0;
    attempt++
  ) {
    if (attempt > 0) await delay(POST_WRITE_RECHECK_DELAY_MS)

    const stillPending: WriteIssued[] = []
    for (const item of pending)
      if (isCandidateCompliant(item.candidate)) applied.push(item)
      else stillPending.push(item)

    pending = stillPending
  }

  return { applied, failed: pending }
}

// Serializes undo blocks — two apply requests overlapping across an
// await would otherwise interleave undoBlockBegin/undoBlockFinish pairs.
let applyQueue: Promise<unknown> = Promise.resolve()

const runWithinUndoBlock = <T>(fn: () => Promise<T>): Promise<T> => {
  const run = async (): Promise<T> => {
    const blockId = penpot.history.undoBlockBegin()
    try {
      return await fn()
    } finally {
      penpot.history.undoBlockFinish(blockId)
    }
  }

  const result = applyQueue.then(run, run)
  applyQueue = result.then(
    () => undefined,
    () => undefined
  )
  return result
}

const applyOccurrence = async (
  request: ApplyTokenRequest
): Promise<ApplyTokenResult> => {
  const all = gatherResolvedCandidates(request)
  const resolved = all.find(
    (r) =>
      r.candidate.shapeId === request.occurrenceShapeId &&
      r.candidate.propertyPath === request.propertyPath
  )

  if (!resolved || !request.tokenId) {
    const skip: ApplySkippedItem = {
      shapeId: request.occurrenceShapeId ?? '',
      shapeName: '',
      propertyPath: request.propertyPath ?? '',
      reason: 'SHAPE_NOT_FOUND',
    }
    return {
      requestedMode: 'OCCURRENCE',
      announcedCount: 1,
      appliedCount: 0,
      skipped: [skip],
      undoEntryCreated: false,
    }
  }

  const token = findTokenById(request.tokenId)

  const outcome = await runWithinUndoBlock(async () => {
    if (!token)
      return { applied: false, skip: skipItem(resolved.candidate, 'TYPE_INCOMPATIBLE') }

    const precheck = precheckAndIssue(resolved, token)
    if (precheck.skip) return { applied: false, skip: precheck.skip }

    const { applied } = await verifyIssuedWrites([precheck.issued as WriteIssued])
    if (applied.length > 0) return { applied: true, skip: undefined }
    return { applied: false, skip: skipItem(resolved.candidate, 'WRITE_FAILED') }
  })

  return {
    requestedMode: 'OCCURRENCE',
    announcedCount: 1,
    appliedCount: outcome.applied ? 1 : 0,
    skipped: outcome.skip ? [outcome.skip] : [],
    tokenApplied: token
      ? { tokenId: token.id, tokenName: token.name }
      : undefined,
    undoEntryCreated: outcome.applied,
  }
}

const applyGroup = async (
  request: ApplyTokenRequest
): Promise<ApplyTokenResult> => {
  const all = gatherResolvedCandidates(request)
  const inGroup = all.filter((r) => r.groupId === request.deviationGroupId)
  const announcedCount = inGroup.length

  if (!request.tokenId || inGroup.length === 0)
    return {
      requestedMode: 'GROUP',
      announcedCount,
      appliedCount: 0,
      skipped: inGroup.map((r) => skipItem(r.candidate, 'TIER_NOT_APPLICABLE')),
      undoEntryCreated: false,
    }

  const token = findTokenById(request.tokenId)

  const { appliedShapeIds, skipped } = await runWithinUndoBlock(async () => {
    const skipped: ApplySkippedItem[] = []
    const issued: WriteIssued[] = []

    for (const resolved of inGroup) {
      if (!token) {
        skipped.push(skipItem(resolved.candidate, 'TYPE_INCOMPATIBLE'))
        continue
      }
      const precheck = precheckAndIssue(resolved, token)
      if (precheck.skip) skipped.push(precheck.skip)
      else if (precheck.issued) issued.push(precheck.issued)
    }

    const { applied, failed } = await verifyIssuedWrites(issued)
    failed.forEach((item) => skipped.push(skipItem(item.candidate, 'WRITE_FAILED')))

    return {
      appliedShapeIds: applied.map((item) => item.candidate.shapeId),
      skipped,
    }
  })

  return {
    requestedMode: 'GROUP',
    announcedCount,
    appliedCount: appliedShapeIds.length,
    skipped,
    tokenApplied: token
      ? { tokenId: token.id, tokenName: token.name }
      : undefined,
    undoEntryCreated: appliedShapeIds.length > 0,
  }
}

const applyAllExactMatches = async (
  request: ApplyTokenRequest
): Promise<ApplyTokenResult> => {
  const all = gatherResolvedCandidates(request)
  const exact = all.filter((r) => r.tier === 'EXACT')
  const announcedCount = exact.length

  const { appliedShapeIds, skipped } = await runWithinUndoBlock(async () => {
    const skipped: ApplySkippedItem[] = []
    const issued: WriteIssued[] = []

    const byGroup = new Map<string, ResolvedCandidate[]>()
    for (const resolved of exact) {
      const list = byGroup.get(resolved.groupId) ?? []
      list.push(resolved)
      byGroup.set(resolved.groupId, list)
    }

    for (const group of byGroup.values()) {
      const tokenIds = group[0].candidateTokenIds
      if (tokenIds.length !== 1) {
        for (const resolved of group)
          skipped.push(skipItem(resolved.candidate, 'AMBIGUOUS_CANDIDATES'))
        continue
      }

      const token = findTokenById(tokenIds[0])
      for (const resolved of group) {
        if (!token) {
          skipped.push(skipItem(resolved.candidate, 'TYPE_INCOMPATIBLE'))
          continue
        }
        const precheck = precheckAndIssue(resolved, token)
        if (precheck.skip) skipped.push(precheck.skip)
        else if (precheck.issued) issued.push(precheck.issued)
      }
    }

    const { applied, failed } = await verifyIssuedWrites(issued)
    failed.forEach((item) => skipped.push(skipItem(item.candidate, 'WRITE_FAILED')))

    return {
      appliedShapeIds: applied.map((item) => item.candidate.shapeId),
      skipped,
    }
  })

  return {
    requestedMode: 'ALL_EXACT_MATCHES',
    announcedCount,
    appliedCount: appliedShapeIds.length,
    skipped,
    undoEntryCreated: appliedShapeIds.length > 0,
  }
}

export const applyTokens = async (
  request: ApplyTokenRequest
): Promise<ApplyTokenResult> => {
  switch (request.mode) {
    case 'OCCURRENCE':
      return applyOccurrence(request)
    case 'GROUP':
      return applyGroup(request)
    case 'ALL_EXACT_MATCHES':
      return applyAllExactMatches(request)
  }
}
