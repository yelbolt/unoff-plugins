import { generateDocumentation as run } from '../../canvas/annotations/run'
import { surfaceError } from './surfaceError'
import { getSelection } from './getSelection'
import { pushDocumentationsStatus } from './documentationsStatus'
import type { GenerateDocumentationData } from '../../app/types/annotations'

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
    getSelection()
    pushDocumentationsStatus()
  } catch (error) {
    surfaceError(error)
  }
}
