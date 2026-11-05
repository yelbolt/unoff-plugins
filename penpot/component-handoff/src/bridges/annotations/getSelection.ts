import { digestSelection } from '../../canvas/annotations/selection'

export const getSelection = (): void => {
  try {
    penpot.ui.sendMessage({
      type: 'SELECTION_CHANGED',
      data: digestSelection(),
    })
  } catch (error) {
    // Fired on every selectionchange: log, do not surface.
    console.error('[component-handoff] selection digest failed', error)
  }
}
