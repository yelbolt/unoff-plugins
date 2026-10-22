import type { Shape } from '@penpot/plugin-types'

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const EPS = 0.01

export const round2 = (n: number): number => {
  const r = Math.round(n * 100) / 100
  return Object.is(r, -0) ? 0 : r
}

// Same rounding as the properties panel: max 2 decimals, no trailing zeros.
export const trimNumber = (n: number): string => String(round2(n))

export const boundsRect = (shape: Shape): Rect => ({
  x: shape.bounds.x,
  y: shape.bounds.y,
  w: shape.bounds.width,
  h: shape.bounds.height,
})

// Rect as the properties panel reports it: width/height for upright shapes,
// the bounding box for rotated ones.
export const shapeRect = (shape: Shape): Rect =>
  isRotated(shape)
    ? boundsRect(shape)
    : { x: shape.x, y: shape.y, w: shape.width, h: shape.height }

export const isRotated = (shape: Shape): boolean => {
  const r = (((shape.rotation ?? 0) % 360) + 360) % 360
  return r > EPS && r < 360 - EPS
}

export const rectRight = (r: Rect): number => r.x + r.w
export const rectBottom = (r: Rect): number => r.y + r.h
export const rectCenter = (r: Rect): Point => ({
  x: r.x + r.w / 2,
  y: r.y + r.h / 2,
})

// Strict overlap; `margin` inflates both rects.
export const intersects = (a: Rect, b: Rect, margin = 0): boolean =>
  a.x < b.x + b.w + margin - EPS &&
  b.x < a.x + a.w + margin - EPS &&
  a.y < b.y + b.h + margin - EPS &&
  b.y < a.y + a.h + margin - EPS

export const contains = (outer: Rect, inner: Rect): boolean =>
  outer.x <= inner.x + EPS &&
  outer.y <= inner.y + EPS &&
  outer.x + outer.w >= inner.x + inner.w - EPS &&
  outer.y + outer.h >= inner.y + inner.h - EPS

export const unionRects = (rects: Array<Rect>): Rect => {
  const x1 = Math.min(...rects.map((r) => r.x))
  const y1 = Math.min(...rects.map((r) => r.y))
  const x2 = Math.max(...rects.map((r) => r.x + r.w))
  const y2 = Math.max(...rects.map((r) => r.y + r.h))
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
}

export const closestPointOnRect = (r: Rect, p: Point): Point => ({
  x: Math.min(Math.max(p.x, r.x), r.x + r.w),
  y: Math.min(Math.max(p.y, r.y), r.y + r.h),
})
