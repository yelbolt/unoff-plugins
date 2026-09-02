import { atom } from 'nanostores'
import { groupIdFromOccurrenceKey, isOccurrenceKey } from '../utils/occurrenceKey'
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

// Audit run + report lifecycle — see specs/token-list-audit-and-application.md.
// Populated exclusively from confirmed Canvas → UI messages, routed in
// App.tsx's handleMessage. Components never mutate these atoms directly
// from a UI event handler except for the local-only $expandedGroupIds toggle.

export type AuditStatus =
  | 'IDLE'
  | 'RUNNING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ERROR'

export const $auditRequest = atom<RunAuditRequest | null>(null)
export const $auditStatus = atom<AuditStatus>('IDLE')
export const $auditProgress = atom<AuditProgress | null>(null)
export const $auditReport = atom<AuditReport | null>(null)

/** Local-only UI state — which deviation groups are expanded in the report. */
export const $expandedGroupIds = atom<Set<string>>(new Set())

/**
 * Id of the deviation group currently being applied (OCCURRENCE/GROUP mode),
 * or the literal 'ALL_EXACT_MATCHES' during a bulk apply. Drives the
 * disabled/spinner state of the acting button. Cleared back to null once
 * TOKEN_APPLIED is received.
 */
export const $applyInProgressId = atom<string | null>(null)

/** Most recent apply result — discriminated by `requestedMode`. */
export const $lastApplyResult = atom<ApplyTokenResult | null>(null)

/** Local "Applied ✓" marking — never re-derived from a re-scan. A group
 * lands here once it has nothing left to show (bulk/group apply, or every
 * occurrence applied one by one). `AuditReport` filters these out of the
 * visible tiers and the live coverage figures. */
export const $appliedGroupIds = atom<Set<string>>(new Set())

/** Local "occurrence removed from view" marking, keyed via `buildOccurrenceKey`.
 * Lets `AuditReport` compute live coverage inside a group that isn't fully done yet. */
export const $appliedOccurrenceKeys = atom<Set<string>>(new Set())

/**
 * Id of the deviation group currently having a token created for it (see
 * createToken.ts / DeviationGroupRow's "Create token" action). Drives the
 * create-token dialog's loading state. Cleared back to null once
 * TOKEN_CREATED is received.
 */
export const $tokenCreateInProgressId = atom<string | null>(null)

/** Most recent create-token result. */
export const $lastTokenCreateResult = atom<CreateTokenResult | null>(null)

/**
 * Active token sets for the create-token dialog's "which set?" picker.
 * `null` means "not fetched yet" (distinct from `[]`) — DeviationGroupRow
 * requests a fresh list every time the dialog opens, since a set can be
 * activated/deactivated between opens.
 */
export const $activeTokenSets = atom<TokenSetSummary[] | null>(null)

/**
 * Which candidate token is currently selected in each EXACT group's own
 * dropdown — keyed by DeviationGroup.id. Lifted out of DeviationGroupRow's
 * local state so it survives a row remount (e.g. the category-tab filter
 * reshuffling groups). This is the single source of truth, not a mirror of it.
 */
export const $selectedTokenIds = atom<Record<string, string>>({})

/** Live selection count from the Canvas — drives the Selection scope option. */
export const $selectionCount = atom<number>(0)

/** Result of the last SELECT_LAYERS_ON_CANVAS round-trip, for row feedback. */
export const $lastLayerSelection = atom<{
  requested: number
  resolved: number
  selectionApplied: boolean
} | null>(null)

// ── Actions ─────────────────────────────────────────────────────────────

/**
 * Confirms the run once Canvas responds with AUDIT_STARTED. `$auditRequest`
 * is already populated by AuditSetup before sending RUN_AUDIT, so this only
 * needs the confirmed shape estimate to seed progress.
 */
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

/** Explicit user pick — always overwrites. */
export const setSelectedTokenId = (groupId: string, tokenId: string) => {
  $selectedTokenIds.set({ ...$selectedTokenIds.get(), [groupId]: tokenId })
}

/** Row-mount default — never overwrites an existing pick (a remount, e.g.
 * from the category-tab filter reshuffling groups, must not clobber a
 * choice the user already made). */
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

/**
 * Routes a TOKEN_APPLIED result to the store: records it, and marks the
 * relevant group(s) "Applied ✓" locally when something was actually written
 * (`appliedCount > 0`), or when there was nothing left to write in the
 * first place (`isAlreadyResolved`) — a defensive fallback for the case
 * where a write actually landed on canvas but this pass still reports 0
 * applied (e.g. after Penpot's own eventual-consistency lag outlasted
 * `verifyIssuedWrites`'s retries), which would otherwise leave the group
 * stuck forever re-offering an apply action that can't do anything.
 *
 * - bulk ('ALL_EXACT_MATCHES'): every exact group that existed when the
 *   request was sent is considered done.
 * - GROUP-mode: that one group.
 * - OCCURRENCE-mode: just that occurrence, via `$appliedOccurrenceKeys` —
 *   unless it was the last remaining occurrence in its group, in which case
 *   the group itself is marked "Applied ✓" too. The originating id is read
 *   from `$applyInProgressId` before it gets cleared, so this must run
 *   before `setApplyInProgress(null)`.
 */
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
      if (group && countAppliedOccurrencesForGroup(groupId) >= group.occurrenceCount)
        markGroupApplied(groupId)
    } else
      markGroupApplied(inProgressId)

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

/**
 * Moves a group to its freshly re-matched tier after a token was created for
 * its raw value. Coverage is untouched: creating a token doesn't write
 * anything to a shape, so nothing becomes compliant until it's applied.
 */
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

/**
 * Routes a TOKEN_CREATED result to the store. The success signal is set
 * BEFORE the report patch below: the toast fires from DeviationGroupRow's
 * subscription to `$lastTokenCreateResult`, and that same row is about to
 * be unmounted by the report patch (a group changing tier), so the toast
 * must reach the still-mounted instance first.
 *
 * When the new token matched EXACT, createToken.ts already applied it to
 * every occurrence (its `applyResult`) — routed through the same
 * `applyTokenApplied` pipeline a manual apply uses, so the group is marked
 * "Applied ✓" instead of sitting there newly-EXACT and unapplied.
 */
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
