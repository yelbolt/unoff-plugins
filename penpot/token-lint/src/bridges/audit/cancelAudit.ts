import { setAuditCancelled } from './runAudit'

/** CANCEL_AUDIT handler — flips the module-scope flag owned by runAudit.ts. */
export const cancelAudit = (): void => {
  setAuditCancelled()
}
