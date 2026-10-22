import { drawMarkers } from '../redlines'
import { collectProperties } from '../properties'
import { tr } from '../i18n'
import { COLOR_FAMILIES } from '../groups'
import { shapeRect } from '../geometry'
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
  refValue,
  sizeOf,
  titleBlock,
} from './shared'
import { buildColorsMerged, colorsNeedMerged } from './colors-merged'
import type { Shape } from '@penpot/plugin-types'
import type { DocCtx, ViewBuild } from './shared'
import type { PanelNode, TableRow } from '../panel'

// The reference rows of one part: swatch | property | value + reference chip.
const partRows = (dc: DocCtx, shape: Shape): Array<TableRow> => {
  const { panel, env, refs } = dc
  const sc = env.sc
    const groups = collectProperties(
      shape,
      [...COLOR_FAMILIES],
      env.style,
      refs
    )
    // One table per part: swatch | property | value + reference chip.
    const rows: Array<TableRow> = []
    groups.forEach((g, gi) => {
      if (gi > 0) rows.push([])
      rows.push([
        null,
        panel.text(tr(`family.${g.family}`), {
          bold: true,
          muted: true,
          font: 'title',
          size: sc.font * 0.9,
          name: 'Family',
        }),
        null,
      ])
      for (const r of g.rows)
        rows.push([
          panel.swatch(r.swatch),
          propCell(dc, r.label),
          refValue(
            dc,
            r.value,
            tr(r.key === 'typographyStyle' ? 'ref.matched' : `ref.${r.ref}`)
          ),
        ])
    })
  return rows
}

// Widest part table, from a dry run whose shapes are dropped.
export const colorsNeed = (dc: DocCtx): number => {
  if (dc.merged) return colorsNeedMerged(dc, dc.merged)
  const mark = dc.panel.mark()
  let need = 0
  for (const structure of dc.structures)
    for (const entries of structure.colors)
      for (const part of bind(structure.plan, entries[0].main))
        need = Math.max(need, dc.panel.tableNeed(partRows(dc, part.shape)))
  dc.panel.discardFrom(mark)
  return need
}

// COLORS: per color group, a specimen card (title + copy with part numbers)
// followed by one card per part: a table of fills, strokes, typography and
// effects: swatch, then token, else style, else raw.
export const buildColors = (dc: DocCtx): ViewBuild => {
  if (dc.merged) return buildColorsMerged(dc, dc.merged)
  const { panel, env } = dc
  const sc = env.sc
  const all: Array<PanelNode> = []

  for (const structure of dc.structures)
    for (const entries of structure.colors) {
      const copy = dc.copyOf(entries[0])
      const stage = makeStage(dc, copy)
      const pen = newPen(dc)
      drawMarkers(
        { pen, placer: newPlacer(dc), sc, style: env.style },
        bind(structure.plan, copy),
        shapeRect(copy)
      )
      flushPen(stage, pen, 'Markers')
      const cards: Array<PanelNode> = [
        card(
          dc,
          [titleBlock(dc, entries), centered(dc, stage.node)],
          'Specimen',
          sizeOf(dc, 2, stage.node.w),
          false,
          true
        ),
      ]

      for (const part of bind(structure.plan, copy)) {
        const title = panel.text(
          `${part.n}   ${part.shape.name}  ·  ${part.shape.type}`,
          { bold: true, font: 'title', name: 'Part title' }
        )
        const rows = partRows(dc, part.shape)
        const size = sizeOf(dc, 2, panel.tableNeed(rows))
        const body: PanelNode =
          rows.length > 0
            ? panel.table(rows, { width: size.inner, name: 'References' })
            : panel.text(tr('doc.noColorRefs'), { muted: true })
        cards.push(card(dc, [title, body], `${part.n} ${part.shape.name}`, size))
      }

      all.push(...cards)
    }

  return {
    title: heading(dc, tr('view.COLORS')),
    cards: all,
  }
}
