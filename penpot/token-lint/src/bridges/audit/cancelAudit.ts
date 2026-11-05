import { setAuditCancelled } from './runAudit'

export const cancelAudit = (): void => {
  setAuditCancelled()
}
