import { round2, shapeRect, unionRects } from './geometry'
import type { Shape } from '@penpot/plugin-types'
import type { Rect } from './geometry'

export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

export interface GapInfo {
  a: Shape
  b: Shape
  axis: 'h' | 'v'
  value: number // layout gap when the container has a layout, else measured
  from: number // coordinate along the axis where the gap starts
  to: number
  ra: Rect
  rb: Rect
}

export interface SpacingInfo {
  source: 'layout' | 'computed'
  pads: Insets
  content: Rect | null
  gaps: Array<GapInfo>
  skipped: number // sibling pairs not measured (overlapping / diagonal)
}

export const visibleChildren = (shape: Shape): Array<Shape> =>
  'children' in shape && Array.isArray(shape.children)
    ? (shape.children as Array<Shape>).filter((c) => !c.hidden)
    : []

export const layoutOf = (shape: Shape) =>
  shape.type === 'board' ? (shape.flex ?? shape.grid ?? null) : null

const overlap1d = (a1: number, a2: number, b1: number, b2: number): boolean =>
  Math.min(a2, b2) - Math.max(a1, b1) > 0.001

// Paddings and gaps of one container, or null when there is nothing to
// measure. Layout containers report their layout values (what the panel
// shows); others report computed insets and measured distances.
export const spacingOf = (shape: Shape): SpacingInfo | null => {
  const kids = visibleChildren(shape)
  const rotated = shape.rotation % 360 !== 0
  const layout = rotated ? null : layoutOf(shape)
  if (kids.length === 0 && !layout) return null

  const c = shapeRect(shape)
  let pads: Insets
  let content: Rect | null = null
  if (layout)
    pads = {
      top: layout.topPadding,
      right: layout.rightPadding,
      bottom: layout.bottomPadding,
      left: layout.leftPadding,
    }
  else {
    content = unionRects(kids.map(shapeRect))
    pads = {
      top: round2(content.y - c.y),
      right: round2(c.x + c.w - (content.x + content.w)),
      bottom: round2(c.y + c.h - (content.y + content.h)),
      left: round2(content.x - c.x),
    }
  }

  const rects = new Map<string, Rect>(kids.map((k) => [k.id, shapeRect(k)]))
  const rowFirst = layout && shape.type === 'board' && shape.flex?.dir === 'row'
  const sorted = [...kids].sort((p, q) => {
    const a = rects.get(p.id) as Rect
    const b = rects.get(q.id) as Rect
    return rowFirst ? a.x - b.x || a.y - b.y : a.y - b.y || a.x - b.x
  })

  const gaps: Array<GapInfo> = []
  let skipped = 0
  for (let i = 0; i + 1 < sorted.length; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    const ra = rects.get(a.id) as Rect
    const rb = rects.get(b.id) as Rect
    const yOverlap = overlap1d(ra.y, ra.y + ra.h, rb.y, rb.y + rb.h)
    const xOverlap = overlap1d(ra.x, ra.x + ra.w, rb.x, rb.x + rb.w)
    if (yOverlap === xOverlap) {
      skipped++ // overlapping (both) or diagonal (neither)
      continue
    }
    const axis = yOverlap ? 'h' : 'v'
    const [lo, hi] =
      axis === 'h'
        ? ra.x <= rb.x
          ? [ra, rb]
          : [rb, ra]
        : ra.y <= rb.y
          ? [ra, rb]
          : [rb, ra]
    const from = axis === 'h' ? lo.x + lo.w : lo.y + lo.h
    const to = axis === 'h' ? hi.x : hi.y
    if (to - from < -0.001) {
      skipped++
      continue
    }
    const measured = round2(to - from)
    gaps.push({
      a,
      b,
      axis,
      value: layout ? (axis === 'h' ? layout.columnGap : layout.rowGap) : measured,
      from,
      to: Math.max(to, from),
      ra,
      rb,
    })
  }
  return {
    source: layout ? 'layout' : 'computed',
    pads,
    content,
    gaps,
    skipped,
  }
}
