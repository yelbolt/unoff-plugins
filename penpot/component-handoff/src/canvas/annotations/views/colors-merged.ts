import { drawMarkers } from '../redlines'
import { collectProperties } from '../properties'
import { tr } from '../i18n'
import { COLOR_FAMILIES } from '../groups'
import { shapeRect } from '../geometry'
import { presenceLines, resolveValue } from '../drivers'
import { SPACING } from '../constants'
import {
  bind,
  card,
  centered,
  flushPen,
  makeStage,
  newPen,
  heading,
  newPlacer,
  px,
  propCell,
  refValue,
  sizeOf,
} from './shared'
import { presenceOf, specimenTitle } from './merged'
import type { PropertyGroup, PropertyRow } from '../properties'
import type { MergedModel, MergedPart } from '../merged'
import type { Entry } from '../groups'
import type { Sample } from '../drivers'
import type { DocCtx, ViewBuild } from './shared'
import type { PanelNode, TableRow } from '../panel'

type Ref = { value: string; ref: PropertyRow['ref']; swatch?: string } | null

const refLine = (dc: DocCtx, r: Ref, prefix = ''): PanelNode => {
  const { panel } = dc
    const text = r ? `${prefix}${r.value}` : `${prefix}—`
    const kids = [panel.swatch(r?.swatch), panel.text(text, { name: 'Value' })]
    if (r)
      kids.push(
        panel.chip(tr(`ref.${r.ref}`), {
          name: 'Reference',
        })
      )
    return panel.box(kids, {
      dir: 'row',
      gap: px(dc, SPACING[8]),
      alignItems: 'center',
      name: 'Ref line',
    })
  }

// The reference rows of one part of the union.
const partRows = (dc: DocCtx, part: MergedPart): Array<TableRow> => {
  const { panel, env, refs } = dc
  const sc = env.sc
    const perEntry = new Map<Entry, Array<PropertyGroup>>()
    for (const [e, p] of part.shapes)
      perEntry.set(
        e,
        collectProperties(p.shape, [...COLOR_FAMILIES], env.style, refs)
      )

    // Families and keys, in first-seen order.
    const families: Array<{
      family: PropertyGroup['family']
      keys: Array<{ key: string; label: string }>
    }> = []
    for (const groups of perEntry.values())
      for (const g of groups) {
        let f = families.find((x) => x.family === g.family)
        if (!f) families.push((f = { family: g.family, keys: [] }))
        for (const r of g.rows)
          if (!f.keys.some((k) => k.key === r.key))
            f.keys.push({ key: r.key, label: r.label })
      }

    const rows: Array<TableRow> = []
    families.forEach((f, fi) => {
      if (fi > 0) rows.push([])
      rows.push([
        null,
        panel.text(tr(`family.${f.family}`), {
          bold: true,
          muted: true,
          font: 'title',
          size: sc.font * 0.9,
          name: 'Family',
        }),
        null,
      ])
      for (const k of f.keys) {
        const samples: Array<Sample<Ref>> = []
        for (const [e, groups] of perEntry) {
          const row = groups
            .find((g) => g.family === f.family)
            ?.rows.find((x) => x.key === k.key)
          const data: Ref = row
            ? { value: row.value, ref: row.ref, swatch: row.swatch }
            : null
          samples.push({
            label: e.label,
            props: e.props,
            key: data ? `${data.ref}|${data.value}` : '',
            data,
          })
        }
        const res = resolveValue(samples, dc.order)
        const label = propCell(dc, k.label)
        if (res.kind === 'uniform') {
          const r = res.data
          rows.push([
            panel.swatch(r?.swatch),
            label,
            r
              ? refValue(
                  dc,
                  r.value,
                  tr(k.key === 'typographyStyle' ? 'ref.matched' : `ref.${r.ref}`)
                )
              : panel.text('—', { name: 'Value' }),
          ])
        } else {
          const lines: Array<PanelNode> =
            res.kind === 'driven'
              ? [
                  panel.text(`${res.property}:`, { muted: true, name: 'Driver' }),
                  ...res.items.map((i) => refLine(dc, i.data, `${i.value}  `)),
                ]
              : res.items.map((i) =>
                  refLine(dc, i.data, `${i.label}:  `)
                )
          rows.push([
            null,
            label,
            panel.box(lines, {
              dir: 'column',
              gap: px(dc, SPACING[4]),
              name: 'Keyed values',
            }),
          ])
        }
      }
    })

  return rows
}

// Widest part table, from a dry run whose shapes are dropped.
export const colorsNeedMerged = (dc: DocCtx, model: MergedModel): number => {
  const mark = dc.panel.mark()
  const need = Math.max(
    0,
    ...model.parts.map((p) => dc.panel.tableNeed(partRows(dc, p)))
  )
  dc.panel.discardFrom(mark)
  return need
}

// COLORS, merged: ONE specimen of the first variant with the part numbers,
// then one card per part of the union. A reference that differs between
// variants is keyed by the property that drives it.
export const buildColorsMerged = (
  dc: DocCtx,
  model: MergedModel
): ViewBuild => {
  const { panel, env } = dc
  const sc = env.sc
  const first = model.entries[0]

  const copy = dc.copyOf(first)
  const stage = makeStage(dc, copy)
  const pen = newPen(dc)
  drawMarkers(
    { pen, placer: newPlacer(dc), sc, style: env.style },
    bind(model.plan, copy),
    shapeRect(copy)
  )
  flushPen(stage, pen, 'Markers')
  const cards: Array<PanelNode> = [
    card(
      dc,
      [specimenTitle(dc), centered(dc, stage.node)],
      'Specimen',
      sizeOf(dc, 2, stage.node.w),
      false,
      true
    ),
  ]

  for (const part of model.parts) {
    const rows = partRows(dc, part)
    const size = sizeOf(dc, 2, panel.tableNeed(rows))
    const body: PanelNode =
      rows.length > 0
        ? panel.table(rows, { width: size.inner, name: 'References' })
        : panel.text(tr('doc.noColorRefs'), { muted: true })
    const kids: Array<PanelNode> = [
      panel.text(`${part.n}   ${part.name}  ·  ${part.type}`, {
        bold: true,
        font: 'title',
        name: 'Part title',
      }),
    ]
    if (dc.isFamily) {
      const p = presenceOf(dc, part)
      if (p.kind !== 'all')
        kids.push(
          panel.text(
            `${tr('doc.appearsColumn')}: ${presenceLines(p, tr('doc.allVariants')).join('  ·  ')}`,
            { muted: true, size: sc.font * 0.9, name: 'Appears in' }
          )
        )
    }
    kids.push(body)
    cards.push(card(dc, kids, `${part.n} ${part.name}`, size))
  }

  return {
    title: heading(dc, tr('view.COLORS')),
    cards,
  }
}
