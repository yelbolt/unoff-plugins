import type { TokenCategory, MatchedToken } from './tokens'

export type AuditScopeKind = 'SELECTION' | 'PAGE' | 'DOCUMENT'

export interface AuditScope {
  kind: AuditScopeKind
}

export interface AuditOptions {
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

/** A deviation inside a component is counted once, on the main component; `INSTANCE_OVERRIDE` only when genuinely overridden. */
export type OccurrenceOwnership =
  'MAIN_COMPONENT' | 'STANDALONE' | 'INSTANCE_OVERRIDE'

export interface AuditOccurrence {
  shapeId: string
  shapeName: string
  propertyPath: string // e.g. 'fills[0].fillColor', 'flexLayout.rowGap'
  ownership: OccurrenceOwnership
  componentMainId?: string // only when ownership === 'INSTANCE_OVERRIDE'
  isHidden: boolean
  isLocked: boolean
  isOffBoard: boolean
}

export interface DeviationGroup {
  /** Stable hash of (category + normalizedValue), reproducible across runs. */
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
  /** 0 if auditableProperties is 0. */
  coverageRate: number
  byCategory: Record<
    TokenCategory,
    { auditable: number; compliant: number; coverageRate: number }
  >
}

export interface AuditReport {
  /** Differs run to run, unlike DeviationGroup.id. */
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

/** 'ALL_EXACT_MATCHES' covers only unambiguous exact groups; ties are resolved one at a time via GROUP/OCCURRENCE. */
export type ApplyMode = 'OCCURRENCE' | 'GROUP' | 'ALL_EXACT_MATCHES'

export interface ApplyTokenRequest {
  mode: ApplyMode
  tokenId?: string // omitted for ALL_EXACT_MATCHES (resolved per group)
  deviationGroupId?: string // required for OCCURRENCE/GROUP
  occurrenceShapeId?: string // OCCURRENCE only
  propertyPath?: string // OCCURRENCE only
  scope: AuditScope // re-declared so Canvas re-validates before writing
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
  /** Must equal appliedCount + skipped.length; announced before writing. */
  announcedCount: number
  appliedCount: number
  skipped: ApplySkippedItem[]
  tokenApplied?: { tokenId: string; tokenName: string }
  undoEntryCreated: boolean
}

/** For NEAR/ORPHAN groups; adds a token to a set and never touches a shape. */
export interface CreateTokenRequest {
  groupId: string
  category: TokenCategory
  rawValue: string | number
  /** One of the group's occurrence propertyPaths, used to pick the Penpot TokenType. */
  propertyPathHint: string
  name: string
  /** Canvas re-validates that the set is still active. */
  setId: string
  // re-declared so Canvas can re-gather occurrences if the new token matches EXACT
  scope: AuditScope
  categories: TokenCategory[]
  options: AuditOptions
}

export type CreateTokenFailureReason =
  'NO_ACTIVE_SET' | 'NAME_ALREADY_EXISTS' | 'CREATE_FAILED'

export interface CreateTokenResult {
  groupId: string
  success: boolean
  reason?: CreateTokenFailureReason
  token?: { tokenId: string; tokenName: string; setName: string }
  /** Fresh match of rawValue against the index; success only. */
  tier?: DeviationTier
  candidateTokens?: MatchedToken[]
  /** Present only when the new token matched EXACT and was applied to every occurrence. */
  applyResult?: ApplyTokenResult
}
