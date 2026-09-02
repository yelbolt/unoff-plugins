import { resolveScope } from '../traversal/select'
import { isPropertyTokenBound } from '../tokens/readAppliedToken'
import { buildResolvedIndex } from '../tokens/buildResolvedIndex'
import { matchValue } from './matchValue'
import { buildReport, type OccurrenceInput } from './buildReport'
import {
  collectAuditableProperties,
  type RawOccurrenceCandidate,
} from './auditableProperties'
import type { Shape } from '@penpot/plugin-types'
import type { TokenCategory } from '../../app/types/tokens'
import type {
  AuditProgress,
  AuditReport,
  RunAuditRequest,
} from '../../app/types/audit'

export interface RunAuditCallbacks {
  onProgress: (progress: AuditProgress) => void
  isCancelled: () => boolean
  chunkSize: number
  progressIntervalMs: number
}

export type RunAuditResult =
  | { status: 'completed'; report: AuditReport }
  | { status: 'cancelled'; scannedShapes: number }

const zeroByCategory = (): Record<TokenCategory, number> => ({
  color: 0,
  spacing: 0,
  radius: 0,
  typography: 0,
  dimension: 0,
})

// Exported — bridges/audit/applyTokens.ts reuses this exact compliance
// check both to skip already-compliant properties and to verify a write
// actually took.
export const isCandidateCompliant = (
  shape: Shape,
  candidate: RawOccurrenceCandidate
): boolean => {
  // Empty tokenProperties (currently only `lineHeight`) means there's no
  // discrete TokenProperty to check — never counted compliant.
  if (candidate.tokenProperties.length === 0) return false
  return candidate.tokenProperties.every((property) =>
    isPropertyTokenBound(shape, property)
  )
}

/**
 * Orchestrates the audit: traversal (Select) -> resolved-value index ->
 * per-shape property enumeration -> compliance check -> value matching ->
 * report. Chunks the shape list via setTimeout(fn, 0) so a large document
 * stays interruptible, checking `callbacks.isCancelled()` at the top of
 * every chunk. The cancellation flag itself lives in bridges/audit/runAudit.ts,
 * flipped by CANCEL_AUDIT.
 */
export const runAudit = (
  request: RunAuditRequest,
  callbacks: RunAuditCallbacks
): Promise<RunAuditResult> =>
  new Promise((resolve) => {
    const startedAt = Date.now()
    const { included, excludedCount } = resolveScope(request.scope, request.options)
    const index = buildResolvedIndex()

    const occurrences: OccurrenceInput[] = []
    const auditableByCategory = zeroByCategory()
    const compliantByCategory = zeroByCategory()

    // Temporary debug instrumentation — logs a small, capped sample of raw
    // vs. matched-token values to devtools. TODO: remove once the matching/
    // compliance pipeline is confirmed reliable against a real document.
    const MAX_SAMPLE_LOGS = 8
    let sampleLogsEmitted = 0

    let cursor = 0
    let scannedShapes = 0
    let lastProgressAt = startedAt

    const processChunk = (): void => {
      if (callbacks.isCancelled()) {
        resolve({ status: 'cancelled', scannedShapes })
        return
      }

      const end = Math.min(cursor + callbacks.chunkSize, included.length)
      for (; cursor < end; cursor++) {
        const traversed = included[cursor]
        const candidates = collectAuditableProperties(traversed, request.categories)

        for (const candidate of candidates) {
          auditableByCategory[candidate.category]++

          const isCompliant = isCandidateCompliant(traversed.shape, candidate)
          if (isCompliant) compliantByCategory[candidate.category]++

          const match = isCompliant
            ? undefined
            : matchValue(candidate.rawValue, candidate.category, index)

          if (match)
            occurrences.push({
              shapeId: candidate.shapeId,
              shapeName: candidate.shapeName,
              propertyPath: candidate.propertyPath,
              category: candidate.category,
              rawValue: candidate.rawValue,
              tier: match.tier,
              candidateTokens: match.candidateTokens,
              ownership: candidate.ownership,
              componentMainId: candidate.componentMainId,
              isHidden: candidate.isHidden,
              isLocked: candidate.isLocked,
              isOffBoard: candidate.isOffBoard,
            })

          if (sampleLogsEmitted < MAX_SAMPLE_LOGS) {
            sampleLogsEmitted++
            console.debug('[token-lint] sample candidate:', {
              shape: traversed.shape.name,
              property: candidate.propertyPath,
              category: candidate.category,
              rawValue: candidate.rawValue,
              rawValueTypeof: typeof candidate.rawValue,
              tokenProperties: candidate.tokenProperties,
              'shape.tokens': traversed.shape.tokens,
              isCompliant,
              tier: match?.tier,
              candidateTokens: match?.candidateTokens.map((t) => ({
                tokenName: t.tokenName,
                resolvedValue: t.resolvedValue,
                resolvedValueTypeof: typeof t.resolvedValue,
                residual: t.residual,
              })),
            })
          }
        }

        scannedShapes++
      }

      const now = Date.now()
      const isDone = cursor >= included.length
      if (now - lastProgressAt >= callbacks.progressIntervalMs || isDone) {
        callbacks.onProgress({
          scannedShapes,
          totalShapesEstimate: included.length,
          deviationsFoundSoFar: occurrences.length,
          elapsedMs: now - startedAt,
        })
        lastProgressAt = now
      }

      if (!isDone) {
        setTimeout(processChunk, 0)
        return
      }

      const report = buildReport({
        scope: request.scope,
        categories: request.categories,
        options: request.options,
        occurrences,
        auditableByCategory,
        compliantByCategory,
        totalShapesScanned: scannedShapes,
        totalShapesSkipped: excludedCount,
        durationMs: now - startedAt,
      })

      // Temporary debug instrumentation — see the MAX_SAMPLE_LOGS comment above.
      console.debug('[token-lint] audit summary:', {
        scannedShapes,
        excludedCount,
        auditableByCategory,
        compliantByCategory,
        deviationsByTier: {
          exact: occurrences.filter((o) => o.tier === 'EXACT').length,
          near: occurrences.filter((o) => o.tier === 'NEAR').length,
          orphan: occurrences.filter((o) => o.tier === 'ORPHAN').length,
        },
      })

      resolve({ status: 'completed', report })
    }

    processChunk()
  })
