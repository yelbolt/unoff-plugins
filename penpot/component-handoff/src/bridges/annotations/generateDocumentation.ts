import { generateDocumentation as run } from '../../canvas/annotations/run'
import { surfaceError } from './surfaceError'
import { getSelection } from './getSelection'
import { pushDocumentationsStatus } from './documentationsStatus'
import type { GenerateDocumentationData } from '../../app/types/annotations'

// GENERATE_DOCUMENTATION -> ANNOTATION_APPLIED | ANNOTATION_REFUSED
// (then DOCUMENTATIONS_STATUS_CHANGED and SELECTION_CHANGED)
export const generateDocumentation = (
  data: GenerateDocumentationData
): void => {
  try {
    const outcome = run(data)
    if ('applied' in outcome)
      penpot.ui.sendMessage({
        type: 'ANNOTATION_APPLIED',
        data: outcome.applied,
      })
    else
      penpot.ui.sendMessage({
        type: 'ANNOTATION_REFUSED',
        data: outcome.refused,
      })
    // annotatedCount and freshness changed.
    getSelection()
    pushDocumentationsStatus()
  } catch (error) {
    surfaceError(error)
  }
}
