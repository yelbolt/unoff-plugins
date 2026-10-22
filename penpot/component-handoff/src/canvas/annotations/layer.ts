import { tr } from './i18n'
import { boundsRect } from './geometry'
import { KEYS, PAGE_KEY } from './constants'
import type { Group, Page, Shape } from '@penpot/plugin-types'
import type { AnnotationKind } from '../../app/types/annotations'
import type { Rect } from './geometry'

export const currentPage = (): Page => {
  const page = penpot.currentPage
  if (!page) throw new Error('No active page')
  return page
}

export const isLayerGroup = (shape: Shape): shape is Group =>
  shape.type === 'group' && Boolean(shape.getPluginData(KEYS.layer))

// True when the shape is an annotations layer or lives inside one.
export const isAnnotationShape = (shape: Shape): boolean => {
  let current: Shape | null = shape
  while (current) {
    if (current.getPluginData(KEYS.layer)) return true
    current = current.parent
  }
  return false
}

// Top-level shape (direct child of the page root) containing `shape`.
export const topLevelOf = (shape: Shape): Shape => {
  const rootId = currentPage().root.id
  let current: Shape = shape
  while (current.parent && current.parent.id !== rootId)
    current = current.parent
  return current
}

export interface LayerKey {
  key: string // board id, or PAGE_KEY
  board: Shape | null
}

export const layerKeyFor = (shape: Shape): LayerKey => {
  const top = topLevelOf(shape)
  return top.type === 'board'
    ? { key: top.id, board: top }
    : { key: PAGE_KEY, board: null }
}

export const findLayers = (): Array<Group> =>
  ((currentPage().root as unknown as { children: Array<Shape> }).children ?? [])
    .filter(isLayerGroup)
    .map((g) => g as Group)

export const findLayer = (key: string): Group | null =>
  findLayers().find((g) => g.getPluginData(KEYS.layer) === key) ?? null

export const layerName = (board: Shape | null): string =>
  `${tr('layer.prefix')} · ${board ? board.name : tr('layer.page')}`

export const annotationsOf = (layer: Group): Array<Group> =>
  layer.children.filter(
    (c): c is Group => c.type === 'group' && Boolean(c.getPluginData(KEYS.kind))
  )

export const readTargets = (annotation: Shape): Array<string> => {
  try {
    const parsed = JSON.parse(annotation.getPluginData(KEYS.targets) || '[]')
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

export const readKind = (annotation: Shape): AnnotationKind | null =>
  (annotation.getPluginData(KEYS.kind) as AnnotationKind) || null

export const sameTargets = (a: Array<string>, b: Array<string>): boolean =>
  a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|')

export const findExisting = (
  layer: Group | null,
  kind: AnnotationKind,
  targetIds: Array<string>
): Group | null =>
  layer
    ? (annotationsOf(layer).find(
        (g) => readKind(g) === kind && sameTargets(readTargets(g), targetIds)
      ) ?? null)
    : null

// Identity lookup across every layer of the page: a documented target that
// moved to another board must still be updated, never duplicated.
export const findExistingAnywhere = (
  kind: AnnotationKind,
  targetIds: Array<string>
): Group | null => {
  for (const layer of findLayers()) {
    const hit = findExisting(layer, kind, targetIds)
    if (hit) return hit
  }
  return null
}

export const findDocumentationById = (id: string): Group | null => {
  for (const layer of findLayers()) {
    const hit = annotationsOf(layer).find((g) => g.id === id)
    if (hit) return hit
  }
  return null
}

// Rects other documentation boards occupy in the layer.
export const obstaclesOf = (
  layer: Group | null,
  excludeId?: string
): Array<Rect> => {
  if (!layer) return []
  return annotationsOf(layer)
    .filter((g) => g.id !== excludeId)
    .map((g) => boundsRect(g))
}

// Puts a freshly drawn annotation group into its board's layer, creating the
// layer (a Group at page root, directly above the board) when needed.
export const placeInLayer = (
  group: Group,
  lk: LayerKey,
  layer: Group | null
): Group => {
  if (layer) {
    layer.appendChild(group)
    return layer
  }
  const created = penpot.group([group])
  if (!created) throw new Error('Could not create the annotations layer')
  created.name = layerName(lk.board)
  created.setPluginData(KEYS.layer, lk.key)
  if (lk.board) created.setParentIndex(lk.board.parentIndex + 1)
  return created
}
