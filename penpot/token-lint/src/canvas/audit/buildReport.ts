import type { MatchedToken, TokenCategory } from '../../app/types/tokens'
import type {
  AuditOccurrence,
  AuditOptions,
  AuditReport,
  AuditScope,
  CoverageSummary,
  DeviationGroup,
  DeviationTier,
  OccurrenceOwnership,
} from '../../app/types/audit'

const ALL_CATEGORIES: TokenCategory[] = [
  'color',
  'spacing',
  'radius',
  'typography',
  'dimension',
]

/** One already-matched deviation, ready to be grouped into an AuditReport. */
export interface OccurrenceInput {
  shapeId: string
  shapeName: string
  propertyPath: string
  category: TokenCategory
  rawValue: string | number
  tier: DeviationTier
  candidateTokens: MatchedToken[]
  ownership: OccurrenceOwnership
  componentMainId?: string
  isHidden: boolean
  isLocked: boolean
  isOffBoard: boolean
}

export interface BuildReportInput {
  scope: AuditScope
  categories: TokenCategory[]
  options: AuditOptions
  /** Non-compliant occurrences only — compliant properties never reach here. */
  occurrences: OccurrenceInput[]
  auditableByCategory: Record<TokenCategory, number>
  compliantByCategory: Record<TokenCategory, number>
  totalShapesScanned: number
  totalShapesSkipped: number
  durationMs: number
}

// Small, deterministic, non-cryptographic string hash (FNV-1a) — gives
// DeviationGroup.id its "reproducible across runs" property without
// pulling in a hashing dependency. Exported so applyTokens.ts can recompute
// the same group key at apply time without round-tripping the full report.
export const stableHash = (input: string): string => {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16)
}

export const normalizeValue = (value: string | number): string =>
  typeof value === 'string' ? value.toLowerCase() : String(value)

export const groupKey = (category: TokenCategory, value: string | number): string =>
  `${category}::${normalizeValue(value)}`

const emptyCoverageByCategory = (): CoverageSummary['byCategory'] => ({
  color: { auditable: 0, compliant: 0, coverageRate: 0 },
  spacing: { auditable: 0, compliant: 0, coverageRate: 0 },
  radius: { auditable: 0, compliant: 0, coverageRate: 0 },
  typography: { auditable: 0, compliant: 0, coverageRate: 0 },
  dimension: { auditable: 0, compliant: 0, coverageRate: 0 },
})

const rate = (compliant: number, auditable: number): number =>
  auditable === 0 ? 0 : compliant / auditable

/**
 * Pure function: occurrences[] -> AuditReport. No `penpot.*` calls. Deviations
 * are always grouped by value, never listed layer by layer; a
 * DeviationGroup's id/tier/candidateTokens are fully determined by
 * (category, rawValue).
 */
export const buildReport = (input: BuildReportInput): AuditReport => {
  const groups = new Map<string, DeviationGroup>()
  // Defensive dedupe insurance against two RawOccurrenceCandidate entries
  // with the identical (shapeId, propertyPath) pair — cheap insurance, not
  // a fix for a live bug. Must NOT collapse the same shape having two
  // DIFFERENT properties (e.g. fills[0] and fills[1]) matching the same
  // rawValue+category — those keep distinct propertyPaths.
  const seenOccurrenceKeys = new Set<string>()

  for (const occ of input.occurrences) {
    const key = groupKey(occ.category, occ.rawValue)
    let group = groups.get(key)

    if (!group) {
      group = {
        id: stableHash(key),
        category: occ.category,
        rawValue: occ.rawValue,
        tier: occ.tier,
        candidateTokens: occ.candidateTokens,
        occurrenceCount: 0,
        occurrences: [],
        mainComponentCount: 0,
        instanceOverrideCount: 0,
      }
      groups.set(key, group)
    }

    const occurrenceKey = `${key}::${occ.shapeId}::${occ.propertyPath}`
    if (seenOccurrenceKeys.has(occurrenceKey)) continue
    seenOccurrenceKeys.add(occurrenceKey)

    const occurrence: AuditOccurrence = {
      shapeId: occ.shapeId,
      shapeName: occ.shapeName,
      propertyPath: occ.propertyPath,
      ownership: occ.ownership,
      componentMainId: occ.componentMainId,
      isHidden: occ.isHidden,
      isLocked: occ.isLocked,
      isOffBoard: occ.isOffBoard,
    }

    group.occurrences.push(occurrence)
    group.occurrenceCount++
    if (occ.ownership === 'MAIN_COMPONENT') group.mainComponentCount++
    if (occ.ownership === 'INSTANCE_OVERRIDE') group.instanceOverrideCount++
  }

  // Priority list: exact first, near next, orphan last; within a tier,
  // biggest-impact-first (most occurrences = cheapest win).
  const allGroups = Array.from(groups.values()).sort(
    (a, b) => b.occurrenceCount - a.occurrenceCount
  )
  const exact = allGroups.filter((g) => g.tier === 'EXACT')
  const near = allGroups.filter((g) => g.tier === 'NEAR')
  const orphan = allGroups.filter((g) => g.tier === 'ORPHAN')

  const byCategory = emptyCoverageByCategory()
  let totalAuditable = 0
  let totalCompliant = 0

  for (const category of ALL_CATEGORIES) {
    const auditable = input.auditableByCategory[category] ?? 0
    const compliant = input.compliantByCategory[category] ?? 0
    byCategory[category] = { auditable, compliant, coverageRate: rate(compliant, auditable) }
    totalAuditable += auditable
    totalCompliant += compliant
  }

  const coverage: CoverageSummary = {
    auditableProperties: totalAuditable,
    compliantProperties: totalCompliant,
    coverageRate: rate(totalCompliant, totalAuditable),
    byCategory,
  }

  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    runAt: Date.now(),
    scope: input.scope,
    categories: input.categories,
    options: input.options,
    coverage,
    tiers: { exact, near, orphan },
    stats: {
      totalAuditableProperties: totalAuditable,
      totalShapesScanned: input.totalShapesScanned,
      totalShapesSkipped: input.totalShapesSkipped,
      durationMs: input.durationMs,
    },
  }
}
