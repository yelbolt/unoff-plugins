import type { Page, Shape } from '@penpot/plugin-types'

export interface SelectShapesResult {
  resolved: number
  selectionApplied: boolean
}

interface ResolvedShape {
  shape: Shape
  page: Page
}

const findShapeById = (id: string): ResolvedShape | null => {
  const currentPage = penpot.currentPage
  const onCurrentPage = currentPage?.getShapeById(id)
  if (onCurrentPage && currentPage) return { shape: onCurrentPage, page: currentPage }
  // A DOCUMENT-scope audit report can reference shapes on other pages, and a
  // MAIN_COMPONENT occurrence's shapeId can point at the component's main
  // definition, which often lives on a page other than the one currently
  // open — fall back to searching every page in the file.
  for (const page of penpot.currentFile?.pages ?? []) {
    const found = page.getShapeById(id)
    if (found) return { shape: found, page }
  }
  return null
}

/**
 * Resolves ids -> Shape[] and selects them on canvas. `penpot.selection`
 * and `viewport.zoomIntoView` only act on the currently active page, so a
 * resolved shape living on another page (see findShapeById) must switch
 * `penpot.currentPage` there first — otherwise the assignment silently
 * no-ops and the viewport zooms to coordinates that belong to a different,
 * unopened page, which looks like it jumped into empty space. Resolved
 * shapes are grouped by page and only the largest group is selected; a
 * request spanning several pages can't be selected as one set.
 */
export const selectShapesOnCanvas = async (
  shapeIds: string[]
): Promise<SelectShapesResult> => {
  const resolved: ResolvedShape[] = []
  for (const id of shapeIds) {
    const found = findShapeById(id)
    if (found) resolved.push(found)
  }

  if (resolved.length === 0) return { resolved: 0, selectionApplied: false }

  const byPage = new Map<string, { page: Page; shapes: Shape[] }>()
  for (const { shape, page } of resolved) {
    const entry = byPage.get(page.id)
    if (entry) entry.shapes.push(shape)
    else byPage.set(page.id, { page, shapes: [shape] })
  }

  const target = Array.from(byPage.values()).sort(
    (a, b) => b.shapes.length - a.shapes.length
  )[0]

  if (penpot.currentPage?.id !== target.page.id)
    await penpot.openPage(target.page)

  let selectionApplied = false
  try {
    penpot.selection = target.shapes
    const currentIds = new Set(penpot.selection.map((s) => s.id))
    selectionApplied =
      currentIds.size === target.shapes.length &&
      target.shapes.every((s) => currentIds.has(s.id))
  } catch {
    selectionApplied = false
  }

  penpot.viewport.zoomIntoView(target.shapes)

  return { resolved: resolved.length, selectionApplied }
}
