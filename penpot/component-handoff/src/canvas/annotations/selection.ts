import {
  classify,
  orderedVariantsOf,
  safe,
  variantComponentsOf,
  variantPropertiesOf,
} from './target'
import { visibleChildren } from './spacing'
import {
  annotationsOf,
  findLayers,
  isAnnotationShape,
  layerKeyFor,
  readTargets,
} from './layer'
import { isRotated } from './geometry'
import type { Shape } from '@penpot/plugin-types'
import type {
  SelectionDigest,
  SelectionItem,
} from '../../app/types/annotations'

// The root whose layers get numbered: a family shows its first variant, a
// copy its main component.
const documentedRoot = (
  s: Shape,
  c: ReturnType<typeof classify>
): Shape => {
  if (c.kind === 'FAMILY' && c.variants) {
    const first = orderedVariantsOf(c.variants, c.container)[0]
    const main = first ? safe(() => first.mainInstance()) : null
    if (main) return main
  }
  return c.main ?? s
}

const countNested = (s: Shape): number =>
  visibleChildren(s).reduce((n, k) => n + 1 + countNested(k), 0)

const toItem = (s: Shape): SelectionItem => {
  const c = classify(s)
  const root = documentedRoot(s, c)
  const variantProps =
    c.kind === 'VARIANT' || c.kind === 'COPY'
      ? safe(
          () =>
            (c.comp as unknown as { variantProps?: Record<string, string> })
              .variantProps ?? null
        )
      : null
  return {
    id: s.id,
    name: s.name,
    type: s.type,
    componentKind: c.kind,
    componentName: c.comp?.name ?? null,
    familyName: c.container?.name ?? null,
    variantProperties: c.variants ? variantPropertiesOf(c.variants) : [],
    variantCount: c.variants ? variantComponentsOf(c.variants).length : 0,
    variantValues:
      variantProps && Object.keys(variantProps).length > 0
        ? { ...variantProps }
        : null,
    familyVariants: c.variants
      ? orderedVariantsOf(c.variants, c.container).map((v) => ({
          ...(safe(() => v.variantProps) ?? {}),
        }))
      : [],
    topLevelLayers: visibleChildren(root).map((k) => k.name),
    nestedLayerCount: countNested(root),
    isRotated: isRotated(s),
    hasChildren:
      'children' in s && Array.isArray(s.children) && s.children.length > 0,
    isAnnotation: isAnnotationShape(s),
  }
}

export const digestSelection = (): SelectionDigest => {
  const selection = penpot.selection
  if (selection.length === 0)
    return {
      count: 0,
      items: [],
      boardId: null,
      boardName: null,
      annotatedCount: 0,
      containsAnnotation: false,
    }

  const first = selection[0]
  const lk = layerKeyFor(first)
  const ids = new Set(selection.map((s) => s.id))
  // A copy is documented through its main component.
  for (const s of selection.slice(0, 2)) {
    const main = classify(s).main
    if (main) ids.add(main.id)
  }
  let annotatedCount = 0
  for (const layer of findLayers())
    for (const a of annotationsOf(layer))
      if (readTargets(a).some((id) => ids.has(id))) annotatedCount++

  return {
    count: selection.length,
    items: selection.slice(0, 2).map(toItem),
    boardId: lk.board ? lk.board.id : null,
    boardName: lk.board ? lk.board.name : null,
    annotatedCount,
    containsAnnotation: selection.some(isAnnotationShape),
  }
}
