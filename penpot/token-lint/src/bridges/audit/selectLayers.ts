import { selectShapesOnCanvas } from '../../canvas/selection/selectShapes'

/** SELECT_LAYERS_ON_CANVAS handler — wraps canvas/selection/selectShapes.ts. */
export const selectLayers = (shapeIds: string[]): void => {
  try {
    const { resolved, selectionApplied } = selectShapesOnCanvas(shapeIds)
    penpot.ui.sendMessage({
      type: 'LAYERS_SELECTED',
      data: { requested: shapeIds.length, resolved, selectionApplied },
    })
  } catch (error) {
    penpot.ui.sendMessage({
      type: 'POST_MESSAGE',
      data: {
        type: 'ERROR',
        message: error instanceof Error ? error.message : String(error),
      },
    })
  }
}
