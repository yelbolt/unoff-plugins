import { estimateText } from './draw'
import { BRAND, FONT_BODY, FONT_TITLE, LAYOUT, RADIUS, SPACING } from './constants'
import type { Board, Font, Shape, Text } from '@penpot/plugin-types'
import type { AnnotationStyle } from '../../app/types/annotations'
import type { Scale } from './scale'

// A shape built by the panel plus its ESTIMATED size. The estimate is derived
// from known numbers only (font size, character count, fixed sizes); it is
// never read back from the platform, because Penpot resolves auto layout
// asynchronously. It only balances columns and sizes things that are fixed
// up front. The layout itself is always done by native flex.
export interface PanelNode {
  shape: Shape
  w: number
  h: number
  lines?: number // text lines it holds
  span?: number // columns a card occupies (default 6)
  join?: boolean // card sticks to the previous one in the packing
  breakBefore?: boolean // card always starts a new row
  fill?: boolean // takes the width of its flex parent (layoutChild 'fill')
  outerW?: number // card only: real outer width, when wider than its span
}

// A table row: its cells (null = empty cell), or an empty array for a spacer
// between two groups of rows.
export type TableRow = Array<PanelNode | null>

interface BoxOptions {
  dir: 'row' | 'column'
  gap: number
  rowGap?: number // overrides the gap between wrapped rows
  pad?: number // all sides
  padX?: number // overrides the horizontal padding
  padY?: number // overrides the vertical padding
  fill?: string
  fillOpacity?: number
  radius?: number
  alignItems?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'space-between'
  wrap?: boolean // flex wrap; its width comes from a fixed or fill parent
  fixedWidth?: number
  name: string
}

export type FontRole = 'title' | 'body'

interface TextOptions {
  bold?: boolean
  weight?: 400 | 500 | 700
  muted?: boolean
  size?: number
  font?: FontRole
  name?: string
}

// Rough glyph widths relative to the default estimate, per brand font.
const WIDEN: Record<FontRole, number> = { title: 1.2, body: 1.05 }

// Builds property sheets / documentation as native flex boards and text.
export class Panel {
  // Every shape the panel created, so a failed draw can remove them all.
  readonly created: Array<Shape> = []
  // Dry runs: measure what a table needs, then drop the shapes it created.
  mark(): number {
    return this.created.length
  }

  discardFrom(mark: number): void {
    for (const s of this.created.splice(mark))
      try {
        s.remove()
      } catch {
        // already gone
      }
  }

  // Font lookups, done once per generation. null = missing, fall back.
  private fonts = new Map<string, Font | null>()

  constructor(
    private style: AnnotationStyle,
    private sc: Scale
  ) {}

  // A spacing value of the scale, in viewport-scaled px.
  sp(n: number): number {
    return n * this.sc.k
  }

  // Height of one text line, derived from the font size only.
  get lineHeight(): number {
    return Math.round(this.sc.font * 1.4)
  }

  private font(family: string): Font | null {
    if (!this.fonts.has(family)) {
      let found: Font | null = null
      try {
        found = penpot.fonts.findByName(family)
      } catch {
        found = null
      }
      this.fonts.set(family, found)
    }
    return this.fonts.get(family) ?? null
  }

  // Applies the brand font and weight. Silent fallback to the current
  // default when the font or the weight is missing.
  private applyFont(text: Text, role: FontRole, weight: number): void {
    const font = this.font(role === 'title' ? FONT_TITLE : FONT_BODY)
    try {
      if (font) {
        const normal = font.variants.filter((v) => v.fontStyle !== 'italic')
        const variant = normal.reduce<(typeof normal)[number] | undefined>(
          (best, v) =>
            !best ||
            Math.abs(Number(v.fontWeight) - weight) <
              Math.abs(Number(best.fontWeight) - weight)
              ? v
              : best,
          undefined
        )
        font.applyToText(text, variant)
        return
      }
    } catch {
      // fall through to the default font
    }
    if (weight >= 500) text.fontWeight = weight >= 700 ? '700' : '500'
  }

  // Auto-width text: never resized after creation, so it never wraps.
  text(str: string, o: TextOptions = {}): PanelNode {
    const size = o.size ?? this.sc.font
    const role = o.font ?? 'body'
    const weight = o.weight ?? (o.bold ? (role === 'title' ? 700 : 500) : 400)
    const text = penpot.createText(str)
    if (!text) throw new Error('Could not create text')
    this.created.push(text)
    text.name = o.name ?? 'Text'
    text.growType = 'auto-width'
    this.applyFont(text, role, weight)
    text.fontSize = String(Math.round(size * 10) / 10)
    text.fills = [
      {
        fillColor: BRAND.dark,
        fillOpacity: o.muted ? BRAND.mutedOpacity : 1,
      },
    ]
    const e = estimateText(str, size)
    return {
      shape: text,
      w: Math.ceil(e.w * WIDEN[role]),
      h: Math.ceil(e.h),
      lines: str.split('\n').length,
    }
  }

  // Marks a node as taking the width of its flex parent.
  fillWidth(node: PanelNode, estimatedW = node.w): PanelNode {
    node.fill = true
    node.w = estimatedW
    return node
  }

  // Transparent placeholder of a known size (empty cell, gap between groups).
  spacer(w: number, h: number): PanelNode {
    const rect = penpot.createRectangle()
    this.created.push(rect)
    rect.name = 'Spacer'
    rect.resize(Math.max(w, 1), Math.max(h, 1))
    rect.fills = []
    rect.strokes = []
    return { shape: rect, w, h, lines: 1 }
  }

  // Small color square; without a color, an empty square keeps columns aligned.
  swatch(color?: string): PanelNode {
    const size = Math.round(16 * this.sc.k)
    const rect = penpot.createRectangle()
    this.created.push(rect)
    rect.name = color ? 'Swatch' : 'Swatch spacer'
    rect.resize(size, size)
    rect.fills = color ? [{ fillColor: color, fillOpacity: 1 }] : []
    rect.strokes = color
      ? [
          {
            strokeColor: BRAND.dark,
            strokeOpacity: 0.2,
            strokeWidth: this.sc.stroke,
            strokeAlignment: 'inner',
          },
        ]
      : []
    rect.borderRadius = RADIUS.swatch * this.sc.k
    return { shape: rect, w: size, h: size, lines: 1 }
  }

  // A pill for a short value: fit sizing, padding 4/8, full radius, light
  // tint, body font.
  chip(str: string, o: { size?: number; name?: string } = {}): PanelNode {
    const size = o.size ?? this.sc.font * 0.9
    const label = this.text(str, { size, name: 'Chip text' })
    const h = label.h + this.sp(SPACING[4]) * 2
    return this.box([label], {
      dir: 'row',
      gap: 0,
      padX: this.sp(SPACING[8]),
      padY: this.sp(SPACING[4]),
      alignItems: 'center',
      fill: BRAND.dark,
      fillOpacity: BRAND.chipOpacity,
      radius: Math.ceil(h / 2),
      name: o.name ?? 'Chip',
    })
  }

  box(kids: Array<PanelNode>, o: BoxOptions): PanelNode {
    const padX = o.padX ?? o.pad ?? 0
    const padY = o.padY ?? o.pad ?? 0
    const board = penpot.createBoard()
    this.created.push(board)
    board.name = o.name
    board.clipContent = false
    const flex = board.addFlexLayout()
    flex.dir = o.dir
    flex.rowGap = o.rowGap ?? o.gap
    flex.columnGap = o.gap
    flex.horizontalPadding = padX
    flex.verticalPadding = padY
    if (o.wrap) flex.wrap = 'wrap'
    flex.alignItems = o.alignItems ?? 'start'
    if (o.justify) flex.justifyContent = o.justify
    this.auto(board, 'h')
    this.auto(board, 'v')
    // Called in the order of visual appearance.
    for (const k of kids) {
      board.appendChild(k.shape)
      if (k.fill) {
        const lc = k.shape.layoutChild
        if (lc) lc.horizontalSizing = 'fill'
      }
    }

    // Estimated size.
    const sum = (f: (k: PanelNode) => number) =>
      kids.reduce((n, k) => n + f(k), 0)
    const gaps = Math.max(0, kids.length - 1) * o.gap
    let ew =
      padX * 2 +
      (o.dir === 'row'
        ? sum((k) => k.w) + gaps
        : Math.max(0, ...kids.map((k) => k.w)))
    const eh =
      padY * 2 +
      (o.dir === 'column'
        ? sum((k) => k.h) + gaps
        : Math.max(0, ...kids.map((k) => k.h)))
    const lines =
      o.dir === 'column'
        ? sum((k) => k.lines ?? 1)
        : Math.max(1, ...kids.map((k) => k.lines ?? 1))
    if (o.fixedWidth !== undefined) {
      ew = o.fixedWidth
      this.fix(board, 'h')
      board.resize(Math.max(ew, 1), Math.max(eh, 1))
      // resize() may flip the other axis to fixed: assert it again.
      this.auto(board, 'v')
    }
    // Paint LAST: layout and sizing calls may reset fills on Penpot.
    board.fills = o.fill
      ? [{ fillColor: o.fill, fillOpacity: o.fillOpacity ?? 1 }]
      : []
    board.strokes = []
    if (o.radius) board.borderRadius = o.radius
    return { shape: board, w: ew, h: eh, lines }
  }

  private fix(board: Board, axis: 'h' | 'v'): void {
    if (axis === 'h') {
      board.horizontalSizing = 'fix'
      if (board.flex) board.flex.horizontalSizing = 'fix'
    } else {
      board.verticalSizing = 'fix'
      if (board.flex) board.flex.verticalSizing = 'fix'
    }
  }

  private auto(board: Board, axis: 'h' | 'v'): void {
    if (axis === 'h') {
      board.horizontalSizing = 'auto'
      if (board.flex) board.flex.horizontalSizing = 'auto'
    } else {
      board.verticalSizing = 'auto'
      if (board.flex) board.flex.verticalSizing = 'auto'
    }
  }

  // Estimated width each column needs (with a safety margin), from the cells'
  // known estimates.
  private colNeeds(rows: Array<TableRow>): Array<number> {
    const cols = Math.max(0, ...rows.map((r) => r.length))
    const needs: Array<number> = []
    for (let j = 0; j < cols; j++)
      needs.push(
        Math.max(1, Math.ceil(Math.max(0, ...rows.map((r) => r[j]?.w ?? 0)) * 1.1))
      )
    return needs
  }

  // Width a table needs so that no cell is narrower than its content.
  tableNeed(rows: Array<TableRow>): number {
    const needs = this.colNeeds(rows)
    return (
      needs.reduce((a, b) => a + b, 0) +
      Math.max(0, needs.length - 1) * this.sp(LAYOUT.cellGap)
    )
  }

  // A table, built ROW BY ROW: a flex column of FILL width, whose rows are
  // flex rows of fill width and fit height, whose cells are boards of FIXED
  // width (the table's width split by the columns' needs) and FIT height. A
  // multi-line cell grows its row and never overlaps the next one. Every row
  // uses the same column widths, so columns line up. `width` is the known
  // content width of the card holding the table.
  table(
    rows: Array<TableRow>,
    o: { width: number; name: string; rowGap?: number; colGap?: number }
  ): PanelNode {
    const colGap = o.colGap ?? this.sp(LAYOUT.cellGap)
    const needs = this.colNeeds(rows)
    const avail = Math.max(1, o.width - Math.max(0, needs.length - 1) * colGap)
    const total = needs.reduce((a, b) => a + b, 0)
    const widths =
      total <= avail
        ? needs.map((n, j) => (j === needs.length - 1 ? n + (avail - total) : n))
        : needs.map((n) => Math.max(1, Math.floor((n * avail) / total)))

    const body = rows.map((cells) => {
      if (cells.length === 0) return this.spacer(1, this.sp(SPACING[8]))
      const row = this.box(
        widths.map((w, j) => {
          const c = cells[j]
          return this.box([c ?? this.spacer(1, this.lineHeight)], {
            dir: 'row',
            gap: 0,
            alignItems: 'start',
            fixedWidth: w,
            name: 'Cell',
          })
        }),
        { dir: 'row', gap: colGap, alignItems: 'start', name: 'Row' }
      )
      return this.fillWidth(row, o.width)
    })
    return this.fillWidth(
      this.box(body, {
        dir: 'column',
        gap: o.rowGap ?? this.sp(LAYOUT.tableRowGap),
        name: o.name,
      }),
      o.width
    )
  }
}
