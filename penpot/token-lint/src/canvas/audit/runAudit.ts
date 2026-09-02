import { resolveScope } from '../traversal/select'
import { isPropertyTokenBound } from '../tokens/readAppliedToken'
import { buildResolvedIndex } from '../tokens/buildResolvedIndex'
import { matchValue } from './matchValue'
import { buildReport, type OccurrenceInput } from './buildReport'
import {
  collectAuditableProperties,
  type RawOccurrenceCandidate,
} from './auditableProperties'
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

// Reused by bridges/audit/applyTokens.ts to skip already-compliant
// properties and to verify a write took.
export const isCandidateCompliant = (
  candidate: RawOccurrenceCandidate
): boolean => {
  if (candidate.tokenProperties.length === 0) return false
  return candidate.tokenProperties.every((property) =>
    isPropertyTokenBound(candidate.ownerShape, property)
  )
}

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

          const isCompliant = isCandidateCompliant(candidate)
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

      resolve({ status: 'completed', report })
    }

    processChunk()
  })
