import type { TokenSetSummary } from './tokens'
import type {
  RunAuditRequest,
  AuditProgress,
  AuditReport,
  ApplyTokenRequest,
  ApplyTokenResult,
  CreateTokenRequest,
  CreateTokenResult,
} from './audit'

export interface NotificationMessage {
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
  message: string
  timer?: number
}

export interface PluginMessageData {
  type: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
}

// UI -> Canvas is VERB_NOUN, Canvas -> UI is NOUN_PAST_TENSE.
// A new action also needs a bridge function in src/bridges/audit/ and an actions-map key in src/bridges/loadUI.ts.

export type UIMessage =
  | { type: 'RUN_AUDIT'; data: RunAuditRequest }
  | { type: 'CANCEL_AUDIT' }
  | { type: 'SELECT_LAYERS_ON_CANVAS'; data: { shapeIds: string[] } }
  | { type: 'APPLY_TOKEN'; data: ApplyTokenRequest } // mode: 'OCCURRENCE'
  | { type: 'APPLY_TOKEN_GROUP'; data: ApplyTokenRequest } // mode: 'GROUP'
  | { type: 'APPLY_ALL_EXACT_MATCHES'; data: ApplyTokenRequest } // mode: 'ALL_EXACT_MATCHES'
  | { type: 'CREATE_TOKEN'; data: CreateTokenRequest }
  | { type: 'GET_ACTIVE_TOKEN_SETS' }

export type CanvasMessage =
  | { type: 'AUDIT_STARTED'; data: { totalShapesEstimate: number } }
  | { type: 'SHAPES_SCANNED'; data: AuditProgress } // repeated, throttled
  | { type: 'AUDIT_COMPLETED'; data: AuditReport }
  | { type: 'AUDIT_CANCELLED'; data: { partial: true; scannedShapes: number } }
  | {
      type: 'LAYERS_SELECTED'
      data: { requested: number; resolved: number; selectionApplied: boolean }
    }
  | { type: 'TOKEN_APPLIED'; data: ApplyTokenResult }
  | { type: 'TOKEN_CREATED'; data: CreateTokenResult }
  | { type: 'ACTIVE_TOKEN_SETS_LISTED'; data: { sets: TokenSetSummary[] } }
  | { type: 'SELECTION_CHANGED'; data: { count: number } }
