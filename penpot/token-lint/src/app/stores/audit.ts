import { atom } from 'nanostores'
import {
  groupIdFromOccurrenceKey,
  isOccurrenceKey,
} from '../utils/occurrenceKey'
import type { MatchedToken, TokenSetSummary } from '../types/tokens'
import type {
  RunAuditRequest,
  AuditProgress,
  AuditReport,
  ApplyTokenResult,
  CreateTokenResult,
  DeviationGroup,
  DeviationTier,
} from '../types/audit'

export type AuditStatus =
  'IDLE' | 'RUNNING' | 'COMPLETED' | 'CANCELLED' | 'ERROR'

export const $auditRequest = atom<RunAuditRequest | null>(null)
export const $auditStatus = atom<AuditStatus>('IDLE')
export const $auditProgress = atom<AuditProgress | null>(null)
export const $auditReport = atom<AuditReport | null>(null)

export const $expandedGroupIds = atom<Set<string>>(new Set())

/** Group id being applied, or 'ALL_EXACT_MATCHES' during a bulk apply. */
export const $applyInProgressId = atom<string | null>(null)

export const $lastApplyResult = atom<ApplyTokenResult | null>(null)

/** Groups with nothing left to apply; never re-derived from a re-scan. */
export const $appliedGroupIds = atom<Set<string>>(new Set())

/** Applied occurrences, keyed via `buildOccurrenceKey`. */
export const $appliedOccurrenceKeys = atom<Set<string>>(new Set())

export const $tokenCreateInProgressId = atom<string | null>(null)

export const $lastTokenCreateResult = atom<CreateTokenResult | null>(null)

/** `null` means not fetched yet (distinct from `[]`); refetched on every dialog open. */
export const $activeTokenSets = atom<TokenSetSummary[] | null>(null)

/** Selected candidate token per DeviationGroup.id; lives here to survive row remounts. */
export const $selectedTokenIds = atom<Record<string, string>>({})

export const $selectionCount = atom<number>(0)

export const $lastLayerSelection = atom<{
  requested: number
  resolved: number
  selectionApplied: boolean
} | null>(null)

export const startAudit = (totalShapesEstimate: number) => {
  $auditStatus.set('RUNNING')
  $auditProgress.set({
    scannedShapes: 0,
    totalShapesEstimate,
    deviationsFoundSoFar: 0,
    elapsedMs: 0,
  })
  $appliedGroupIds.set(new Set())
  $appliedOccurrenceKeys.set(new Set())
  $selectedTokenIds.set({})
  $lastApplyResult.set(null)
  $lastTokenCreateResult.set(null)
}

export const updateAuditProgress = (progress: AuditProgress) => {
  $auditProgress.set(progress)
}

export const completeAudit = (report: AuditReport) => {
  $auditReport.set(report)
  $auditStatus.set('COMPLETED')
  $auditProgress.set(null)
  $appliedGroupIds.set(new Set())
  $appliedOccurrenceKeys.set(new Set())
  $selectedTokenIds.set({})
  $expandedGroupIds.set(new Set())
}

export const cancelAudit = (scannedShapes: number) => {
  $auditStatus.set('CANCELLED')
  const current = $auditProgress.get()
  $auditProgress.set(
    current
      ? { ...current, scannedShapes }
      : {
          scannedShapes,
          totalShapesEstimate: scannedShapes,
          deviationsFoundSoFar: 0,
          elapsedMs: 0,
        }
  )
}

export const setAuditError = () => {
  $auditStatus.set('ERROR')
}

export const resetAuditToSetup = () => {
  $auditStatus.set('IDLE')
}

export const toggleExpandedGroup = (groupId: string) => {
  const next = new Set($expandedGroupIds.get())
  if (next.has(groupId)) next.delete(groupId)
  else next.add(groupId)
  $expandedGroupIds.set(next)
}

export const setApplyInProgress = (id: string | null) => {
  $applyInProgressId.set(id)
}

export const setSelectedTokenId = (groupId: string, tokenId: string) => {
  $selectedTokenIds.set({ ...$selectedTokenIds.get(), [groupId]: tokenId })
}

/** Row-mount default; never overwrites an existing pick. */
export const seedSelectedTokenId = (groupId: string, tokenId: string) => {
  const current = $selectedTokenIds.get()
  if (current[groupId] !== undefined) return
  $selectedTokenIds.set({ ...current, [groupId]: tokenId })
}

export const markGroupApplied = (groupId: string) => {
  const next = new Set($appliedGroupIds.get())
  next.add(groupId)
  $appliedGroupIds.set(next)
}

export const markGroupsApplied = (groupIds: Array<string>) => {
  const next = new Set($appliedGroupIds.get())
  groupIds.forEach((id) => next.add(id))
  $appliedGroupIds.set(next)
}

const markOccurrenceApplied = (key: string) => {
  const next = new Set($appliedOccurrenceKeys.get())
  next.add(key)
  $appliedOccurrenceKeys.set(next)
}

const findGroupById = (
  report: AuditReport,
  groupId: string
): DeviationGroup | undefined =>
  report.tiers.exact.find((group) => group.id === groupId) ??
  report.tiers.near.find((group) => group.id === groupId) ??
  report.tiers.orphan.find((group) => group.id === groupId)

const countAppliedOccurrencesForGroup = (groupId: string): number =>
  [...$appliedOccurrenceKeys.get()].filter(
    (key) => groupIdFromOccurrenceKey(key) === groupId
  ).length

/** Reads the originating id from `$applyInProgressId`, so must run before `setApplyInProgress(null)`. */
export const applyTokenApplied = (result: ApplyTokenResult) => {
  const inProgressId = $applyInProgressId.get()
  $lastApplyResult.set(result)

  const isAlreadyResolved =
    result.announcedCount === 0 && result.skipped.length === 0

  if ((result.appliedCount > 0 || isAlreadyResolved) && inProgressId)
    if (inProgressId === 'ALL_EXACT_MATCHES') {
      const report = $auditReport.get()
      if (report) markGroupsApplied(report.tiers.exact.map((group) => group.id))
    } else if (isOccurrenceKey(inProgressId)) {
      markOccurrenceApplied(inProgressId)
      const groupId = groupIdFromOccurrenceKey(inProgressId)
      const report = $auditReport.get()
      const group = report && findGroupById(report, groupId)
      if (
        group &&
        countAppliedOccurrencesForGroup(groupId) >= group.occurrenceCount
      )
        markGroupApplied(groupId)
    } else markGroupApplied(inProgressId)

  $applyInProgressId.set(null)
}

export const setTokenCreateInProgress = (groupId: string | null) => {
  $tokenCreateInProgressId.set(groupId)
}

export const setActiveTokenSets = (sets: TokenSetSummary[]) => {
  $activeTokenSets.set(sets)
}

const TIER_KEY: Record<DeviationTier, 'exact' | 'near' | 'orphan'> = {
  EXACT: 'exact',
  NEAR: 'near',
  ORPHAN: 'orphan',
}

const moveGroupToTier = (
  report: AuditReport,
  groupId: string,
  tier: DeviationTier,
  candidateTokens: MatchedToken[]
): AuditReport => {
  const group = findGroupById(report, groupId)
  if (!group) return report

  const updatedGroup: DeviationGroup = { ...group, tier, candidateTokens }
  const withoutGroup = (groups: DeviationGroup[]) =>
    groups.filter((g) => g.id !== groupId)
  const byImpact = (groups: DeviationGroup[]) =>
    [...groups].sort((a, b) => b.occurrenceCount - a.occurrenceCount)

  const nextTiers = {
    exact: withoutGroup(report.tiers.exact),
    near: withoutGroup(report.tiers.near),
    orphan: withoutGroup(report.tiers.orphan),
  }
  nextTiers[TIER_KEY[tier]] = byImpact([
    ...nextTiers[TIER_KEY[tier]],
    updatedGroup,
  ])

  return { ...report, tiers: nextTiers }
}

/** The success signal is set before the report patch: the toast fires from the row that the patch then unmounts. */
export const applyTokenCreated = (result: CreateTokenResult) => {
  $lastTokenCreateResult.set(result)

  if (result.success && result.tier && result.candidateTokens) {
    const report = $auditReport.get()
    if (report)
      $auditReport.set(
        moveGroupToTier(
          report,
          result.groupId,
          result.tier,
          result.candidateTokens
        )
      )

    if (result.applyResult) {
      setApplyInProgress(result.groupId)
      applyTokenApplied(result.applyResult)
    }
  }

  $tokenCreateInProgressId.set(null)
}
