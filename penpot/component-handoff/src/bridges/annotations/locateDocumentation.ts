import { locateDocumentation as run } from '../../canvas/annotations/locate'
import { surfaceError } from './surfaceError'
import { pushDocumentationsStatus } from './documentationsStatus'
import type { LocateDocumentationData } from '../../app/types/annotations'

// LOCATE_DOCUMENTATION -> no reply. The selection change pushes
// SELECTION_CHANGED. A documentation that is gone surfaces nothing: the list
// is simply refreshed (DOCUMENTATIONS_STATUS_CHANGED).
export const locateDocumentation = (data: LocateDocumentationData): void => {
  try {
    if (!run(String(data?.docId ?? ''))) pushDocumentationsStatus()
  } catch (error) {
    surfaceError(error)
  }
}
