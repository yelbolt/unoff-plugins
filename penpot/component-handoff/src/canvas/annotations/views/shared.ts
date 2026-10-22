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
import type { PartsDetail } from '../../../app/types/annotations'

// A view: a title and its cards. Everything a card holds, specimen overlays
// included, is fully drawn when the view is returned.
export interface ViewBuild {
  title?: PanelNode
  cards: Array<PanelNode> // packed into the grid by the documentation, by span
}

export interface DocCtx {
  env: DrawEnv
  res: Resolved
  panel: Panel
  refs: RefCtx
  depth: PartsDetail
  isFamily: boolean
  entries: Array<Entry> // every documented variant (one for a component)
  structures: Array<StructureGroup> // SPLIT: computed once, shared by all views
  merged: MergedModel | null // MERGED (and any component): the union model
  order: Array<PropertyOrder> // variant properties, in the family's own order; only ticked values when filtered
  filterNote: string | null // set when the variant filter excludes something
  colW: number // width of one grid column, from known numbers
  state: { rotated: boolean; markers: number }
  track: <T extends Shape>(shape: T) => T
  pens: Array<Pen> // overlay pens, drained if the draw fails
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

// A property name (Martian Mono, secondary).
export const propCell = (dc: DocCtx, text: string, name = 'Property'): PanelNode =>
  dc.panel.text(text, {
    font: 'title',
    muted: true,
    size: dc.env.sc.font * 0.9,
    name,
  })

// A value followed by its reference tag (token, style, raw) as a chip right
// next to it.
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

// Outer width of `span` columns: a known number.
export const spanW = (dc: DocCtx, span: number): number =>
  span * dc.colW + (span - 1) * px(dc, LAYOUT.cardGap)

// Width a card of `span` columns offers to its content: a known number.
export const contentW = (dc: DocCtx, span: number): number =>
  spanW(dc, span) - px(dc, LAYOUT.cardPad) * 2

// Estimated width a variant card needs (instance or table, plus padding).
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

// The size of a card: its span, its outer width and the width left to its
// content. The span is the smallest one, from `span` up, whose content width
// holds `need` (a specimen stage, a table). When even the whole grid is too
// narrow, the card grows: it takes the full row and the width it needs.
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

// A card size of exactly `span` columns: never widened. A table that needs
// more is scaled down by the table itself.
export const fixedSize = (dc: DocCtx, span: number): CardSize => ({
  span,
  outer: spanW(dc, span),
  inner: contentW(dc, span),
})

// Column width that lets `span` columns hold a content `need` wide.
export const colWFor = (
  sc: { k: number },
  span: number,
  need: number
): number =>
  Math.ceil(
    (need + LAYOUT.cardPad * sc.k * 2 - (span - 1) * LAYOUT.cardGap * sc.k) /
      span
  )

// A card: a flex column of FIXED width (from its span) and fit height, on the
// light brand surface. Its children that hold containers use fill width. The
// documentation packs cards by span; `join` keeps one next to the previous.
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

// A smaller box inside a card (an exploded part).
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

// Sub-boxes of a wrapping flex row of FILL width: it wraps inside the card
// holding it and grows downwards.
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

// The variants a group covers: "All variants" when it covers every one, else
// one prop=value line per variant. A component is titled by its name.
export const groupLines = (dc: DocCtx, entries: Array<Entry>): Array<string> => {
  if (!dc.isFamily)
    return [
      dc.res.shown ? variantLabel(dc.res.shown) : docName(dc.res, false),
    ]
  if (entries.length >= dc.entries.length) return [tr('doc.allVariants')]
  return entries.map((e) => e.label)
}

// Component or family title: a title, or the variants a group covers as
// chips in a fill-width wrapping row.
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
  rect: Rect // where the stage is NOW, from known numbers
  copy: Shape
}

// Absolutely positioned content lives only here: a board with NO layout,
// sized up front from the copy's own width and height plus fixed margins.
// Everything (copy, redlines, markers, leaders) is drawn inside it, in
// coordinates relative to its position at creation. Appended afterwards into
// its card with fixed sizing, flex layout moves it and its children with it.
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

// Centres a fixed-size specimen in its card: a fill-width flex row whose
// content is justified to the centre. No offset is ever computed.
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
