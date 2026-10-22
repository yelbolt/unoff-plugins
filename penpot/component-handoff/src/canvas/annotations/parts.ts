import { visibleChildren } from './spacing'
import type { Shape } from '@penpot/plugin-types'
import type { PartsDetail } from '../../app/types/annotations'

export interface Part {
  n: number // 0 = the root, then 1..n in walk order
  shape: Shape
  level: number
  path: string // layer-name path relative to the root ('' for the root)
  idx: Array<number> // child indexes (visible children) from the root
}

// MAIN = direct children, ALL = every nested visible layer. Hidden parts are
// skipped.
export const walkParts = (root: Shape, depth: PartsDetail): Array<Part> => {
  const out: Array<Part> = []
  const max = depth === 'ALL' ? Infinity : 1
  const visit = (s: Shape, level: number, path: string, idx: Array<number>) => {
    out.push({ n: out.length, shape: s, level, path, idx })
    if (level >= max) return
    const kids = visibleChildren(s)
    const seen = new Map<string, number>()
    for (const k of kids) seen.set(k.name, (seen.get(k.name) ?? 0) + 1)
    const count = new Map<string, number>()
    kids.forEach((k, i) => {
      const c = (count.get(k.name) ?? 0) + 1
      count.set(k.name, c)
      const seg = (seen.get(k.name) ?? 1) > 1 ? `${k.name}#${c}` : k.name
      visit(k, level + 1, path ? `${path}/${seg}` : seg, [...idx, i])
    })
  }
  visit(root, 0, '', [])
  return out
}

// The numbering, computed ONCE. Anatomy, measurements and colors copies are
// structural clones, so each one binds this plan to its own shapes instead of
// walking again: the numbers cannot drift between views.
export interface PartPlan {
  n: number
  level: number
  path: string
  idx: Array<number>
  name: string
  type: string
}

export const planParts = (root: Shape, depth: PartsDetail): Array<PartPlan> =>
  walkParts(root, depth).map((p) => ({
    n: p.n,
    level: p.level,
    path: p.path,
    idx: p.idx,
    name: p.shape.name,
    type: p.shape.type,
  }))

export const bindParts = (plan: Array<PartPlan>, root: Shape): Array<Part> => {
  const out: Array<Part> = []
  for (const p of plan) {
    let cur: Shape | undefined = root
    for (const i of p.idx) cur = cur ? visibleChildren(cur)[i] : undefined
    if (cur)
      out.push({ n: p.n, shape: cur, level: p.level, path: p.path, idx: p.idx })
  }
  return out
}
