import { safe, variantLabel } from '../target'
import { Placer } from '../placement'
import { bindParts } from '../parts'
import { tr } from '../i18n'
import { Pen, estimateText } from '../draw'
import { BRAND, LAYOUT, RADIUS, SPACING } from '../constants'
import { docName } from './name'
import type { Board, Shape } from '@penpot/plugin-types'
import type { Resolved } from '../target'
import type { RefCtx } from '../refs'
import type { Part, PartPlan } from '../parts'
import type { Panel, PanelNode } from '../panel'
import type { MergedModel } from '../merged'
import type { Entry, StructureGroup } from '../groups'
import type { Rect } from '../geometry'
import type { PropertyOrder } from '../drivers'
import type { DrawEnv } from '../commit'
import type { Analysis } from '../analysis'
import type { PartsDetail } from '../../../app/types/annotations'

export interface ViewBuild {
  title?: PanelNode
  cards: Array<PanelNode>
}

export interface DocCtx {
  env: DrawEnv
  res: Resolved
  panel: Panel
  refs: RefCtx
  depth: PartsDetail
  isFamily: boolean
  entries: Array<Entry>
  structures: Array<StructureGroup>
  merged: MergedModel | null
  order: Array<PropertyOrder>
  analysis: Analysis
  filterNote: string | null
  colW: number
  state: { rotated: boolean; markers: number }
  track: <T extends Shape>(shape: T) => T
  pens: Array<Pen>
  copyOf: (entry: Entry) => Shape
}

export const px = (dc: DocCtx, n: number): number => n * dc.env.sc.k

export const bind = (plan: Array<PartPlan>, root: Shape): Array<Part> =>
  bindParts(plan, root)

export const heading = (dc: DocCtx, text: string): PanelNode =>
  dc.panel.text(text, {
    bold: true,
    font: 'title',
    size: dc.env.sc.font * 1.8,
    name: 'Title',
  })

export const subheading = (dc: DocCtx, text: string): PanelNode =>
  dc.panel.text(text, {
    bold: true,
    font: 'title',
    size: dc.env.sc.font * 1.15,
    name: 'Heading',
  })

export const propCell = (dc: DocCtx, text: string, name = 'Property'): PanelNode =>
  dc.panel.text(text, {
    font: 'title',
    muted: true,
    size: dc.env.sc.font * 0.9,
    name,
  })

export const refValue = (dc: DocCtx, value: string, ref?: string): PanelNode =>
  ref
    ? dc.panel.box(
        [
          dc.panel.text(value, { name: 'Value' }),
          dc.panel.chip(ref, { name: 'Reference' }),
        ],
        {
          dir: 'row',
          gap: px(dc, SPACING[8]),
          alignItems: 'center',
          name: 'Value',
        }
      )
    : dc.panel.text(value, { name: 'Value' })

export const spanW = (dc: DocCtx, span: number): number =>
  span * dc.colW + (span - 1) * px(dc, LAYOUT.cardGap)

export const contentW = (dc: DocCtx, span: number): number =>
  spanW(dc, span) - px(dc, LAYOUT.cardPad) * 2

export const variantNeed = (
  sc: { k: number; font: number; pad: number },
  instanceW: number,
  props: Record<string, string>
): number => {
  const entries = Object.entries(props)
  const key = Math.max(0, ...entries.map(([k]) => estimateText(k, sc.font).w))
  const val = Math.max(0, ...entries.map(([, v]) => estimateText(v, sc.font).w))
  const table = (key * 1.2 + val * 1.05) * 1.1 + LAYOUT.cellGap * sc.k
  return (
    Math.max(instanceW + LAYOUT.breath * sc.k * 2, table) +
    LAYOUT.cardPad * sc.k * 2
  )
}

/** The smallest span whose content width holds `need`; past the whole grid the card grows to the width it needs. */
export interface CardSize {
  span: number
  outer: number
  inner: number
}

export const sizeOf = (dc: DocCtx, span: number, need = 0): CardSize => {
  for (let s = span; s <= LAYOUT.gridColumns; s++)
    if (contentW(dc, s) >= need)
      return { span: s, outer: spanW(dc, s), inner: contentW(dc, s) }
  return {
    span: LAYOUT.gridColumns,
    outer: need + px(dc, LAYOUT.cardPad) * 2,
    inner: need,
  }
}

export const fixedSize = (dc: DocCtx, span: number): CardSize => ({
  span,
  outer: spanW(dc, span),
  inner: contentW(dc, span),
})

export const colWFor = (
  sc: { k: number },
  span: number,
  need: number
): number =>
  Math.ceil(
    (need + LAYOUT.cardPad * sc.k * 2 - (span - 1) * LAYOUT.cardGap * sc.k) /
      span
  )

export const card = (
  dc: DocCtx,
  kids: Array<PanelNode>,
  name: string,
  size: CardSize,
  join = false,
  breakBefore = false
): PanelNode => {
  const node = dc.panel.box(kids, {
    dir: 'column',
    gap: px(dc, LAYOUT.blockGap),
    pad: px(dc, LAYOUT.cardPad),
    fixedWidth: size.outer,
    fill: BRAND.dark,
    fillOpacity: BRAND.surfaceOpacity,
    radius: px(dc, RADIUS.board),
    name,
  })
  node.span = size.span
  node.join = join
  node.breakBefore = breakBefore
  return node
}

export const subCard = (
  dc: DocCtx,
  kids: Array<PanelNode>,
  name: string
): PanelNode =>
  dc.panel.box(kids, {
    dir: 'column',
    gap: px(dc, SPACING[8]),
    pad: px(dc, SPACING[16]),
    fill: BRAND.board,
    radius: px(dc, RADIUS.box),
    name,
  })

export const wrapRows = (
  dc: DocCtx,
  nodes: Array<PanelNode>,
  name: string
): PanelNode =>
  dc.panel.fillWidth(
    dc.panel.box(nodes, {
      dir: 'row',
      gap: px(dc, LAYOUT.cardGap),
      rowGap: px(dc, LAYOUT.rowGap),
      wrap: true,
      name,
    })
  )

export const groupLines = (dc: DocCtx, entries: Array<Entry>): Array<string> => {
  if (!dc.isFamily)
    return [
      dc.res.shown ? variantLabel(dc.res.shown) : docName(dc.res, false),
    ]
  if (entries.length >= dc.entries.length) return [tr('doc.allVariants')]
  return entries.map((e) => e.label)
}

export const titleBlock = (dc: DocCtx, entries: Array<Entry>): PanelNode => {
  const lines = groupLines(dc, entries)
  if (dc.isFamily && entries.length < dc.entries.length)
    return dc.panel.fillWidth(
      dc.panel.box(
        lines.map((l) => dc.panel.chip(l, { name: 'Variant' })),
        {
          dir: 'row',
          gap: px(dc, SPACING[8]),
          rowGap: px(dc, SPACING[8]),
          wrap: true,
          name: 'Group title',
        }
      )
    )
  return dc.panel.text(lines[0], {
    bold: true,
    font: 'title',
    name: 'Group title',
  })
}

export interface Stage {
  board: Board
  node: PanelNode
  rect: Rect
  copy: Shape
}

/** Absolutely positioned content lives only in a layout-free board, appended with fixed sizing so flex moves it along. */
export const makeStage = (
  dc: DocCtx,
  copy: Shape,
  tall = false
): Stage => {
  const mx = px(dc, LAYOUT.stageMarginX)
  const my = px(dc, tall ? LAYOUT.stageMarginYTall : LAYOUT.stageMarginY)
  const board = penpot.createBoard()
  dc.track(board)
  board.name = 'Stage'
  board.clipContent = false
  board.fills = []
  board.strokes = []
  const w = copy.width + mx * 2
  const h = copy.height + my * 2
  board.resize(w, h)
  board.x = 0
  board.y = 0
  safe(() => {
    board.horizontalSizing = 'fix'
    board.verticalSizing = 'fix'
  })
  board.appendChild(copy)
  copy.x = mx
  copy.y = my
  return {
    board,
    node: { shape: board, w, h },
    rect: { x: 0, y: 0, w, h },
    copy,
  }
}

export const centered = (dc: DocCtx, node: PanelNode): PanelNode =>
  dc.panel.fillWidth(
    dc.panel.box([node], {
      dir: 'row',
      gap: 0,
      justify: 'center',
      alignItems: 'center',
      name: 'Specimen row',
    }),
    node.w
  )

export const flushPen = (stage: Stage, pen: Pen, label: string): void => {
  if (pen.shapes.length === 0) return
  const g = pen.group(label)
  if (g) stage.board.appendChild(g)
}

export const newPen = (dc: DocCtx): Pen => {
  const pen = new Pen(dc.env.style, dc.env.sc)
  dc.pens.push(pen)
  return pen
}
export const newPlacer = (dc: DocCtx): Placer => new Placer([], dc.env.sc)
