import globalConfig from '../../global.config'
import { runAudit as runAuditOnCanvas } from '../../canvas/audit/runAudit'
import type { RunAuditRequest } from '../../app/types/audit'

// Module-scope cancellation flag — owned here, flipped by
// bridges/audit/cancelAudit.ts (the CANCEL_AUDIT handler). The canvas-layer
// orchestrator (canvas/audit/runAudit.ts) has no cancellation state of its
// own; it only reads `isCancelled()` at the top of every chunk.
let cancelled = false

export const setAuditCancelled = (): void => {
  cancelled = true
}

/**
 * RUN_AUDIT is the one action in loadUI.ts that sends MULTIPLE replies over
 * time: AUDIT_STARTED -> repeated SHAPES_SCANNED -> AUDIT_COMPLETED (or
 * AUDIT_CANCELLED). Errors are caught and surfaced via POST_MESSAGE — never
 * thrown, per this repo's error-handling convention (Canvas handlers must
 * not throw, or the plugin sandbox crashes).
 */
export const runAudit = async (request: RunAuditRequest): Promise<void> => {
  cancelled = false

  // The real shape count is only known once traversal finishes inside
  // canvas/audit/runAudit.ts — announcing it here would mean traversing
  // twice. AUDIT_STARTED announces 0; the first SHAPES_SCANNED message
  // carries the real totalShapesEstimate.
  penpot.ui.sendMessage({
    type: 'AUDIT_STARTED',
    data: { totalShapesEstimate: 0 },
  })

  try {
    const result = await runAuditOnCanvas(request, {
      isCancelled: () => cancelled,
      chunkSize: globalConfig.limits.auditChunkSize,
      progressIntervalMs: globalConfig.limits.auditProgressIntervalMs,
      onProgress: (progress) => {
        penpot.ui.sendMessage({ type: 'SHAPES_SCANNED', data: progress })
      },
    })

    if (result.status === 'cancelled') {
      penpot.ui.sendMessage({
        type: 'AUDIT_CANCELLED',
        data: { partial: true, scannedShapes: result.scannedShapes },
      })
      return
    }

    penpot.ui.sendMessage({ type: 'AUDIT_COMPLETED', data: result.report })
  } catch (error) {
    penpot.ui.sendMessage({
      type: 'POST_MESSAGE',
      data: {
        type: 'ERROR',
        message: error instanceof Error ? error.message : String(error),
      },
    })
  }
}
