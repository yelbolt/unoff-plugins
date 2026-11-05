import {
  classify,
  orderedVariantsOf,
  safe,
  variantComponentsOf,
  variantPropertiesOf,
} from './target'
import { resolveTarget } from './target'
import { visibleChildren } from './spacing'
import { readPhase } from './memo'
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
  DocTarget,
  SelectionDigest,
  SelectionItem,
} from '../../app/types/annotations'

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

/**
 * Nested visible layers, counted up to `NESTED_CAP`: past it the count only
 * feeds the slowness warning, and walking a whole large board (a generated
 * documentation, a page-sized board) on every selection change freezes Penpot.
 */
const NESTED_CAP = 1000
const countNested = (s: Shape): number => {
  const stack = [...visibleChildren(s)]
  let n = 0
  while (stack.length > 0 && n < NESTED_CAP) {
    n++
    stack.push(...visibleChildren(stack.pop() as Shape))
  }
  return n
}

const toItem = (s: Shape): SelectionItem => {
  const c = classify(s)
  const root = documentedRoot(s, c)
  const annotation = isAnnotationShape(s)
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
    // A generated documentation is never documented: skip its layer walk.
    topLevelLayers: annotation ? [] : visibleChildren(root).map((k) => k.name),
    nestedLayerCount: annotation ? 0 : countNested(root),
    isRotated: isRotated(s),
    hasChildren:
      'children' in s && Array.isArray(s.children) && s.children.length > 0,
    isAnnotation: annotation,
    targetIds: {
      COMPONENT: rootIdOf(s, 'COMPONENT'),
      FAMILY: rootIdOf(s, 'FAMILY'),
    },
  }
}

/**
 * The documented root for a choice; null when that choice is refused. Only
 * classifies the selection: no analysis, no fingerprint.
 */
const rootIdOf = (s: Shape, target: DocTarget): string | null => {
  const res = safe(() => resolveTarget(s, target))
  return res && typeof res !== 'string' ? res.root.id : null
}

export const digestSelection = (): SelectionDigest =>
  readPhase(() => buildDigest())

const buildDigest = (): SelectionDigest => {
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
