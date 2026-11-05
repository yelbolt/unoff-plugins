import { collectStatus, warmTarget } from '../../canvas/annotations/status'
import { updateDocumentations as run } from '../../canvas/annotations/run'
import { refreshContracts } from '../../canvas/annotations/contract'
import { surfaceError } from './surfaceError'
import { getSelection } from './getSelection'
import type { UpdateDocumentationsData } from '../../app/types/annotations'

/**
 * Pushes DOCUMENTATIONS_STATUS_CHANGED. Used by GET_DOCUMENTATIONS_STATUS,
 * the penpot 'contentsave' / 'pagechange' listeners and after generate/update.
 * Fired by listeners: log instead of surfacing, so a persistent failure does
 * not raise a notification on every save.
 */
export const pushDocumentationsStatus = (): void => {
  try {
    // Contract freshness first (flags outdated ones, or rewrites them when the
    // designer opted in), so the pushed status already reflects it.
    try {
      refreshContracts()
    } catch (error) {
      console.error('[component-handoff] contract refresh failed', error)
    }
    penpot.ui.sendMessage({
      type: 'DOCUMENTATIONS_STATUS_CHANGED',
      data: collectStatus(),
    })
  } catch (error) {
    console.error('[component-handoff] documentations status failed', error)
  }
}

export const getDocumentationsStatus = (): void => pushDocumentationsStatus()

/**
 * contentsave fires after every save: bursts collapse into one check, and the
 * check computes one target's fingerprint per tick before pushing (from the
 * cache), so Penpot gets the hand back between targets instead of freezing
 * for the whole page. A newer save restarts the run.
 */
let timer: ReturnType<typeof setTimeout> | undefined
let refreshRun = 0
export const pushStatusDebounced = (delay = 1000): void => {
  if (typeof setTimeout !== 'function') {
    pushDocumentationsStatus()
    return
  }
  if (timer !== undefined) clearTimeout(timer)
  const current = ++refreshRun
  const step = (index: number) => {
    if (current !== refreshRun) return
    let more = false
    try {
      more = warmTarget(index)
    } catch (error) {
      console.error('[component-handoff] status warm-up failed', error)
    }
    if (more) timer = setTimeout(() => step(index + 1), 0)
    else {
      timer = undefined
      pushDocumentationsStatus()
    }
  }
  timer = setTimeout(() => step(0), delay)
}

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
