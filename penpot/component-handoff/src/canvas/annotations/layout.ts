import { visibleChildren } from './spacing'
import { tokenOf } from './refs'
import { tr } from './i18n'
import { rectBottom, rectRight, shapeRect } from './geometry'
import { formatLength } from './format'
import { labelSize } from './draw'
import type { Shape, Track } from '@penpot/plugin-types'
import type { AnnotationStyle } from '../../app/types/annotations'
import type { RefCtx } from './refs'
import type { RedlineCtx } from './redlines'
import type { PropertyRow } from './properties'
import type { Part } from './parts'
import type { Point, Rect } from './geometry'
import type { Pen } from './draw'

// The Layout category: how a part lays out its children (flex / grid) and how
// it is sized inside its own parent (fix / fill / fit). Wording follows the
// Penpot properties panel: "fit" is the API's 'auto'.

const lv = (v: string): string => tr(`layout.${v}`)

const row = (
  key: string,
  label: string,
  value: string,
  token?: string
): PropertyRow => ({
  key,
  label,
  value: token ?? value,
  ref: token ? 'token' : 'raw',
})

// `1fr 1fr 120px` — flex tracks in fr, fixed in px, percent in %, auto.
export const trackText = (t: Track, style: AnnotationStyle): string => {
  const v = t.value ?? 0
  if (t.type === 'flex') return `${round(v)}fr`
  if (t.type === 'percent') return `${round(v)}%`
  if (t.type === 'fixed') return formatLength(v, style)
  return 'auto'
}
const round = (n: number): string => String(Math.round(n * 100) / 100)

const containerOf = (shape: Shape) =>
  shape.type === 'board' ? { flex: shape.flex ?? null, grid: shape.grid ?? null } : null

// Sizing in the parent's layout when there is one, else the container's own.
const sizingOf = (shape: Shape): { h?: string; v?: string } => {
  const box = containerOf(shape)
  const layout = box ? (box.flex ?? box.grid) : null
  const child = shape.layoutChild
  const own = box && shape.type === 'board' ? shape : null
  return {
    h: child?.horizontalSizing ?? layout?.horizontalSizing ?? own?.horizontalSizing,
    v: child?.verticalSizing ?? layout?.verticalSizing ?? own?.verticalSizing,
  }
}

export const layoutRows = (
  shape: Shape,
  style: AnnotationStyle,
  ctx: RefCtx
): Array<PropertyRow> => {
  const rows: Array<PropertyRow> = []
  const box = containerOf(shape)
  const flex = box?.flex ?? null
  const grid = box?.grid ?? null
  const layout = flex ?? grid

  if (box) {
    rows.push(
      row('layout.type', tr('prop.layoutType'), lv(flex ? 'flex' : grid ? 'grid' : 'none'))
    )
    if (layout) {
      rows.push(row('layout.dir', tr('prop.layoutDirection'), lv(String(layout.dir))))
      if (flex)
        rows.push(row('layout.wrap', tr('prop.layoutWrap'), lv(flex.wrap ?? 'nowrap')))
      if (layout.alignItems)
        rows.push(row('layout.alignItems', tr('prop.alignItems'), lv(layout.alignItems)))
      if (grid && grid.justifyItems)
        rows.push(row('layout.justifyItems', tr('prop.justifyItems'), lv(grid.justifyItems)))
      if (layout.justifyContent)
        rows.push(row('layout.justifyContent', tr('prop.justifyContent'), lv(layout.justifyContent)))
      if (layout.alignContent && (grid || flex?.wrap === 'wrap'))
        rows.push(row('layout.alignContent', tr('prop.alignContent'), lv(layout.alignContent)))
      rows.push(
        row('layout.rowGap', tr('prop.rowGap'), formatLength(layout.rowGap, style), tokenOf(ctx, shape, 'rowGap')),
        row('layout.columnGap', tr('prop.columnGap'), formatLength(layout.columnGap, style), tokenOf(ctx, shape, 'columnGap'))
      )
      if (grid) 
        rows.push(
          row('layout.columns', tr('prop.columns'), grid.columns.map((t) => trackText(t, style)).join(' ') || '—'),
          row('layout.rows', tr('prop.rows'), grid.rows.map((t) => trackText(t, style)).join(' ') || '—')
        )
      
    }
  }

  // Sizing in the parent's layout when there is one, else the container's own.
  const { h, v } = sizingOf(shape)
  const child = shape.layoutChild
  const sizing = (s: string): string => lv(s === 'auto' ? 'fit' : s)
  if (h) rows.push(row('layout.sizingH', tr('prop.sizingH'), sizing(h)))
  if (v) rows.push(row('layout.sizingV', tr('prop.sizingV'), sizing(v)))
  if (child) {
    const lim: Array<[string, string, number | null]> = [
      ['minWidth', 'prop.minWidth', child.minWidth],
      ['maxWidth', 'prop.maxWidth', child.maxWidth],
      ['minHeight', 'prop.minHeight', child.minHeight],
      ['maxHeight', 'prop.maxHeight', child.maxHeight],
    ]
    for (const [k, label, n] of lim)
      if (n !== null && n !== undefined)
        rows.push(row(`layout.${k}`, tr(label), formatLength(n, style)))
    if (child.absolute)
      rows.push(row('layout.absolute', tr('prop.absolute'), lv('yes')))
  }
  return rows
}

// ── Specimen overlay ──────────────────────────────────────────────────────

const contentRect = (shape: Shape, l: { topPadding: number; rightPadding: number; bottomPadding: number; leftPadding: number }): Rect => {
  const r = shapeRect(shape)
  return {
    x: r.x + l.leftPadding,
    y: r.y + l.topPadding,
    w: Math.max(r.w - l.leftPadding - l.rightPadding, 0),
    h: Math.max(r.h - l.topPadding - l.bottomPadding, 0),
  }
}

// Everything below is made of rectangles. `u` is the unit thickness; arrow
// heads are three stepped bars (1u, 3u, 5u long across).
type Axis = 'h' | 'v'
type Mode = 'fix' | 'fill' | 'fit'

const unit = (sc: RedlineCtx['sc']): number => Math.max(sc.stroke * 1.5, 1)

// A stepped head whose tip is at `tip`, pointing towards `s` (+1 / -1) along
// `axis`; it extends backwards 3u from the tip.
const head = (pen: Pen, u: number, tip: Point, axis: Axis, s: number): void => {
  for (let j = 0; j < 3; j++) {
    const len = u * (1 + 2 * j)
    const along = axis === 'h' ? tip.x : tip.y
    const start = s > 0 ? along - (j + 1) * u : along + j * u
    if (axis === 'h') pen.bar(start, tip.y - len / 2, u, len, 'Flow head')
    else pen.bar(tip.x - len / 2, start, len, u, 'Flow head')
  }
}

// Orthogonal arrow: a line and a stepped head.
const arrow = (pen: Pen, u: number, from: Point, to: Point): void => {
  pen.line(from, to, { width: u, name: 'Flow' })
  const axis: Axis = Math.abs(to.x - from.x) >= Math.abs(to.y - from.y) ? 'h' : 'v'
  head(pen, u, to, axis, Math.sign(axis === 'h' ? to.x - from.x : to.y - from.y))
}

// Sizing glyph along `axis` from a0 to a1, centred on the cross coordinate c.
// fix  |—|   a tick at each end
// fill ◄—►   heads point outward, to the edges
// fit  ►—◄   heads point inward, hugging the content
const glyph = (pen: Pen, u: number, mode: Mode, axis: Axis, a0: number, a1: number, c: number): Rect => {
  const at = (a: number): Point => (axis === 'h' ? { x: a, y: c } : { x: c, y: a })
  const half = u * 3.5
  pen.line(at(a0), at(a1), { width: u, name: 'Sizing' })
  if (mode === 'fix') 
    for (const a of [a0, a1])
      pen.line(
        axis === 'h' ? { x: a, y: c - half } : { x: c - half, y: a },
        axis === 'h' ? { x: a, y: c + half } : { x: c + half, y: a },
        { width: u, name: 'Sizing tick' }
      )
   else if (a1 - a0 >= u * 8) {
    const inward = mode === 'fit'
    head(pen, u, at(inward ? a0 + 3 * u : a0), axis, inward ? 1 : -1)
    head(pen, u, at(inward ? a1 - 3 * u : a1), axis, inward ? -1 : 1)
  }
  return axis === 'h'
    ? { x: a0, y: c - half, w: a1 - a0, h: half * 2 }
    : { x: c - half, y: a0, w: half * 2, h: a1 - a0 }
}

const modeOf = (s: string | undefined): Mode | null =>
  s === 'fix' || s === 'fill' ? s : s === 'auto' ? 'fit' : null

// Keeps a pill inside the stage.
const clampTo = (rc: RedlineCtx, r: Rect): Rect => {
  const b = rc.bounds
  if (!b) return r
  const m = rc.sc.pad
  return {
    ...r,
    x: Math.max(b.x + m, Math.min(r.x, b.x + b.w - m - r.w)),
    y: Math.max(b.y + m, Math.min(r.y, b.y + b.h - m - r.h)),
  }
}

// First free candidate wins (the Placer knows glyphs and earlier pills); the
// first candidate is used when none is free.
const putPill = (
  rc: RedlineCtx,
  text: string,
  candidates: (s: { w: number; h: number }) => Array<Rect>
): void => {
  const list = candidates(labelSize(text, rc.sc)).map((r) => clampTo(rc, r))
  const r = list.find((x) => rc.placer.isFree(x)) ?? list[0]
  rc.placer.commit(r)
  rc.pen.label(text, r)
}

// Track sizes along one axis, resolved against the available length.
const resolveTracks = (tracks: Array<Track>, avail: number, gap: number): Array<number> => {
  const free = Math.max(avail - gap * Math.max(tracks.length - 1, 0), 0)
  let used = 0
  let fr = 0
  const out = tracks.map((t) => {
    const v = t.value ?? 0
    if (t.type === 'fixed') return (used += v), v
    if (t.type === 'percent') return (used += (v / 100) * avail), (v / 100) * avail
    if (t.type === 'flex') return (fr += v), -v
    return 0
  })
  const rest = Math.max(free - used, 0)
  return out.map((s) => (s < 0 ? (fr > 0 ? (rest * -s) / fr : 0) : s))
}

// The overlay of every listed part. Pass 1 draws outlines, glyphs, arrows and
// brackets and registers them as obstacles; pass 2 places the pills so none
// lands on a glyph. Nothing is drawn over a part's content.
export const drawLayoutOverlay = (rc: RedlineCtx, parts: Array<Part>): void => {
  const { pen, sc, placer, style } = rc
  const u = unit(sc)
  const g = sc.gap * 2 // distance between a part and its glyph
  const half = u * 3.5
  const pills: Array<() => void> = []

  for (const part of parts) {
    const shape = part.shape
    const r = shapeRect(shape)
    if (part.n > 0) pen.outline(r, 'Part outline')

    // Horizontal sizing: along the bottom edge.
    const sz = sizingOf(shape)
    const hm = modeOf(sz.h)
    if (hm && r.w > 0) {
      const cy = rectBottom(r) + g + half
      const gr = glyph(pen, u, hm, 'h', r.x, rectRight(r), cy)
      placer.commit(gr)
      const text = tr(`layout.${hm}`)
      pills.push(() =>
        putPill(rc, text, (s) => [
          { x: gr.x + gr.w / 2 - s.w / 2, y: rectBottom(gr) + sc.gap, ...s },
          { x: rectRight(gr) + sc.gap, y: cy - s.h / 2, ...s },
          { x: gr.x - sc.gap - s.w, y: cy - s.h / 2, ...s },
          ...[1, -1, 2, -2].map((j) => ({
            x: gr.x + gr.w / 2 - s.w / 2 + j * (s.w + sc.gap),
            y: rectBottom(gr) + sc.gap,
            ...s,
          })),
          { x: gr.x + gr.w / 2 - s.w / 2, y: rectBottom(gr) + sc.gap * 2 + s.h, ...s },
        ])
      )
    }

    // Vertical sizing: along the right edge.
    const vm = modeOf(sz.v)
    if (vm && r.h > 0) {
      const cx = rectRight(r) + g + half
      const gr = glyph(pen, u, vm, 'v', r.y, rectBottom(r), cx)
      placer.commit(gr)
      const text = tr(`layout.${vm}`)
      pills.push(() =>
        putPill(rc, text, (s) => {
          const my = gr.y + gr.h / 2
          return [
            { x: rectRight(gr) + sc.gap, y: my - s.h / 2, ...s },
            { x: cx - s.w / 2, y: rectBottom(gr) + sc.gap, ...s },
            { x: cx - s.w / 2, y: gr.y - sc.gap - s.h, ...s },
            ...[1, -1, 2, -2].map((j) => ({
              x: rectRight(gr) + sc.gap,
              y: my - s.h / 2 + j * (s.h + sc.gap),
              ...s,
            })),
            { x: rectRight(gr) + sc.gap * 2 + s.w, y: my - s.h / 2, ...s },
          ]
        })
      )
    }

    const box = containerOf(shape)
    if (box?.flex) {
      const f = box.flex
      const horizontal = String(f.dir).startsWith('row')
      const reverse = String(f.dir).endsWith('reverse')
      // Direction arrow beside the container: above a row, left of a column.
      if (horizontal && r.w > 0) {
        const y = r.y - g - u * 2.5
        arrow(
          pen,
          u,
          { x: reverse ? rectRight(r) : r.x, y },
          { x: reverse ? r.x : rectRight(r), y }
        )
        placer.commit({ x: r.x, y: y - u * 2.5, w: r.w, h: u * 5 })
      } else if (!horizontal && r.h > 0) {
        const x = r.x - g - u * 2.5
        arrow(
          pen,
          u,
          { x, y: reverse ? rectBottom(r) : r.y },
          { x, y: reverse ? r.y : rectBottom(r) }
        )
        placer.commit({ x: x - u * 2.5, y: r.y, w: u * 5, h: r.h })
      }

      // Gap between the first two consecutive children, as a bracket.
      const kids = visibleChildren(shape)
        .filter((k) => !k.layoutChild?.absolute)
        .map(shapeRect)
        .sort((a, b) => (horizontal ? a.x - b.x : a.y - b.y))
      for (let i = 1; i < kids.length; i++) {
        const a = kids[i - 1]
        const b = kids[i]
        const from = horizontal ? rectRight(a) : rectBottom(a)
        const to = horizontal ? b.x : b.y
        const lo = horizontal ? Math.max(a.y, b.y) : Math.max(a.x, b.x)
        const hi = horizontal
          ? Math.min(rectBottom(a), rectBottom(b))
          : Math.min(rectRight(a), rectRight(b))
        if (to - from <= 0.005 || hi - lo <= 0) continue
        const t = u * 5
        if (horizontal) {
          pen.line({ x: from, y: lo }, { x: to, y: lo }, { width: u, name: 'Gap bracket' })
          pen.line({ x: from, y: lo }, { x: from, y: lo + t }, { width: u, name: 'Gap bracket' })
          pen.line({ x: to, y: lo }, { x: to, y: lo + t }, { width: u, name: 'Gap bracket' })
        } else {
          pen.line({ x: lo, y: from }, { x: lo, y: to }, { width: u, name: 'Gap bracket' })
          pen.line({ x: lo, y: from }, { x: lo + t, y: from }, { width: u, name: 'Gap bracket' })
          pen.line({ x: lo, y: to }, { x: lo + t, y: to }, { width: u, name: 'Gap bracket' })
        }
        const text = formatLength(to - from, style)
        const s = labelSize(text, sc)
        const pill: Rect | null = horizontal
          ? s.w <= to - from && lo + t + sc.gap + s.h <= hi
            ? { x: (from + to) / 2 - s.w / 2, y: lo + t + sc.gap, ...s }
            : null
          : s.h <= to - from && lo + t + sc.gap + s.w <= hi
            ? { x: lo + t + sc.gap, y: (from + to) / 2 - s.h / 2, ...s }
            : null
        if (pill)
          pills.push(() => {
            if (!placer.isFree(pill)) return
            placer.commit(pill)
            pen.label(text, pill)
          })
        break
      }
    } else if (box?.grid) {
      const gd = box.grid
      const c = contentRect(shape, gd)
      if (c.w <= 0 || c.h <= 0) continue
      const widths = resolveTracks(gd.columns, c.w, gd.columnGap)
      const heights = resolveTracks(gd.rows, c.h, gd.rowGap)
      if (widths.length * heights.length > 100) continue
      let y = c.y
      heights.forEach((h) => {
        let x = c.x
        widths.forEach((w) => {
          if (w > 0.5 && h > 0.5) pen.outline({ x, y, w, h }, 'Grid cell')
          x += w + gd.columnGap
        })
        y += h + gd.rowGap
      })
    }
  }
  pills.forEach((f) => f())
}
