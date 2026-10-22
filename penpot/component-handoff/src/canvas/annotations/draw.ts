import { rectBottom, rectRight } from './geometry'
import type { Shape } from '@penpot/plugin-types'
import type { AnnotationStyle } from '../../app/types/annotations'
import type { Scale } from './scale'
import type { Point, Rect } from './geometry'

// WCAG relative luminance, no dependency.
export const contrastColor = (hex: string): string => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return '#FFFFFF'
  const channel = (i: number): number => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  const lum = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4)
  return lum > 0.5 ? '#000000' : '#FFFFFF'
}

const round1 = (n: number): number => Math.round(n * 10) / 10

export const estimateText = (
  str: string,
  fontSize: number
): { w: number; h: number } => {
  const lines = str.split('\n')
  return {
    w: Math.max(...lines.map((l) => l.length)) * fontSize * 0.62,
    h: lines.length * fontSize * 1.4,
  }
}

export const labelSize = (str: string, sc: Scale): { w: number; h: number } => {
  const e = estimateText(str, sc.font)
  return { w: Math.ceil(e.w + sc.pad * 3), h: Math.ceil(e.h + sc.pad * 1.5) }
}

// Collects every native shape of one annotation, then groups them.
export class Pen {
  shapes: Array<Shape> = []

  constructor(
    public style: AnnotationStyle,
    public sc: Scale
  ) {}

  private track<T extends Shape>(shape: T, name?: string): T {
    if (name) shape.name = name
    this.shapes.push(shape)
    return shape
  }

  // A solid filled rectangle: the only primitive for every line. Paths are
  // never used (their geometry is not reliably applied).
  bar(
    x: number,
    y: number,
    w: number,
    h: number,
    name: string,
    opacity = 1
  ): Shape {
    const bar = penpot.createRectangle()
    bar.resize(Math.max(w, 0.01), Math.max(h, 0.01))
    bar.x = x
    bar.y = y
    bar.fills = [{ fillColor: this.style.color, fillOpacity: opacity }]
    bar.strokes = []
    return this.track(bar, name)
  }

  // Orthogonal segment as a thin rectangle, extended by half its thickness at
  // both ends so connected segments meet cleanly. A diagonal request is
  // split into a horizontal then a vertical segment.
  line(
    a: Point,
    b: Point,
    opts: { width?: number; name?: string } = {}
  ): void {
    const t = opts.width ?? this.sc.stroke
    const dx = Math.abs(a.x - b.x)
    const dy = Math.abs(a.y - b.y)
    const name = opts.name ?? 'Line'
    if (dx < 0.001 && dy < 0.001) return
    if (dy < 0.001)
      this.bar(Math.min(a.x, b.x) - t / 2, a.y - t / 2, dx + t, t, name)
    else if (dx < 0.001)
      this.bar(a.x - t / 2, Math.min(a.y, b.y) - t / 2, t, dy + t, name)
    else {
      const elbow = { x: b.x, y: a.y }
      this.line(a, elbow, opts)
      this.line(elbow, b, opts)
    }
  }

  rect(
    r: Rect,
    opts: {
      fill?: string
      fillOpacity?: number
      stroke?: boolean
      radius?: number
      name?: string
    } = {}
  ): Shape {
    const rect = penpot.createRectangle()
    rect.resize(Math.max(r.w, 0.01), Math.max(r.h, 0.01))
    rect.x = r.x
    rect.y = r.y
    rect.fills = opts.fill
      ? [{ fillColor: opts.fill, fillOpacity: opts.fillOpacity ?? 1 }]
      : []
    rect.strokes = opts.stroke
      ? [
          {
            strokeColor: this.style.color,
            strokeOpacity: 1,
            strokeWidth: this.sc.stroke,
            strokeAlignment: 'inner',
          },
        ]
      : []
    if (opts.radius) rect.borderRadius = opts.radius
    return this.track(rect, opts.name ?? 'Rectangle')
  }

  dot(center: Point, diameter: number, name = 'Dot'): void {
    const e = penpot.createEllipse()
    e.resize(diameter, diameter)
    e.x = center.x - diameter / 2
    e.y = center.y - diameter / 2
    e.fills = [{ fillColor: this.style.color, fillOpacity: 1 }]
    e.strokes = []
    this.track(e, name)
  }

  // A pill or a disc holding one auto-width text, centered by flex alignment
  // (the text size is never read). `r` is the placed rect: a fixed badge
  // takes exactly its size; otherwise the pill fits the text, padded to match
  // the label size estimate, and hangs from the rect's top-left corner.
  badge(
    str: string,
    r: Rect,
    o: {
      name: string
      textName: string
      radius: number
      fixed?: boolean
      bold?: boolean
    }
  ): void {
    const board = penpot.createBoard()
    board.name = o.name
    board.clipContent = false
    board.fills = [{ fillColor: this.style.color, fillOpacity: 1 }]
    board.strokes = []
    board.borderRadius = o.radius
    const flex = board.addFlexLayout()
    flex.dir = 'row'
    flex.alignItems = 'center'
    flex.justifyContent = 'center'
    flex.horizontalPadding = o.fixed ? 0 : this.sc.pad * 1.5
    flex.verticalPadding = o.fixed ? 0 : this.sc.pad * 0.75

    const text = penpot.createText(str)
    if (text) {
      text.name = o.textName
      text.growType = 'auto-width'
      text.fontSize = String(round1(this.sc.font))
      if (o.bold) text.fontWeight = '700'
      text.fills = [
        { fillColor: contrastColor(this.style.color), fillOpacity: 1 },
      ]
      board.appendChild(text)
    }

    const sizing = o.fixed ? 'fix' : 'auto'
    board.horizontalSizing = sizing
    board.verticalSizing = sizing
    flex.horizontalSizing = sizing
    flex.verticalSizing = sizing
    if (o.fixed) {
      board.resize(Math.max(r.w, 1), Math.max(r.h, 1))
      board.horizontalSizing = 'fix'
      board.verticalSizing = 'fix'
    }
    board.x = r.x
    board.y = r.y
    this.track(board, o.name)
  }

  // Filled pill + text, named "Label".
  label(str: string, r: Rect): void {
    this.badge(str, r, {
      name: 'Label',
      textName: 'Label text',
      radius: Math.min(r.h / 2, 4 * this.sc.k),
    })
  }

  // Connected horizontal/vertical segments, one thin rectangle each.
  polyline(points: Array<Point>, opts: { width?: number; name?: string } = {}): void {
    for (let i = 1; i < points.length; i++)
      this.line(points[i - 1], points[i], opts)
  }

  // Dashed outline of a rectangle (a stroke-only rectangle, not lines).
  outline(r: Rect, name = 'Outline'): void {
    const rect = penpot.createRectangle()
    rect.resize(Math.max(r.w, 0.01), Math.max(r.h, 0.01))
    rect.x = r.x
    rect.y = r.y
    rect.fills = []
    rect.strokes = [
      {
        strokeColor: this.style.color,
        strokeOpacity: 1,
        strokeWidth: this.sc.stroke * 0.75,
        strokeStyle: 'dashed',
        strokeAlignment: 'inner',
      },
    ]
    this.track(rect, name)
  }

  // Orthogonal leader from `anchor` to the label rect: straight when the
  // anchor faces the rect, else one elbow. `prefer` is the axis it leaves the
  // anchor along (the label's outward direction).
  leader(anchor: Point, target: Rect, prefer: 'h' | 'v' = 'v'): void {
    const inX = anchor.x >= target.x && anchor.x <= rectRight(target)
    const inY = anchor.y >= target.y && anchor.y <= rectBottom(target)
    const nearX = anchor.x < target.x ? target.x : rectRight(target)
    const nearY = anchor.y < target.y ? target.y : rectBottom(target)
    const cx = target.x + target.w / 2
    const cy = target.y + target.h / 2
    let pts: Array<Point>
    if (inX) pts = [anchor, { x: anchor.x, y: nearY }]
    else if (inY) pts = [anchor, { x: nearX, y: anchor.y }]
    else if (prefer === 'v')
      pts = [anchor, { x: anchor.x, y: cy }, { x: nearX, y: cy }]
    else pts = [anchor, { x: cx, y: anchor.y }, { x: cx, y: nearY }]
    this.polyline(pts, { width: this.sc.stroke * 0.75, name: 'Leader' })
    this.dot(anchor, this.sc.stroke * 3, 'Leader anchor')
  }

  // Extension line + measure line with end ticks, horizontal measure.
  measureH(x1: number, x2: number, y: number): void {
    const t = this.sc.tick
    this.line({ x: x1, y }, { x: x2, y }, { name: 'Measure' })
    this.line({ x: x1, y: y - t }, { x: x1, y: y + t }, { name: 'Tick' })
    this.line({ x: x2, y: y - t }, { x: x2, y: y + t }, { name: 'Tick' })
  }

  measureV(y1: number, y2: number, x: number): void {
    const t = this.sc.tick
    this.line({ x, y: y1 }, { x, y: y2 }, { name: 'Measure' })
    this.line({ x: x - t, y: y1 }, { x: x + t, y: y1 }, { name: 'Tick' })
    this.line({ x: x - t, y: y2 }, { x: x + t, y: y2 }, { name: 'Tick' })
  }

  group(name: string): ReturnType<typeof penpot.group> {
    const group = penpot.group(this.shapes)
    if (group) group.name = name
    return group
  }
}
