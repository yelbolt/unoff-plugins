import { safe } from '../target'
import { drawMarkers } from '../redlines'
import { tr } from '../i18n'
import { shapeRect } from '../geometry'
import {
  bind,
  card,
  contentW,
  propCell,
  sizeOf,
  flushPen,
  makeStage,
  centered,
  newPen,
  newPlacer,
  heading,
  subheading,
  subCard,
  titleBlock,
  wrapRows,
} from './shared'
import { appearsCell, headerCell, specimenTitle } from './merged'
import type { Shape } from '@penpot/plugin-types'
import type { Stage } from './shared'
import type { DocCtx, ViewBuild } from './shared'
import type { PanelNode, TableRow } from '../panel'
import type { MergedModel } from '../merged'

// A clone of one part, or a neutral placeholder when the platform refuses to
// clone a nested shape.
const cloneOf = (dc: DocCtx, shape: Shape): PanelNode => {
  const clone = safe(() => shape.clone())
  if (clone) {
    dc.track(clone)
    return { shape: clone, w: clone.width, h: clone.height }
  }
  const ph = penpot.createRectangle()
  ph.name = 'Part placeholder'
  ph.resize(Math.max(shape.width, 1), Math.max(shape.height, 1))
  ph.fills = [{ fillColor: '#DDDDDD', fillOpacity: 1 }]
  dc.track(ph)
  return { shape: ph, w: shape.width, h: shape.height }
}

// Compact anatomy (1 to 4 parts, specimen within 2 columns): a specimen card
// of 2 columns and a parts card of 4. Otherwise a single card of 6. `body`
// builds the parts content for a known content width.
const anatomyCards = (
  dc: DocCtx,
  title: PanelNode,
  stage: Stage,
  count: number,
  body: (w: number) => Array<PanelNode>,
  breakBefore = false
): Array<PanelNode> => {
  if (count > 0 && count <= 4 && stage.node.w <= contentW(dc, 2)) {
    const left = sizeOf(dc, 2, stage.node.w)
    const right = sizeOf(dc, 4)
    return [
      card(dc, [title, centered(dc, stage.node)], 'Anatomy specimen', left, false, breakBefore),
      card(dc, body(right.inner), 'Anatomy parts', right, true),
    ]
  }
  const size = sizeOf(dc, 6, stage.node.w)
  return [
    card(
      dc,
      [title, centered(dc, stage.node), ...body(size.inner)],
      'Anatomy',
      size,
      false,
      breakBefore
    ),
  ]
}

// ANATOMY: one card per structure group. The assembled copy with numbered
// parts, then the same parts pulled apart as small cards.
export const buildAnatomy = (dc: DocCtx): ViewBuild => {
  if (dc.merged) return buildAnatomyMerged(dc, dc.merged)
  const { panel, env } = dc
  const cards: Array<PanelNode> = []

  for (const group of dc.structures) {
    const rep = group.entries[0]
    const copy = dc.copyOf(rep)
    const stage = makeStage(dc, copy)
    const pen = newPen(dc)
    dc.state.markers = Math.max(
      dc.state.markers,
      drawMarkers(
        { pen, placer: newPlacer(dc), sc: env.sc, style: env.style },
        bind(group.plan, copy),
        shapeRect(copy)
      )
    )
    flushPen(stage, pen, 'Markers')

    // Exploded parts are cloned from a scratch copy, so the displayed copy
    // stays untouched.
    const scratch = dc.copyOf(rep)
    const small: Array<PanelNode> = []
    for (const part of bind(group.plan, scratch)) {
      if (part.n === 0) continue
      small.push(
        subCard(
          dc,
          [
            cloneOf(dc, part.shape),
            panel.text(`${part.n}   ${part.shape.name}`, {
              bold: true,
              font: 'title',
              name: 'Part name',
            }),
            propCell(dc, part.shape.type, 'Part type'),
          ],
          `${part.n} ${part.shape.name}`
        )
      )
    }
    safe(() => scratch.remove())

    cards.push(
      ...anatomyCards(dc, titleBlock(dc, group.entries), stage, small.length, () =>
        small.length > 0
          ? [
              subheading(dc, tr('doc.exploded')),
              wrapRows(dc, small, 'Exploded parts'),
            ]
          : [panel.text(tr('doc.noParts'), { muted: true })],
        true
      )
    )
  }

  return {
    title: heading(dc, tr('view.ANATOMY')),
    cards,
  }
}

// MERGED: one card for the whole family. The first variant carries the
// numbered markers; the table lists every part of the union and the variants
// it appears in (a component has no such column).
const buildAnatomyMerged = (dc: DocCtx, model: MergedModel): ViewBuild => {
  const { panel, env } = dc
  const first = model.entries[0]
  const copy = dc.copyOf(first)
  const stage = makeStage(dc, copy)
  const pen = newPen(dc)
  dc.state.markers = Math.max(
    dc.state.markers,
    drawMarkers(
      { pen, placer: newPlacer(dc), sc: env.sc, style: env.style },
      bind(model.plan, copy),
      shapeRect(copy)
    )
  )
  flushPen(stage, pen, 'Markers')

  const scratch = dc.copyOf(first)
  const small: Array<PanelNode> = []
  for (const part of bind(model.plan, scratch)) {
    if (part.n === 0) continue
    small.push(
      subCard(
        dc,
        [
          cloneOf(dc, part.shape),
          panel.text(`${part.n}   ${part.shape.name}`, {
            bold: true,
            font: 'title',
            name: 'Part name',
          }),
          propCell(dc, part.shape.type, 'Part type'),
        ],
        `${part.n} ${part.shape.name}`
      )
    )
  }
  safe(() => scratch.remove())

  const union = model.parts.filter((p) => p.n > 0)
  const body = (w: number): Array<PanelNode> => {
    const out: Array<PanelNode> = []
    if (union.length === 0)
      return [panel.text(tr('doc.noParts'), { muted: true })]
    const head = [
      headerCell(dc, 'doc.numberColumn'),
      headerCell(dc, 'doc.partColumn'),
      headerCell(dc, 'doc.typeColumn'),
    ]
    if (dc.isFamily) head.push(headerCell(dc, 'doc.appearsColumn'))
    const rows: Array<TableRow> = [
          head,
          ...union.map((p) => {
            const row: TableRow = [
              propCell(dc, String(p.n), 'Number'),
              panel.text(p.name, { name: 'Part' }),
              propCell(dc, p.type, 'Type'),
            ]
            if (dc.isFamily) row.push(appearsCell(dc, p))
            return row
          }),
        ]
    out.push(panel.table(rows, { width: w, name: 'Parts' }))
    if (small.length > 0)
      out.push(
        subheading(dc, tr('doc.exploded')),
        wrapRows(dc, small, 'Exploded parts')
      )
    return out
  }

  const cards = anatomyCards(dc, specimenTitle(dc), stage, union.length, body, true)
  return {
    title: heading(dc, tr('view.ANATOMY')),
    cards,
  }
}
