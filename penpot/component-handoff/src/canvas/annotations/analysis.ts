import { DEFAULT_ANNOTATION_STYLE } from '../../app/types/annotations'
import { docName } from './views/name'
import { referenceOf, referencesIn } from './tokens'
import { variantPropertiesOf } from './target'
import { makeRefCtx } from './refs'
import { collectProperties } from './properties'
import { buildMerged } from './merged'
import { readPhase, remember } from './memo'
import { CATEGORIES, measureRows } from './measure'
import { COLOR_FAMILIES, collectEntries } from './groups'
import { resolveKeyed, resolvePresenceKeyed } from './drivers'
import type { ContractSummary, VariantFilter } from '../../app/types/annotations'
import type { TokenInfo } from './tokens'
import type { Resolved } from './target'
import type { RefCtx } from './refs'
import type { PropertyRow } from './properties'
import type { MergedModel, MergedPart } from './merged'
import type { Entry } from './groups'
import type { PropertyOrder, Sample } from './drivers'

/** Single source for the contract and the documentation's header / Props view. */

export type Value =
  | string
  | number
  | boolean
  | null
  | Array<unknown>
  | { [k: string]: unknown }

export type Keyed = { by: string | Array<string>; values: Record<string, Value> }

export interface PartOut {
  path: string
  type: string
  in: 'all' | Record<string, Array<string>>
  mergedKey: string
}

export type RuleOut = { part: string; prop: string } & (
  | { value: Value }
  | Keyed
)

export type ExceptionOut = {
  part: string
  kind: 'absolute' | 'measured' | 'raw'
  prop?: string
  note?: string
  props?: Record<string, Value | Keyed>
} & ({ value?: Value } | Partial<Keyed>)

export interface TokenOut {
  type: string
  value: Value
  resolved: Value
  set: string | null
}

export interface Drive {
  by: Array<string>
  part: string
  prop: string // contract property name, or '' for presence
  presence: boolean
}

export interface Analysis {
  entries: Array<Entry>
  order: Array<PropertyOrder>
  model: MergedModel
  rootName: string
  parts: Array<PartOut>
  rules: Array<RuleOut>
  exceptions: Array<ExceptionOut>
  drives: Array<Drive>
  tokens: Record<string, TokenOut>
  summary: ContractSummary
  layoutShare: number
}

const PX = { ...DEFAULT_ANNOTATION_STYLE, unit: 'px' as const }

const TOKEN_TYPES: Record<string, Array<string>> = {
  width: ['sizing', 'dimension'],
  height: ['sizing', 'dimension'],
  paddingTop: ['spacing', 'dimension'],
  paddingRight: ['spacing', 'dimension'],
  paddingBottom: ['spacing', 'dimension'],
  paddingLeft: ['spacing', 'dimension'],
  rowGap: ['spacing', 'dimension'],
  columnGap: ['spacing', 'dimension'],
  radius: ['borderRadius'],
  borderRadiusTopLeft: ['borderRadius'],
  borderRadiusTopRight: ['borderRadius'],
  borderRadiusBottomRight: ['borderRadius'],
  borderRadiusBottomLeft: ['borderRadius'],
  fill: ['color'],
  stroke: ['color'],
  strokeWidth: ['borderWidth'],
  fontSize: ['fontSizes'],
  fontFamily: ['fontFamilies'],
  fontWeight: ['fontWeights'],
  letterSpacing: ['letterSpacing'],
  textCase: ['textCase'],
  textDecoration: ['textDecoration'],
  opacity: ['opacity'],
  shadow: ['shadow'],
  typography: ['typography'],
  rotation: ['rotation'],
}

const LAYOUT_FOLD: Record<string, string> = {
  'layout.type': 'type',
  'layout.dir': 'dir',
  'layout.wrap': 'wrap',
  'layout.alignItems': 'alignItems',
  'layout.justifyItems': 'justifyItems',
  'layout.justifyContent': 'justifyContent',
  'layout.alignContent': 'alignContent',
  'layout.columns': 'columns',
  'layout.rows': 'rows',
}
const SIZING_FOLD: Record<string, string> = {
  'layout.sizingH': 'h',
  'layout.sizingV': 'v',
}
const RENAMED: Record<string, string> = {
  typographyStyle: 'typography',
  'layout.minWidth': 'minWidth',
  'layout.maxWidth': 'maxWidth',
  'layout.minHeight': 'minHeight',
  'layout.maxHeight': 'maxHeight',
  'layout.growType': 'growType',
  'layout.constraintsH': 'constraintsHorizontal',
  'layout.constraintsV': 'constraintsVertical',
  'layout.clipContent': 'clipContent',
  'layout.zIndex': 'zIndex',
}
const SKIPPED = new Set(['skipped', 'layout.rowGap', 'layout.columnGap'])

const LENGTH =
  /^(width|height|padding|rowGap|columnGap|radius|borderRadius|strokeWidth#|fontSize|layerBlur|backgroundBlur|lineHeight|letterSpacing|rotation|layout\.m(in|ax))/

const propOf = (key: string): string => {
  if (RENAMED[key]) return RENAMED[key]
  if (key.startsWith('gap#')) return 'gap'
  const m = /^(fill|stroke|strokeWidth|shadow)#(\d+)$/.exec(key)
  if (m) return m[2] === '0' ? m[1] : `${m[1]}#${m[2]}`
  return key
}
const baseOf = (prop: string): string => prop.replace(/#\d+$/, '')

interface Cell {
  value: Value
  token: boolean
  style: boolean
  measured: boolean
  hex: string // lower-case colour for matching, else ''
}

const NULL_CELL: Cell = { value: null, token: false, style: false, measured: false, hex: '' }

const neutral = (r: PropertyRow): Value => {
  if (r.ref === 'token') return `{${r.value}}`
  if (r.ref === 'style') return r.code ?? r.value
  if (r.code !== undefined) return r.key === 'layout.zIndex' ? Number(r.code) : r.code
  if (r.key === 'opacity') {
    const n = parseFloat(r.value)
    return isNaN(n) ? r.value : n / 100
  }
  if (LENGTH.test(r.key)) {
    const n = parseFloat(r.value)
    return isNaN(n) ? r.value : n
  }
  return r.value
}

const cellOf = (r: PropertyRow): Cell => ({
  value: neutral(r),
  token: r.ref === 'token',
  style: r.ref === 'style',
  measured: r.origin === 'measured',
  hex: r.swatch ? r.swatch.toLowerCase() : '',
})

const zero = (v: Value): boolean => v === null || v === 0 || v === false

const rowsOf = (
  shape: Parameters<typeof measureRows>[0],
  refs: RefCtx
): Array<PropertyRow> => {
  const m = measureRows(shape, PX, refs)
  return [
    ...CATEGORIES.flatMap((c) => m[c]),
    ...collectProperties(shape, [...COLOR_FAMILIES], PX, refs).flatMap((g) => g.rows),
  ].filter((r) => !SKIPPED.has(r.key))
}

const isPlaced = (part: MergedPart): boolean =>
  [...part.shapes.values()].every((p) => {
    const parent = p.shape.parent
    return (
      parent !== null &&
      parent.type === 'board' &&
      Boolean(parent.flex ?? parent.grid) &&
      !p.shape.layoutChild?.absolute
    )
  })

export const analysisFor = (
  res: Resolved,
  isFamily: boolean,
  filter: VariantFilter | null,
  orderMode: 'FAMILY_ONLY' | 'ANY_VARIANTS'
): Analysis =>
  remember(
    `an:${res.root.id}|${res.source.id}|${isFamily}|${orderMode}|${JSON.stringify(filter ?? null)}`,
    () =>
      readPhase(() => {
        const entries = collectEntries(res, isFamily, filter)
        const useOrder = orderMode === 'ANY_VARIANTS' ? res.variants : isFamily && res.variants
        const full = useOrder && res.variants ? variantPropertiesOf(res.variants) : []
        // Property orders keep only the ticked values.
        const order = full.map((o) => {
          const ticked = filter?.[o.name]
          return ticked
            ? { name: o.name, values: o.values.filter((v) => ticked.includes(v)) }
            : o
        })
        return analyze(entries, order, docName(res, isFamily), makeRefCtx())
      })
  )

export const analyze = (
  entries: Array<Entry>,
  order: Array<PropertyOrder>,
  rootName: string,
  refs: RefCtx
): Analysis => readPhase(() => analyzeEntries(entries, order, rootName, refs))

const analyzeEntries = (
  entries: Array<Entry>,
  order: Array<PropertyOrder>,
  rootName: string,
  refs: RefCtx
): Analysis => {
  const model = buildMerged(entries, 'ALL')
  const pathOf = (p: MergedPart): string =>
    p.cpath ? `${rootName}/${p.cpath}` : rootName
  const types = refs.tokens.types

  const rows = new Map<MergedPart, Map<Entry, Map<string, PropertyRow>>>()
  for (const part of model.parts) {
    const m = new Map<Entry, Map<string, PropertyRow>>()
    for (const [e, p] of part.shapes) {
      const byKey = new Map<string, PropertyRow>()
      for (const r of rowsOf(p.shape, refs)) if (!byKey.has(r.key)) byKey.set(r.key, r)
      m.set(e, byKey)
    }
    rows.set(part, m)
  }

  const partsOut: Array<PartOut> = model.parts.map((part) => {
    const pres = resolvePresenceKeyed(
      entries.map((e) => ({ label: e.label, props: e.props, present: part.shapes.has(e) })),
      order
    )
    return {
      path: pathOf(part),
      type: part.type,
      in:
        pres.kind === 'all' ? 'all' : { [pres.by.join('|')]: pres.values },
      mergedKey: part.key,
    }
  })

  const rules: Array<RuleOut> = []
  const exceptions: Array<ExceptionOut> = []
  const drives: Array<Drive> = []
  let capable = 0
  let tokenized = 0

  model.parts.forEach((part, pi) => {
    const path = pathOf(part)
    if (part.n > 0 && pres(partsOut[pi].in)) 
      drives.push({ by: pres(partsOut[pi].in) as Array<string>, part: part.name, prop: '', presence: true })
    
    const perEntry = rows.get(part) as Map<Entry, Map<string, PropertyRow>>
    const absolute = [...part.shapes.values()].some((p) => p.shape.layoutChild?.absolute)

    const keySet = new Set<string>()
    for (const byKey of perEntry.values()) for (const k of byKey.keys()) keySet.add(k)
    const keys = [...keySet]

    interface Item {
      key: string
      prop: string
      resolved: ReturnType<typeof resolveKeyed<Cell>>
      cells: Array<Cell>
    }
    const items: Array<Item> = []
    for (const key of keys) {
      const samples: Array<Sample<Cell>> = []
      for (const [e, list] of perEntry) {
        const r = list.get(key)
        const cell = r ? cellOf(r) : LENGTH.test(key) ? { ...NULL_CELL, value: 0 } : NULL_CELL
        samples.push({ label: e.label, props: e.props, key: JSON.stringify([cell.token, cell.value]), data: cell })
      }
      const resolved = resolveKeyed(samples, order)
      const cells = resolved.kind === 'uniform' ? [resolved.data] : resolved.items.map((i) => i.data)
      // A uniform absent value is not a rule.
      if (resolved.kind === 'uniform' && zero(resolved.data.value) && !resolved.data.token) continue
      if (key === 'layout.absolute') continue
      items.push({ key, prop: propOf(key), resolved, cells })
    }

    const out = (it: Item): Keyed | { value: Value } =>
      it.resolved.kind === 'uniform'
        ? { value: it.resolved.data.value }
        : {
            by: it.resolved.by.length === 1 ? it.resolved.by[0] : it.resolved.by,
            values: Object.fromEntries(it.resolved.items.map((i) => [i.value, i.data.value])),
          }
    const noteDrive = (it: Item) => {
      if (it.resolved.kind === 'driven' && part.n >= 0)
        drives.push({ by: it.resolved.by, part: part.name, prop: it.prop, presence: false })
    }

    // Absolutely positioned: one exception, never a rule.
    if (absolute) {
      const props: Record<string, Value | Keyed> = {}
      for (const it of items) {
        const o = out(it)
        props[it.prop] = 'value' in o ? o.value : o
        noteDrive(it)
      }
      exceptions.push({
        part: path,
        kind: 'absolute',
        note: 'positioned, not placed by a layout',
        ...(Object.keys(props).length > 0 ? { props } : {}),
      })
      return
    }

    const fold = (map: Record<string, string>, prop: string) => {
      const folded: Record<string, Value> = {}
      for (const it of items) {
        const sub = map[it.key]
        if (sub === undefined) continue
        if (it.resolved.kind === 'uniform') folded[sub] = it.resolved.data.value
      }
      const onlyNone = prop === 'layout' && Object.keys(folded).length === 1 && folded.type === 'none'
      if (Object.keys(folded).length > 0 && !onlyNone)
        rules.push({ part: path, prop, value: folded })
    }
    fold(LAYOUT_FOLD, 'layout')
    fold(SIZING_FOLD, 'sizing')

    for (const it of items) {
      const folded = LAYOUT_FOLD[it.key] ?? SIZING_FOLD[it.key]
      if (folded !== undefined && it.resolved.kind === 'uniform') continue
      let prop = it.prop
      if (LAYOUT_FOLD[it.key]) prop = `layout.${LAYOUT_FOLD[it.key]}`
      if (SIZING_FOLD[it.key]) prop = `sizing.${SIZING_FOLD[it.key]}`
      const o = out(it)
      noteDrive(it)

      const base = baseOf(it.prop)
      const measured = it.cells.some((c) => c.measured)
      if (measured && (base === 'width' || base === 'height')) {
        // A size produced by fill / fit in every variant is a consequence of `sizing`, not an exception.
        if (it.cells.every((c) => c.measured || c.value === null)) continue
      } else if (measured) {
        exceptions.push({
          part: path,
          kind: 'measured',
          prop,
          ...o,
          note: it.key.startsWith('gap#')
            ? `distance measured between ${it.key.slice(it.key.indexOf(':') + 1).replace('>', ' and ')}, not placed by a layout`
            : 'observed, not produced by a layout rule',
        } as ExceptionOut)
        continue
      }
      const backing = TOKEN_TYPES[base]
      if (backing) {
        const live = it.cells.filter((c) => !zero(c.value) || c.token)
        capable++
        if (live.length > 0 && live.every((c) => c.token)) tokenized++
        const raw = it.cells.some((c) => !c.token && !c.style && c.value !== null)
        if (raw && backing.some((t) => types.has(t))) {
          const notes: Array<string> = []
          const cellsWithLabel =
            it.resolved.kind === 'uniform'
              ? [{ label: '', cell: it.resolved.data }]
              : it.resolved.items.map((i) => ({ label: `${i.value}: `, cell: i.data }))
          for (const { label, cell } of cellsWithLabel) {
            if (cell.token || cell.style || cell.value === null) continue
            const hit = matchingToken(refs, backing, cell)
            if (hit) notes.push(`${label}{${hit}} has the same value`)
          }
          exceptions.push({
            part: path,
            kind: 'raw',
            prop,
            ...o,
            ...(notes.length > 0 ? { note: notes.join('; ') } : {}),
          } as ExceptionOut)
          continue
        }
      }
      rules.push({ part: path, prop, ...o } as RuleOut)
    }
  })

  const tokens = collectTokens(refs, rules, exceptions)
  const nonRoot = model.parts.filter((p) => p.n > 0)
  const layoutShare =
    nonRoot.length === 0 ? 1 : nonRoot.filter(isPlaced).length / nonRoot.length

  return {
    entries,
    order,
    model,
    rootName,
    parts: partsOut,
    rules,
    exceptions,
    drives,
    tokens,
    layoutShare,
    summary: {
      props: order.length,
      rules: rules.length,
      tokenizedShare: capable === 0 ? 1 : tokenized / capable,
      exceptions: exceptions.length,
    },
  }
}

const pres = (p: PartOut['in']): Array<string> | null =>
  p === 'all' ? null : Object.keys(p)[0].split('|')

const CANDIDATES = new WeakMap<RefCtx, Map<string, Array<TokenInfo>>>()
const candidates = (refs: RefCtx, backing: Array<string>): Array<TokenInfo> => {
  let byBacking = CANDIDATES.get(refs)
  if (!byBacking) CANDIDATES.set(refs, (byBacking = new Map()))
  const id = backing.join('|')
  let list = byBacking.get(id)
  if (!list)
    byBacking.set(
      id,
      (list = [...refs.tokens.byName.values()].filter((i) => backing.includes(i.type)))
    )
  return list
}

const matchingToken = (
  refs: RefCtx,
  backing: Array<string>,
  cell: Cell
): string | null => {
  for (const info of candidates(refs, backing)) {
    const r = info.resolved
    if (typeof r === 'number' && typeof cell.value === 'number') {
      if (Math.abs(r - cell.value) < 0.0001) return info.name
    } else if (typeof r === 'string' && cell.hex) {
      if (r.toLowerCase() === cell.hex && cell.value === cell.hex.toUpperCase())
        return info.name
    } else if (typeof r === 'string' && typeof cell.value === 'string') 
      if (r === cell.value) return info.name
    
  }
  return null
}

const asValue = (v: unknown): Value =>
  v === undefined ? null : (v as Value)

const collectTokens = (
  refs: RefCtx,
  rules: Array<RuleOut>,
  exceptions: Array<ExceptionOut>
): Record<string, TokenOut> => {
  const wanted = new Set<string>()
  const scan = (v: unknown) => {
    if (typeof v === 'string') {
      const r = referenceOf(v)
      if (r) wanted.add(r)
    } else if (Array.isArray(v)) v.forEach(scan)
    else if (v && typeof v === 'object') Object.values(v).forEach(scan)
  }
  for (const r of rules) scan('value' in r ? r.value : r.values)
  for (const e of exceptions) {
    scan((e as { value?: unknown }).value)
    scan((e as { values?: unknown }).values)
    scan(e.props)
  }
  return expandTokens(refs, [...wanted])
}

export const expandTokens = (
  refs: RefCtx,
  names: Array<string>
): Record<string, TokenOut> => {
  const out: Record<string, TokenOut> = {}
  const queue = [...names]
  const done = new Set<string>()
  while (queue.length > 0) {
    const name = queue.shift() as string
    if (done.has(name)) continue
    done.add(name)
    const info = refs.tokens.get(name)
    if (!info) {
      out[name] = { type: 'unknown', value: null, resolved: null, set: null }
      continue
    }
    out[name] = {
      type: info.type,
      value: asValue(info.value),
      resolved: asValue(info.resolved),
      set: info.set,
    }
    for (const ref of referencesIn(info.value)) queue.push(ref)
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
}

