// Domain types for the audit run and its report — the "Audit + Apply" core
// flow (see specs/token-list-audit-and-application.md).

import type { TokenCategory, MatchedToken } from './tokens'

export type AuditScopeKind = 'SELECTION' | 'PAGE' | 'DOCUMENT'

export interface AuditScope {
  kind: AuditScopeKind
}

export interface AuditOptions {
  /** Hidden/locked/off-board elements are counted by default — spec rule. */
  excludeHidden: boolean
  excludeLocked: boolean
  excludeOffBoard: boolean
}

export interface RunAuditRequest {
  scope: AuditScope
  categories: TokenCategory[]
  options: AuditOptions
}

export interface AuditProgress {
  scannedShapes: number
  totalShapesEstimate: number
  deviationsFoundSoFar: number
  elapsedMs: number
}

export type DeviationTier = 'EXACT' | 'NEAR' | 'ORPHAN'

/**
 * A deviation inside a component is counted once, on the main component.
 * `INSTANCE_OVERRIDE` only appears when a property is genuinely overridden
 * on that instance, not merely inherited.
 */
export type OccurrenceOwnership =
  | 'MAIN_COMPONENT'
  | 'STANDALONE'
  | 'INSTANCE_OVERRIDE'

export interface AuditOccurrence {
  shapeId: string
  shapeName: string
  propertyPath: string // e.g. 'fills[0].fillColor', 'flexLayout.rowGap'
  ownership: OccurrenceOwnership
  componentMainId?: string // set when ownership === 'INSTANCE_OVERRIDE'
  isHidden: boolean
  isLocked: boolean
  isOffBoard: boolean
}

export interface DeviationGroup {
  /** Stable hash of (category + normalizedValue) — reproducible across runs. */
  id: string
  category: TokenCategory
  rawValue: string | number
  tier: DeviationTier
  /** EXACT: 1+ (ties surfaced, none picked); NEAR: 1+ nearest with residual; ORPHAN: []. */
  candidateTokens: MatchedToken[]
  occurrenceCount: number
  occurrences: AuditOccurrence[]
  mainComponentCount: number
  instanceOverrideCount: number
}

export interface CoverageSummary {
  auditableProperties: number
  compliantProperties: number
  /** compliantProperties / auditableProperties, 0 if the denominator is 0. */
  coverageRate: number
  byCategory: Record<
    TokenCategory,
    { auditable: number; compliant: number; coverageRate: number }
  >
}

export interface AuditReport {
  /** Metadata only — unlike DeviationGroup.id, this MAY differ run to run. */
  id: string
  runAt: number
  scope: AuditScope
  categories: TokenCategory[]
  options: AuditOptions
  coverage: CoverageSummary
  tiers: {
    exact: DeviationGroup[]
    near: DeviationGroup[]
    orphan: DeviationGroup[]
  }
  stats: {
    totalAuditableProperties: number
    totalShapesScanned: number
    totalShapesSkipped: number // excluded by options (hidden/locked/off-board)
    durationMs: number
  }
}

/**
 * Apply is wired only for the EXACT tier — there's no code path that can
 * write a NEAR/ORPHAN match (see `ApplySkipReason.TIER_NOT_APPLICABLE`, a
 * defensive guard rather than a reachable UI action).
 *
 * 'ALL_EXACT_MATCHES' only covers *unambiguous* exact groups; ties are
 * never auto-elected but stay resolvable one at a time via GROUP/OCCURRENCE
 * once the user picks a candidate in that row's dropdown.
 */
export type ApplyMode = 'OCCURRENCE' | 'GROUP' | 'ALL_EXACT_MATCHES'

export interface ApplyTokenRequest {
  mode: ApplyMode
  tokenId?: string // required for OCCURRENCE/GROUP; omitted for ALL_EXACT_MATCHES (resolved per group)
  deviationGroupId?: string // required for OCCURRENCE/GROUP
  occurrenceShapeId?: string // OCCURRENCE only
  propertyPath?: string // OCCURRENCE only
  scope: AuditScope // re-declared so Canvas re-validates the announced scope before writing
  categories: TokenCategory[]
  options: AuditOptions
}

export type ApplySkipReason =
  | 'TYPE_INCOMPATIBLE'
  | 'AMBIGUOUS_CANDIDATES'
  | 'SHAPE_NOT_FOUND'
  | 'LOCKED'
  | 'ALREADY_APPLIED'
  | 'TIER_NOT_APPLICABLE'
  | 'WRITE_FAILED'

export interface ApplySkippedItem {
  shapeId: string
  shapeName: string
  propertyPath: string
  reason: ApplySkipReason
}

export interface ApplyTokenResult {
  requestedMode: ApplyMode
  /** Must equal appliedCount + skipped.length — announced BEFORE writing. */
  announcedCount: number
  appliedCount: number
  skipped: ApplySkippedItem[]
  tokenApplied?: { tokenId: string; tokenName: string }
  undoEntryCreated: boolean
}

/**
 * "Create a token from this deviation" — for NEAR/ORPHAN groups. Unlike
 * apply, this never touches a shape: it only adds a token to a chosen
 * active token set via Penpot's `TokenSet.addToken()`.
 */
export interface CreateTokenRequest {
  groupId: string
  category: TokenCategory
  rawValue: string | number
  /** One of this group's occurrence propertyPaths — used to pick a sensible Penpot TokenType. */
  propertyPathHint: string
  name: string
  /** The set the user picked in the dialog; canvas re-validates it's still active. */
  setId: string
  /**
   * Re-declared like ApplyTokenRequest: once the new token resolves this
   * raw value exactly, canvas immediately applies it to every occurrence in
   * the group (see createToken.ts), which needs these to re-gather them.
   */
  scope: AuditScope
  categories: TokenCategory[]
  options: AuditOptions
}

export type CreateTokenFailureReason =
  | 'NO_ACTIVE_SET'
  | 'NAME_ALREADY_EXISTS'
  | 'CREATE_FAILED'

export interface CreateTokenResult {
  groupId: string
  success: boolean
  reason?: CreateTokenFailureReason
  token?: { tokenId: string; tokenName: string; setName: string }
  /**
   * A fresh match of the same rawValue against the index now that the new
   * token exists — lets the UI move the group to its new tier immediately
   * instead of requiring a full re-audit. Present only on success.
   */
  tier?: DeviationTier
  candidateTokens?: MatchedToken[]
  /**
   * Present when the new token matched EXACT and canvas therefore applied
   * it to every occurrence in the group right away — see createToken.ts.
   * Absent for NEAR/ORPHAN results, the same way ApplyTokenRequest never
   * reaches a NEAR/ORPHAN group (TIER_NOT_APPLICABLE guards that).
   */
  applyResult?: ApplyTokenResult
}
