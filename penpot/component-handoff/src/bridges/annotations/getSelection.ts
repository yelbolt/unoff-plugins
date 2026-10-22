import { digestSelection } from '../../canvas/annotations/selection'

// GET_SELECTION and penpot 'selectionchange' -> SELECTION_CHANGED
export const getSelection = (): void => {
  try {
    penpot.ui.sendMessage({
      type: 'SELECTION_CHANGED',
      data: digestSelection(),
    })
  } catch (error) {
    // Fired on every selectionchange: log instead of surfacing, so a
    // persistent failure does not raise a notification on each click.
    console.error('[component-handoff] selection digest failed', error)
  }
}
