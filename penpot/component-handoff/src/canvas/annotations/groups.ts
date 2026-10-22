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

// One documented variant (a COMPONENT has a single entry).
export interface Entry {
  comp: LibraryComponent | null // instance() source; null clones `main`
  main: Shape // the main component shape, read for grouping
  label: string // "Size=M, State=Hover"; '' for a component
  props: Record<string, string> // the variant's own values
}

// Variants sharing the same structure (same parts by layer path and type),
// split again into measurement groups (identical measured values) and color
// groups (identical references). Computed once; the plan is the part
// numbering shared by anatomy, measurements and colors of the group.
export interface StructureGroup {
  entries: Array<Entry>
  plan: Array<PartPlan>
  measures: Array<Array<Entry>>
  colors: Array<Array<Entry>>
}

// A variant is kept when, for every property present in the filter, its value
// is among the ticked ones. Absent properties are unfiltered; null keeps all.
export const matchesFilter = (
  props: Record<string, string>,
  filter: VariantFilter | null
): boolean =>
  !filter ||
  Object.entries(filter).every(([name, values]) =>
    values.includes(props[name])
  )

// How many variants of the family match the filter.
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
            .flatMap((g) =>
              g.rows.map((x) => `${x.key}=${x.value}/${x.ref}`)
            )
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
