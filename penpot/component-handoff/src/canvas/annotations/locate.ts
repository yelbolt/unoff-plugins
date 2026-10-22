import { findDocumentationById } from './layer'
import { boundsRect } from './geometry'

// Selects a documentation and brings it into view. Returns false when no
// documentation has this id on the current page.
export const locateDocumentation = (docId: string): boolean => {
  const group = findDocumentationById(docId)
  if (!group) return false
  penpot.selection = [group]
  try {
    penpot.viewport.zoomIntoView([group])
  } catch {
    const b = boundsRect(group)
    penpot.viewport.center = { x: b.x + b.w / 2, y: b.y + b.h / 2 }
  }
  return true
}
