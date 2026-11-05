import { collectStatus, warmTarget } from '../../canvas/annotations/status'
import { updateDocumentations as run } from '../../canvas/annotations/run'
import { refreshContracts } from '../../canvas/annotations/contract'
import { surfaceError } from './surfaceError'
import { getSelection } from './getSelection'
import type { UpdateDocumentationsData } from '../../app/types/annotations'

/** Fired by listeners: logs instead of surfacing, so a persistent failure does not notify on every save. */
export const pushDocumentationsStatus = (): void => {
  try {
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

/** Bursts collapse into one check, one target's fingerprint per tick so Penpot is not frozen; a newer save restarts it. */
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
