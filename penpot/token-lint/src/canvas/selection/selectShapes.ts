import type { Shape } from '@penpot/plugin-types'

export interface SelectShapesResult {
  resolved: number
  selectionApplied: boolean
}

const findShapeById = (id: string): Shape | null => {
  const onCurrentPage = penpot.currentPage?.getShapeById(id)
  if (onCurrentPage) return onCurrentPage
  // A DOCUMENT-scope audit report can reference shapes on other pages —
  // fall back to searching every page in the file.
  for (const page of penpot.currentFile?.pages ?? []) {
    const found = page.getShapeById(id)
    if (found) return found
  }
  return null
}

/**
 * Resolves ids -> Shape[] and selects them on canvas. Tries direct
 * assignment to `penpot.selection` first; regardless of outcome also calls
 * `viewport.zoomIntoView` as a fallback/complement, and reports back
 * whether the assignment actually took via `selectionApplied`.
 */
export const selectShapesOnCanvas = (shapeIds: string[]): SelectShapesResult => {
  const shapes: Shape[] = []
  for (const id of shapeIds) {
    const shape = findShapeById(id)
    if (shape) shapes.push(shape)
  }

  let selectionApplied = false
  try {
    penpot.selection = shapes
    const currentIds = new Set(penpot.selection.map((s) => s.id))
    selectionApplied =
      currentIds.size === shapes.length && shapes.every((s) => currentIds.has(s.id))
  } catch {
    selectionApplied = false
  }

  if (shapes.length > 0) penpot.viewport.zoomIntoView(shapes)

  return { resolved: shapes.length, selectionApplied }
}
