import { drawMarkers, drawRedlines } from '../redlines'
import { measureRows, CATEGORIES } from '../measure'
import { tr } from '../i18n'
import { isRotated, shapeRect } from '../geometry'
import { resolveValue } from '../drivers'
import {
  bind,
  card,
  centered,
  flushPen,
  makeStage,
  newPen,
  heading,
  newPlacer,
  propCell,
  fixedSize,
} from './shared'
import { headerCell, specimenTitle, valueCell } from './merged'
import type { Category } from '../redlines'
import type { MergedModel, MergedPart } from '../merged'
import type { MeasureRows } from '../measure'
import type { Entry } from '../groups'
import type { Sample } from '../drivers'
import type { DocCtx, ViewBuild } from './shared'
import type { PanelNode, TableRow } from '../panel'

// MEASUREMENTS, merged: one card per category, with its own specimen (the
// first variant, only that category's redlines and the numbers of the parts
// it lists) and ONE table `# | Part | Property | Value`. A value that differs
// between variants is keyed by the property that drives it.
interface MergedTable {
  cat: Category
  rowsAll: Array<TableRow>
  marked: Set<number>
}

// Every category's table (header included), cells built.
const tablesOf = (dc: DocCtx, model: MergedModel): Array<MergedTable> => {
  const { panel, env } = dc
  const first = model.entries[0]
  const out: Array<MergedTable> = []
  const rowsOf = new Map<MergedPart, Map<Entry, MeasureRows>>()
  for (const part of model.parts) {
    const m = new Map<Entry, MeasureRows>()
    for (const [e, p] of part.shapes) {
      if (isRotated(p.shape)) dc.state.rotated = true
      m.set(e, measureRows(p.shape, env.style, dc.refs))
    }
    rowsOf.set(part, m)
  }

  for (const cat of CATEGORIES) {
    const lines: Array<TableRow> = []
    const marked = new Set<number>()
    for (const part of model.parts) {
      const perEntry = rowsOf.get(part) as Map<Entry, MeasureRows>
      const keys: Array<string> = []
      const labels = new Map<string, string>()
      for (const r of perEntry.values())
        for (const row of r[cat])
          if (!labels.has(row.key)) {
            keys.push(row.key)
            labels.set(row.key, row.label)
          }
      for (const key of keys) {
        const samples: Array<Sample<string>> = []
        for (const [e, r] of perEntry) {
          const v = r[cat].find((x) => x.key === key)?.value ?? (cat === 'LAYOUT' ? '—' : '0')
          samples.push({ label: e.label, props: e.props, key: v, data: v })
        }
        const res = resolveValue(samples, dc.order)
        if (res.kind === 'uniform' && parseFloat(res.data) === 0) continue
        lines.push([
          propCell(dc, String(part.n), 'Number'),
          panel.text(part.name, { name: 'Part' }),
          propCell(dc, labels.get(key) as string),
          valueCell(dc, res),
        ])
        if (part.n > 0 && part.shapes.has(first)) marked.add(part.n)
      }
    }
    if (lines.length === 0) continue
    out.push({
      cat,
      marked,
      rowsAll: [
        [
          headerCell(dc, 'doc.numberColumn'),
          headerCell(dc, 'doc.partColumn'),
          headerCell(dc, 'doc.propertyColumn'),
          headerCell(dc, 'doc.valueColumn'),
        ],
        ...lines,
      ],
    })
  }
  return out
}

// Widest measurement table, from a dry run whose shapes are dropped.
export const measurementNeedMerged = (
  dc: DocCtx,
  model: MergedModel
): number => {
  const mark = dc.panel.mark()
  const need = Math.max(
    0,
    ...tablesOf(dc, model).map((t) => dc.panel.tableNeed(t.rowsAll))
  )
  dc.panel.discardFrom(mark)
  return need
}

export const buildMeasurementsMerged = (
  dc: DocCtx,
  model: MergedModel
): ViewBuild => {
  const { panel, env } = dc
  const sc = env.sc
  const first = model.entries[0]
  const cards: Array<PanelNode> = []

  for (const { cat, rowsAll, marked } of tablesOf(dc, model)) {
    const copy = dc.copyOf(first)
    const stage = makeStage(dc, copy, cat === 'LAYOUT')
    const size = fixedSize(dc, 3)
    const table = panel.table(rowsAll, {
      width: size.inner,
      name: 'Measurements',
    })
    const pen = newPen(dc)
    const placer = newPlacer(dc)
    const parts = bind(model.plan, copy)
    const rot = drawRedlines(
      { pen, placer, sc, style: env.style, bounds: stage.rect },
      parts,
      cat
    )
    dc.state.rotated = rot || dc.state.rotated
    // The same numbers as the anatomy, for the parts this table lists.
    dc.state.markers = Math.max(
      dc.state.markers,
      drawMarkers(
        { pen, placer, sc, style: env.style },
        parts.filter((p) => marked.has(p.n)),
        shapeRect(copy)
      )
    )
    flushPen(stage, pen, 'Redlines')
    cards.push(
      card(
        dc,
        [
          panel.text(tr(`category.${cat}`), {
            bold: true,
            font: 'title',
            name: 'Category',
          }),
          specimenTitle(dc),
          centered(dc, stage.node),
          table,
        ],
        tr(`category.${cat}`),
        size
      )
    )
  }

  return {
    title: heading(dc, tr('view.MEASUREMENTS')),
    cards,
  }
}
