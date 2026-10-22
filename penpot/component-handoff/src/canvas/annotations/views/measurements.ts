import { drawMarkers, drawRedlines } from '../redlines'
import { measureRows, CATEGORIES } from '../measure'
import { tr } from '../i18n'
import { isRotated, shapeRect } from '../geometry'
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
  titleBlock,
} from './shared'
import { headerCell } from './merged'
import { buildMeasurementsMerged, measurementNeedMerged } from './measurements-merged'
import type { DocCtx, ViewBuild } from './shared'
import type { Category } from '../redlines'
import type { PanelNode, TableRow } from '../panel'
import type { MeasureRows } from '../measure'
import type { Entry } from '../groups'

type Measured = Array<{ part: ReturnType<typeof bind>[number]; rows: MeasureRows }>

// The table rows of one category (header included), or null when empty.
const tableRowsOf = (
  dc: DocCtx,
  rows: Measured,
  cat: Category
): Array<TableRow> | null => {
  const lines: Array<TableRow> = []
  for (const { part, rows: r } of rows)
    for (const row of r[cat])
      lines.push([
        propCell(dc, `${part.n}   ${part.shape.name}  ·  ${row.label}`, 'Part'),
        dc.panel.text(row.value, { name: 'Value' }),
      ])
  if (lines.length === 0) return null
  return [
    [headerCell(dc, 'doc.partColumn'), headerCell(dc, 'doc.valueColumn')],
    ...lines,
  ]
}

const measuredOf = (
  dc: DocCtx,
  structure: DocCtx['structures'][number],
  rep: Entry
): Measured =>
  bind(structure.plan, rep.main).map((p) => ({
    part: p,
    rows: measureRows(p.shape, dc.env.style, dc.refs),
  }))

// Widest measurement table, from a dry run whose shapes are dropped. Used to
// choose the column width BEFORE any card is drawn.
export const measurementNeed = (dc: DocCtx): number => {
  if (dc.merged) return measurementNeedMerged(dc, dc.merged)
  const mark = dc.panel.mark()
  let need = 0
  for (const structure of dc.structures)
    for (const entries of structure.measures) {
      const rows = measuredOf(dc, structure, entries[0])
      for (const cat of CATEGORIES) {
        const t = tableRowsOf(dc, rows, cat)
        if (t) need = Math.max(need, dc.panel.tableNeed(t))
      }
    }
  dc.panel.discardFrom(mark)
  return need
}

// MEASUREMENTS: per measurement group, one card per category (size, padding,
// gap, radius). Each card has its own specimen with only that category's
// redlines and a Part | Value table (token, else raw). Empty categories are
// omitted. Part numbers come from the anatomy plan of the same structure.
export const buildMeasurements = (dc: DocCtx): ViewBuild => {
  if (dc.merged) return buildMeasurementsMerged(dc, dc.merged)
  const { panel, env } = dc
  const sc = env.sc
  const all: Array<PanelNode> = []

  for (const structure of dc.structures)
    for (const entries of structure.measures) {
      const rep = entries[0]
      const rows = measuredOf(dc, structure, rep)
      if (rows.some((x) => isRotated(x.part.shape))) dc.state.rotated = true

      const cards: Array<PanelNode> = []
      for (const cat of CATEGORIES) {
        const rowsAll = tableRowsOf(dc, rows, cat)
        if (!rowsAll) continue

        const copy = dc.copyOf(rep)
        const stage = makeStage(dc, copy, cat === 'LAYOUT')
        // Always span 3, never widened: the column width was chosen for it.
        const size = fixedSize(dc, 3)
        const table = panel.table(rowsAll, {
          width: size.inner,
          name: 'Measurements',
        })
        const pen = newPen(dc)
        const rc = {
          pen,
          placer: newPlacer(dc),
          sc,
          style: env.style,
          bounds: stage.rect,
        }
        const rot = drawRedlines(rc, bind(structure.plan, copy), cat)
        dc.state.rotated = rot || dc.state.rotated
        // Layout also carries the numbers of the parts it lists.
        if (cat === 'LAYOUT') {
          const shown = bind(structure.plan, copy).filter((p) =>
            rows.some(
              (x) => x.part.n === p.n && x.rows.LAYOUT.length > 0
            )
          )
          dc.state.markers = Math.max(
            dc.state.markers,
            drawMarkers(
              { pen, placer: rc.placer, sc, style: env.style },
              shown,
              shapeRect(copy)
            )
          )
        }
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
              titleBlock(dc, entries),
              centered(dc, stage.node),
              table,
            ],
            tr(`category.${cat}`),
                      size
          )
        )
      }
      all.push(...cards)
    }

  return {
    title: heading(dc, tr('view.MEASUREMENTS')),
    cards: all,
  }
}
