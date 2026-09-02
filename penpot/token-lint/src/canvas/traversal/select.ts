import type { Shape } from '@penpot/plugin-types'
import type {
  AuditOptions,
  AuditScope,
  OccurrenceOwnership,
} from '../../app/types/audit'

// Canvas-internal traversal layer — "Select". Meant to be reused by every
// heavy consumer in this plugin; the audit pass is currently its only caller.

export interface TraversedShape {
  shape: Shape
  isHidden: boolean
  isLocked: boolean
  isOffBoard: boolean
  /**
   * Coarse, shape-level ownership signal. For component *copy* instances
   * this is a tentative 'INSTANCE_OVERRIDE' — it does NOT by itself mean a
   * property is overridden; auditableProperties.ts compares each property
   * against `componentRefShape` and only treats it as a deviation when the
   * two differ. MAIN_COMPONENT / STANDALONE need no such check.
   */
  ownership: OccurrenceOwnership
  /** Set only when ownership === 'INSTANCE_OVERRIDE'. */
  componentRefShape: Shape | null
}

export interface ScopeResolution {
  included: TraversedShape[]
  excludedCount: number
  totalTraversed: number
}

const hasBoardAncestor = (shape: Shape): boolean => {
  let current = shape.parent
  while (current) {
    if (current.parent === null) return false
    if (penpot.utils.types.isBoard(current)) return true
    current = current.parent
  }
  return false
}

const getChildren = (shape: Shape): Shape[] => {
  if (penpot.utils.types.isBoard(shape)) return shape.children
  if (penpot.utils.types.isGroup(shape)) return shape.children
  if (penpot.utils.types.isBool(shape)) return shape.children
  return []
}

const describeShape = (shape: Shape): TraversedShape => {
  const isLocked = shape.blocked
  const isHidden = shape.hidden || !shape.visible
  const isOffBoard = !hasBoardAncestor(shape)

  if (shape.isComponentMainInstance())
    return {
      shape,
      isHidden,
      isLocked,
      isOffBoard,
      ownership: 'MAIN_COMPONENT',
      componentRefShape: null,
    }

  if (shape.isComponentCopyInstance())
    return {
      shape,
      isHidden,
      isLocked,
      isOffBoard,
      ownership: 'INSTANCE_OVERRIDE',
      componentRefShape: shape.componentRefShape(),
    }

  return {
    shape,
    isHidden,
    isLocked,
    isOffBoard,
    ownership: 'STANDALONE',
    componentRefShape: null,
  }
}

const walk = (
  shape: Shape,
  result: TraversedShape[],
  seen: Set<string>
): void => {
  if (seen.has(shape.id)) return
  seen.add(shape.id)
  result.push(describeShape(shape))
  for (const child of getChildren(shape)) walk(child, result, seen)
}

const walkChildrenOnly = (
  shape: Shape,
  result: TraversedShape[],
  seen: Set<string>
): void => {
  for (const child of getChildren(shape)) walk(child, result, seen)
}

const traverseScope = (scope: AuditScope): TraversedShape[] => {
  const result: TraversedShape[] = []
  const seen = new Set<string>()

  if (scope.kind === 'SELECTION') {
    for (const shape of penpot.selection) walk(shape, result, seen)
    return result
  }

  if (scope.kind === 'PAGE') {
    if (penpot.currentPage) walkChildrenOnly(penpot.currentPage.root, result, seen)
    return result
  }

  // DOCUMENT
  const pages = penpot.currentFile?.pages ?? []
  for (const page of pages) walkChildrenOnly(page.root, result, seen)
  return result
}

/**
 * Resolves an AuditScope to the flat list of shapes to audit, applying the
 * hidden/locked/off-board exclusions from AuditOptions. Excluded elements
 * are still traversed (so counts stay reproducible) and only dropped from
 * `included`.
 */
export const resolveScope = (
  scope: AuditScope,
  options: AuditOptions
): ScopeResolution => {
  const all = traverseScope(scope)
  const included: TraversedShape[] = []
  let excludedCount = 0

  for (const traversed of all) {
    const exclude =
      (options.excludeHidden && traversed.isHidden) ||
      (options.excludeLocked && traversed.isLocked) ||
      (options.excludeOffBoard && traversed.isOffBoard)

    if (exclude) excludedCount++
    else included.push(traversed)
  }

  return { included, excludedCount, totalTraversed: all.length }
}
