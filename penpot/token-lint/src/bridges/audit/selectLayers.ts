import { selectShapesOnCanvas } from '../../canvas/selection/selectShapes'

export const selectLayers = async (shapeIds: string[]): Promise<void> => {
  try {
    const { resolved, selectionApplied } = await selectShapesOnCanvas(shapeIds)
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
