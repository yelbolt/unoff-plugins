import { spacingOf } from './spacing'
import { radiiOf } from './properties'
import { drawLayoutOverlay } from './layout'
import { tr } from './i18n'
import { isRotated, rectBottom, rectRight, shapeRect } from './geometry'
import { formatLength } from './format'
import { labelSize } from './draw'
import { MARKER_NAME } from './constants'
import type { AnnotationStyle } from '../../app/types/annotations'
import type { Scale } from './scale'
import type { Placer } from './placement'
import type { Part } from './parts'
import type { Point, Rect } from './geometry'
import type { Pen } from './draw'

export interface RedlineCtx {
  pen: Pen
  placer: Placer
  sc: Scale
  style: AnnotationStyle
  // Labels never leave these bounds (the specimen stage).
  bounds?: Rect
}

export type Category = 'SIZE' | 'PADDING' | 'GAP' | 'RADIUS' | 'LAYOUT'

const OUT = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

// Keeps a label rect inside the stage so it never reaches a title.
const inside = (rc: RedlineCtx, r: Rect): Rect => {
  const b = rc.bounds
  if (!b) return r
  const m = rc.sc.pad
  return {
    ...r,
    x: Math.max(b.x + m, Math.min(r.x, b.x + b.w - m - r.w)),
    y: Math.max(b.y + m, Math.min(r.y, b.y + b.h - m - r.h)),
  }
}

// Places a label by collision-aware search and draws it (with a leader to
// `anchor` when it had to move away).
const putLabel = (
  rc: RedlineCtx,
  text: string,
  anchor: Point,
  outwards: Array<Point>,
  axis: 'h' | 'v',
  span: number,
  extra: { dist0?: (o: Point, size: { w: number; h: number }) => number; leader?: boolean } = {}
): void => {
  const { placer, sc, style, pen } = rc
  const size = labelSize(text, sc)
  const best = placer.findBestSide(outwards, (o) => ({
    size,
    anchor,
    outward: o,
    axis,
    span,
    pref: style.labelPlacement,
    dist0: extra.dist0?.(o, size),
    outsideNeedsLeader: extra.leader,
  }))
  const rect = inside(rc, best.placement.rect)
  const moved =
    Math.abs(rect.x - best.placement.rect.x) > 0.01 ||
    Math.abs(rect.y - best.placement.rect.y) > 0.01
  placer.commit(rect)
  if (best.placement.leader || moved)
    pen.leader(
      anchor,
      rect,
      Math.abs(best.outward.x) >= Math.abs(best.outward.y) ? 'h' : 'v'
    )
  pen.label(text, rect)
}

// Root: width line above/below and height line left/right, with extensions.
const rootDimensions = (rc: RedlineCtx, r: Rect, suffix: string): void => {
  const { pen, sc, style } = rc
  const wText = formatLength(r.w, style) + suffix
  const hText = formatLength(r.h, style) + suffix

  const lineY = (s: number) => (s > 0 ? rectBottom(r) + sc.offset : r.y - sc.offset)
  const wSize = labelSize(wText, sc)
  const wBest = rc.placer.findBestSide([OUT.up, OUT.down], (o) => ({
    size: wSize,
    anchor: { x: r.x + r.w / 2, y: lineY(o.y) },
    outward: o,
    axis: 'h',
    span: r.w,
    pref: style.labelPlacement,
  }))
  const sy = wBest.outward.y
  const y = lineY(sy)
  const edgeY = sy > 0 ? rectBottom(r) + sc.gap : r.y - sc.gap
  pen.line({ x: r.x, y: edgeY }, { x: r.x, y: y + sy * sc.tick }, { name: 'Extension' })
  pen.line({ x: rectRight(r), y: edgeY }, { x: rectRight(r), y: y + sy * sc.tick }, { name: 'Extension' })
  pen.measureH(r.x, rectRight(r), y)
  const wRect = inside(rc, wBest.placement.rect)
  rc.placer.commit(wRect)
  if (wBest.placement.leader)
    pen.leader({ x: r.x + r.w / 2, y }, wRect, 'v')
  pen.label(wText, wRect)

  const lineX = (s: number) => (s > 0 ? rectRight(r) + sc.offset : r.x - sc.offset)
  const hSize = labelSize(hText, sc)
  const hBest = rc.placer.findBestSide([OUT.left, OUT.right], (o) => ({
    size: hSize,
    anchor: { x: lineX(o.x), y: r.y + r.h / 2 },
    outward: o,
    axis: 'v',
    span: r.h,
    pref: style.labelPlacement,
  }))
  const sx = hBest.outward.x
  const x = lineX(sx)
  const edgeX = sx > 0 ? rectRight(r) + sc.gap : r.x - sc.gap
  pen.line({ x: edgeX, y: r.y }, { x: x + sx * sc.tick, y: r.y }, { name: 'Extension' })
  pen.line({ x: edgeX, y: rectBottom(r) }, { x: x + sx * sc.tick, y: rectBottom(r) }, { name: 'Extension' })
  pen.measureV(r.y, rectBottom(r), x)
  const hRect = inside(rc, hBest.placement.rect)
  rc.placer.commit(hRect)
  if (hBest.placement.leader)
    pen.leader({ x, y: r.y + r.h / 2 }, hRect, 'h')
  pen.label(hText, hRect)
}

// Marked part: dashed outline + one "W × H" label, inside when it fits.
const partDimensions = (rc: RedlineCtx, r: Rect, suffix: string): void => {
  const { sc, style, placer, pen } = rc
  const text = `${formatLength(r.w, style)} × ${formatLength(r.h, style)}${suffix}`
  pen.outline(r)
  const size = labelSize(text, sc)
  const center = { x: r.x + r.w / 2, y: r.y + r.h / 2 }
  if (style.labelPlacement !== 'OUTSIDE' && size.w <= r.w && size.h <= r.h) {
    const inside = { x: center.x - size.w / 2, y: center.y - size.h / 2, ...size }
    if (placer.isFree(inside)) {
      placer.commit(inside)
      pen.label(text, inside)
      return
    }
  }
  putLabel(
    rc,
    text,
    { x: center.x, y: rectBottom(r) },
    [OUT.down, OUT.up],
    'h',
    r.w,
    { dist0: (_o, s) => s.h / 2 + sc.gap }
  )
}

const paddings = (rc: RedlineCtx, part: Part, suffix: string): void => {
  const { pen, sc, style, placer } = rc
  const info = spacingOf(part.shape)
  if (!info) return
  const c = shapeRect(part.shape)
  const { pads } = info
  if (info.content) placer.obstacles.push(info.content)
  const bands: Array<[number, Rect, Point, boolean]> = [
    [pads.top, { x: c.x, y: c.y, w: c.w, h: pads.top }, OUT.up, true],
    [pads.bottom, { x: c.x, y: rectBottom(c) - pads.bottom, w: c.w, h: pads.bottom }, OUT.down, true],
    [pads.left, { x: c.x, y: c.y + pads.top, w: pads.left, h: c.h - pads.top - pads.bottom }, OUT.left, false],
    [pads.right, { x: rectRight(c) - pads.right, y: c.y + pads.top, w: pads.right, h: c.h - pads.top - pads.bottom }, OUT.right, false],
  ]
  for (const [value, band, outward, vertical] of bands) {
    if (value <= 0.005 || band.w <= 0 || band.h <= 0) continue
    const anchor = { x: band.x + band.w / 2, y: band.y + band.h / 2 }
    pen.rect(band, { fill: style.color, fillOpacity: 0.15, name: 'Inset' })
    if (vertical) pen.measureV(band.y, band.y + band.h, anchor.x)
    else pen.measureH(band.x, band.x + band.w, anchor.y)
    putLabel(
      rc,
      formatLength(value, style) + suffix,
      anchor,
      [outward],
      vertical ? 'v' : 'h',
      Math.abs(value),
      {
        dist0: (_o, s) =>
          Math.abs(value) / 2 +
          (Math.abs(outward.x) * s.w + Math.abs(outward.y) * s.h) / 2 +
          sc.gap,
        leader: true,
      }
    )
  }
}

const gaps = (rc: RedlineCtx, part: Part): void => {
  const { pen, style } = rc
  const info = spacingOf(part.shape)
  if (!info) return
  for (const g of info.gaps) {
    if (g.to - g.from <= 0.005) continue
    if (g.axis === 'h') {
      const y1 = Math.max(g.ra.y, g.rb.y)
      const y2 = Math.min(rectBottom(g.ra), rectBottom(g.rb))
      const y = (y1 + y2) / 2
      pen.rect({ x: g.from, y: y1, w: g.to - g.from, h: y2 - y1 }, { fill: style.color, fillOpacity: 0.15, name: 'Gap' })
      pen.measureH(g.from, g.to, y)
      putLabel(rc, formatLength(g.value, style), { x: (g.from + g.to) / 2, y }, [OUT.up, OUT.down], 'h', g.to - g.from)
    } else {
      const x1 = Math.max(g.ra.x, g.rb.x)
      const x2 = Math.min(rectRight(g.ra), rectRight(g.rb))
      const x = (x1 + x2) / 2
      pen.rect({ x: x1, y: g.from, w: x2 - x1, h: g.to - g.from }, { fill: style.color, fillOpacity: 0.15, name: 'Gap' })
      pen.measureV(g.from, g.to, x)
      putLabel(rc, formatLength(g.value, style), { x, y: (g.from + g.to) / 2 }, [OUT.right, OUT.left], 'v', g.to - g.from)
    }
  }
}

const radius = (rc: RedlineCtx, part: Part): void => {
  const { style } = rc
  const corners = radiiOf(part.shape)
  if (!corners) return
  const r = shapeRect(part.shape)
  const values = corners.map(([, v]) => v)
  const at: Array<[Point, Point]> = [
    [{ x: r.x, y: r.y }, { x: -1, y: -1 }],
    [{ x: rectRight(r), y: r.y }, { x: 1, y: -1 }],
    [{ x: rectRight(r), y: rectBottom(r) }, { x: 1, y: 1 }],
    [{ x: r.x, y: rectBottom(r) }, { x: -1, y: 1 }],
  ]
  const names = ['TL', 'TR', 'BR', 'BL']
  const uniform = values.every((v) => v === values[0])
  const list = uniform ? [0] : [0, 1, 2, 3]
  for (const i of list) {
    if (!values[i]) continue
    const text = `${uniform ? 'R' : names[i]} ${formatLength(values[i], style)}`
    putLabel(rc, text, at[i][0], [at[i][1]], 'h', 0, { leader: true })
  }
}

// Redlines of ONE category, drawn on its own specimen. Parts carry live
// shapes of the copy. Returns true when a measured part was rotated.
export const drawRedlines = (
  rc: RedlineCtx,
  parts: Array<Part>,
  category: Category
): boolean => {
  let rotated = false
  for (const part of parts) {
    const rot = isRotated(part.shape)
    rotated ||= rot
    const suffix = rot ? ` (${tr('bbox')})` : ''
    if (category === 'SIZE') {
      const r = shapeRect(part.shape)
      if (part.n === 0) rootDimensions(rc, r, suffix)
      else partDimensions(rc, r, suffix)
    } else if (category === 'PADDING') paddings(rc, part, suffix)
    else if (category === 'GAP') gaps(rc, part)
    else if (category === 'RADIUS') radius(rc, part)
  }
  if (category === 'LAYOUT') drawLayoutOverlay(rc, parts)
  return rotated
}

// Numbered markers in two aligned margin columns (left / right of the copy).
// Each pin sits at its part's height when the column has room, pushed down
// otherwise; its leader is orthogonal: along the row, one vertical elbow
// when the pin was pushed, then along the part's row to the anchor.
export const drawMarkers = (
  rc: RedlineCtx,
  parts: Array<Part>,
  root: Rect
): number => {
  const { pen, sc, placer } = rc
  const d = sc.pin
  const pitch = d + sc.gap * 2
  const midX = root.x + root.w / 2
  const marked = parts
    .filter((p) => p.n > 0)
    .sort((a, b) => shapeRect(a.shape).y - shapeRect(b.shape).y)

  // The pin columns clear every label already committed on their side.
  const obs = placer.obstacles
  const leftEdge = Math.min(root.x, ...obs.map((o) => o.x))
  const rightEdge = Math.max(rectRight(root), ...obs.map((o) => rectRight(o)))
  const colLeft = Math.min(root.x - sc.offset * 3.5, leftEdge - sc.offset) - d
  const colRight = Math.max(
    rectRight(root) + sc.offset * 3.5,
    rightEdge + sc.offset
  )

  interface Pin {
    part: Part
    anchor: Point
    left: boolean
    y: number // pin top
  }
  const pins: Array<Pin> = marked.map((part) => {
    const r = shapeRect(part.shape)
    const left = r.x + r.w / 2 < midX
    return {
      part,
      left,
      anchor: { x: left ? r.x : rectRight(r), y: r.y + r.h / 2 },
      y: r.y + r.h / 2 - d / 2,
    }
  })
  for (const side of [true, false]) {
    let floor = -Infinity
    for (const pin of pins.filter((p) => p.left === side)) {
      pin.y = Math.max(pin.y, floor)
      floor = pin.y + pitch
    }
  }

  let lane = 0
  const leaders: Array<() => void> = []
  const circles: Array<() => void> = []
  for (const pin of pins) {
    const x = pin.left ? colLeft : colRight
    const pr: Rect = { x, y: pin.y, w: d, h: d }
    placer.commit(pr)
    const cy = pin.y + d / 2
    const edge = pin.left ? x + d : x
    // Elbow lane between the column and the copy, staggered per pin.
    const laneX =
      edge + (pin.left ? 1 : -1) * sc.gap * (2 + (lane++ % 4)) * 1.5
    leaders.push(() => {
      pen.polyline(
        [
          { x: edge, y: cy },
          { x: laneX, y: cy },
          { x: laneX, y: pin.anchor.y },
          pin.anchor,
        ],
        { width: sc.stroke * 0.75, name: 'Marker leader' }
      )
      pen.dot(pin.anchor, sc.stroke * 3, 'Marker anchor')
    })
    circles.push(() => {
      pen.badge(String(pin.part.n), pr, {
        name: MARKER_NAME,
        textName: `${MARKER_NAME} number`,
        radius: d / 2,
        fixed: true,
        bold: true,
      })
    })
  }
  leaders.forEach((f) => f())
  circles.forEach((f) => f())
  return marked.length
}
