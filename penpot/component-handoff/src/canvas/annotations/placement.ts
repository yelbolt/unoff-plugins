import { intersects } from './geometry'
import type { LabelPlacement } from '../../app/types/annotations'
import type { Scale } from './scale'
import type { Point, Rect } from './geometry'

export interface PlaceRequest {
  size: { w: number; h: number }
  // Midpoint of the measured span; leaders start here.
  anchor: Point
  // Unit direction pointing away from the measured element.
  outward: Point
  // Axis along which `span` is measured; the label "fits" when its extent on
  // that axis is <= span.
  axis: 'h' | 'v'
  span: number
  pref: LabelPlacement
  // Distance anchor -> label center for the natural OUTSIDE position.
  dist0?: number
  // Natural OUTSIDE position is not adjacent to the measured line (padding):
  // it needs a leader.
  outsideNeedsLeader?: boolean
}

export interface Placement {
  rect: Rect
  leader: boolean
}

// Collision-aware label placement. Obstacles = the measured design elements
// (where relevant) + labels already placed in the same layer.
export class Placer {
  constructor(
    public obstacles: Array<Rect>,
    private sc: Scale
  ) {}

  isFree(r: Rect): boolean {
    const m = this.sc.gap
    return !this.obstacles.some((o) => intersects(r, o, m))
  }

  commit(r: Rect): void {
    this.obstacles.push(r)
  }

  // Pure: does not register the rect.
  find(req: PlaceRequest): Placement {
    const { size, anchor, outward } = req
    const mk = (cx: number, cy: number): Rect => ({
      x: cx - size.w / 2,
      y: cy - size.h / 2,
      w: size.w,
      h: size.h,
    })
    const along = req.axis === 'h' ? size.w : size.h
    const fits = along <= req.span + 0.001
    const pref: LabelPlacement =
      req.pref === 'AUTO' ? (fits ? 'INSIDE' : 'OUTSIDE') : req.pref
    const half =
      (Math.abs(outward.x) * size.w + Math.abs(outward.y) * size.h) / 2
    const d0 = req.dist0 ?? half + this.sc.gap

    if (fits) {
      if (pref === 'INSIDE') {
        const r = mk(anchor.x, anchor.y)
        if (this.isFree(r)) return { rect: r, leader: false }
      }
      const r0 = mk(anchor.x + outward.x * d0, anchor.y + outward.y * d0)
      if (this.isFree(r0))
        return { rect: r0, leader: Boolean(req.outsideNeedsLeader) }
    }

    // Does not fit, or collides: step outward and sideways, with a leader.
    const perp: Point = { x: -outward.y, y: outward.x }
    const stepOut = half * 2 + this.sc.gap
    const stepSide =
      Math.abs(perp.x) * size.w + Math.abs(perp.y) * size.h + this.sc.gap
    const laterals = [0, 1, -1, 2, -2, 3, -3]
    let last: Rect = mk(
      anchor.x + outward.x * (d0 + stepOut),
      anchor.y + outward.y * (d0 + stepOut)
    )
    for (let i = 1; i <= 10; i++)
      for (const j of laterals) {
        const dist = d0 + i * stepOut
        const r = mk(
          anchor.x + outward.x * dist + perp.x * j * stepSide,
          anchor.y + outward.y * dist + perp.y * j * stepSide
        )
        last = r
        if (this.isFree(r)) return { rect: r, leader: true }
      }
    return { rect: last, leader: true }
  }

  // Try each outward direction (the side with room wins); prefer a placement
  // that needs no leader.
  findBestSide(
    outwards: Array<Point>,
    build: (outward: Point) => PlaceRequest
  ): { outward: Point; placement: Placement } {
    let first: { outward: Point; placement: Placement } | null = null
    for (const outward of outwards) {
      const placement = this.find(build(outward))
      if (!first) first = { outward, placement }
      if (!placement.leader) return { outward, placement }
    }
    return first as { outward: Point; placement: Placement }
  }
}
