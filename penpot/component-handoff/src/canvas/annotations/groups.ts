import { variantLabel, orderedVariantsOf, safe } from './target'
import { collectProperties } from './properties'
import { bindParts, planParts } from './parts'
import { CATEGORIES, measureRows } from './measure'
import type { LibraryComponent, Shape } from '@penpot/plugin-types'
import type {
  AnnotationStyle,
  PartsDetail,
  VariantFilter,
} from '../../app/types/annotations'
import type { Resolved } from './target'
import type { RefCtx } from './refs'
import type { PartPlan } from './parts'

export const COLOR_FAMILIES = [
  'FILLS_STROKES',
  'TYPOGRAPHY',
  'EFFECTS',
] as const

export interface Entry {
  comp: LibraryComponent | null
  main: Shape
  label: string
  props: Record<string, string>
}

export interface StructureGroup {
  entries: Array<Entry>
  plan: Array<PartPlan>
  measures: Array<Array<Entry>>
  colors: Array<Array<Entry>>
}

/** Absent properties are unfiltered; null keeps all. */
export const matchesFilter = (
  props: Record<string, string>,
  filter: VariantFilter | null
): boolean =>
  !filter ||
  Object.entries(filter).every(([name, values]) => values.includes(props[name]))

export const countMatching = (
  res: Resolved,
  filter: VariantFilter | null
): number =>
  res.variants
    ? orderedVariantsOf(res.variants, res.container).filter((c) =>
        matchesFilter(c.variantProps ?? {}, filter)
      ).length
    : 0

export const collectEntries = (
  res: Resolved,
  isFamily: boolean,
  filter: VariantFilter | null = null
): Array<Entry> => {
  if (isFamily && res.variants)
    return orderedVariantsOf(res.variants, res.container)
      .filter((c) => matchesFilter(c.variantProps ?? {}, filter))
      .flatMap((c) => {
        const main = safe(() => c.mainInstance())
        return main
          ? [
              {
                comp: c as LibraryComponent,
                main,
                label: variantLabel(c),
                props: { ...(c.variantProps ?? {}) },
              },
            ]
          : []
      })
  return [{ comp: res.comp, main: res.source, label: '', props: {} }]
}

const split = (
  entries: Array<Entry>,
  key: (e: Entry) => string
): Array<Array<Entry>> => {
  const map = new Map<string, Array<Entry>>()
  for (const e of entries) {
    const k = key(e)
    const list = map.get(k)
    if (list) list.push(e)
    else map.set(k, [e])
  }
  return [...map.values()]
}

export const computeGroups = (
  entries: Array<Entry>,
  depth: PartsDetail,
  style: AnnotationStyle,
  refs: RefCtx,
  want: { measure: boolean; color: boolean }
): Array<StructureGroup> => {
  const plans = new Map<Entry, Array<PartPlan>>()
  const structures = split(entries, (e) => {
    const plan = planParts(e.main, depth)
    plans.set(e, plan)
    return plan.map((p) => `${p.path}:${p.type}`).join('|')
  })
  return structures.map((list) => {
    const plan = plans.get(list[0]) as Array<PartPlan>
    const measureKey = (e: Entry): string =>
      bindParts(plan, e.main)
        .map((p) => {
          const r = measureRows(p.shape, style, refs)
          return CATEGORIES.map((c) =>
            r[c].map((x) => `${x.key}=${x.value}/${x.ref}`).join(',')
          ).join(';')
        })
        .join('|')
    const colorKey = (e: Entry): string =>
      bindParts(plan, e.main)
        .map((p) =>
          collectProperties(p.shape, [...COLOR_FAMILIES], style, refs)
            .flatMap((g) => g.rows.map((x) => `${x.key}=${x.value}/${x.ref}`))
            .join(',')
        )
        .join('|')
    return {
      entries: list,
      plan,
      measures: want.measure ? split(list, measureKey) : [],
      colors: want.color ? split(list, colorKey) : [],
    }
  })
}
