import globalConfig from '../../global.config'
import { runAudit as runAuditOnCanvas } from '../../canvas/audit/runAudit'
import type { RunAuditRequest } from '../../app/types/audit'

let cancelled = false

export const setAuditCancelled = (): void => {
  cancelled = true
}

/** Never throws: a throwing Canvas handler crashes the plugin sandbox. */
export const runAudit = async (request: RunAuditRequest): Promise<void> => {
  cancelled = false

  // Real count is only known after traversal: 0 here, the first SHAPES_SCANNED carries it.
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
