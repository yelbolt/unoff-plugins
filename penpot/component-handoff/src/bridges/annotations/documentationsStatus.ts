import { collectStatus } from '../../canvas/annotations/status'
import { updateDocumentations as run } from '../../canvas/annotations/run'
import { surfaceError } from './surfaceError'
import { getSelection } from './getSelection'
import type { UpdateDocumentationsData } from '../../app/types/annotations'

// Pushes DOCUMENTATIONS_STATUS_CHANGED. Used by GET_DOCUMENTATIONS_STATUS,
// the penpot 'contentsave' / 'pagechange' listeners and after generate/update.
// Fired by listeners: log instead of surfacing, so a persistent failure does
// not raise a notification on every save.
export const pushDocumentationsStatus = (): void => {
  try {
    penpot.ui.sendMessage({
      type: 'DOCUMENTATIONS_STATUS_CHANGED',
      data: collectStatus(),
    })
  } catch (error) {
    console.error('[component-handoff] documentations status failed', error)
  }
}

// GET_DOCUMENTATIONS_STATUS -> DOCUMENTATIONS_STATUS_CHANGED
export const getDocumentationsStatus = (): void => pushDocumentationsStatus()

// contentsave fires after every save: collapse bursts into one check.
let timer: ReturnType<typeof setTimeout> | undefined
export const pushStatusDebounced = (delay = 500): void => {
  if (typeof setTimeout !== 'function') {
    pushDocumentationsStatus()
    return
  }
  if (timer !== undefined) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = undefined
    pushDocumentationsStatus()
  }, delay)
}

// UPDATE_DOCUMENTATIONS -> DOCUMENTATIONS_UPDATED | ANNOTATION_REFUSED
// (then DOCUMENTATIONS_STATUS_CHANGED and SELECTION_CHANGED)
export const updateDocumentations = (data: UpdateDocumentationsData): void => {
  try {
    const outcome = run(data)
    if ('updated' in outcome)
      penpot.ui.sendMessage({
        type: 'DOCUMENTATIONS_UPDATED',
        data: outcome.updated,
      })
    else
      penpot.ui.sendMessage({
        type: 'ANNOTATION_REFUSED',
        data: outcome.refused,
      })
    pushDocumentationsStatus()
    getSelection()
  } catch (error) {
    surfaceError(error)
    // Part of the batch may have been updated before the failure.
    pushDocumentationsStatus()
  }
}
