import {
  isContainer,
  safe,
  variantComponentsOf,
  variantPropertiesOf,
} from './target'
import { round2 } from './geometry'
import type { Shape, Text } from '@penpot/plugin-types'

// Stable hash of a documented target, stored at generation and recomputed on
// contentsave. It covers what the documentation shows: names, structure,
// size, layout paddings and gaps, radii, fills (refs included), strokes, text
// properties, shadows, blurs and `shape.tokens`.
//
// Determinism: object keys are written in a fixed order, token keys are
// sorted, variants are ordered by their property values. The root's absolute
// x/y is NOT covered, so moving the component never flags it; children carry
// their offset from the root, which is stable under a move.

type Json = string | number | boolean | null | Json[] | { [k: string]: Json }

const n = (v: unknown): number | null =>
  typeof v === 'number' && isFinite(v) ? round2(v) : null

const s = (v: unknown): string | null =>
  typeof v === 'string' ? v : v == null ? null : String(v)

const stringify = (v: unknown): string => {
  try {
    return JSON.stringify(v) ?? ''
  } catch {
    return ''
  }
}

const describe = (shape: Shape, origin: { x: number; y: number }, isRoot: boolean): Json => {
  const out: { [k: string]: Json } = {
    name: shape.name,
    type: shape.type,
    w: n(shape.width),
    h: n(shape.height),
    rot: n(shape.rotation),
    opacity: n(shape.opacity),
    hidden: Boolean(shape.hidden),
    radius: [
      n(shape.borderRadiusTopLeft),
      n(shape.borderRadiusTopRight),
      n(shape.borderRadiusBottomRight),
      n(shape.borderRadiusBottomLeft),
    ],
  }
  if (!isRoot) out.at = [n(shape.x - origin.x), n(shape.y - origin.y)]

  out.fills =
    shape.fills === 'mixed'
      ? 'mixed'
      : shape.fills.map((f) => [
          s(f.fillColor),
          n(f.fillOpacity),
          s(f.fillColorRefId),
          s(f.fillColorRefFile),
          f.fillColorGradient ? stringify(f.fillColorGradient) : null,
          f.fillImage ? s(f.fillImage.id) : null,
        ])
  out.strokes = shape.strokes.map((st) => [
    s(st.strokeColor),
    n(st.strokeOpacity),
    n(st.strokeWidth),
    s(st.strokeStyle),
    s(st.strokeAlignment),
    s(st.strokeColorRefId),
    st.strokeColorGradient ? stringify(st.strokeColorGradient) : null,
  ])
  out.shadows = shape.shadows.map((sh) => [
    s(sh.style),
    n(sh.offsetX),
    n(sh.offsetY),
    n(sh.blur),
    n(sh.spread),
    s(sh.color?.color),
    n(sh.color?.opacity),
    Boolean(sh.hidden),
  ])
  out.blur = shape.blur ? [n(shape.blur.value), Boolean(shape.blur.hidden)] : null
  out.bgBlur = shape.backgroundBlur
    ? [n(shape.backgroundBlur.value), Boolean(shape.backgroundBlur.hidden)]
    : null

  const tokens = shape.tokens as Record<string, unknown> | undefined
  out.tokens = tokens
    ? Object.keys(tokens)
        .sort()
        .map((k) => [k, s(tokens[k])])
    : []

  if (shape.type === 'board') {
    const l = shape.flex ?? shape.grid ?? null
    if (l)
      out.layout = [
        shape.flex ? 'flex' : 'grid',
        shape.flex ? s(shape.flex.dir) : null,
        shape.flex ? s(shape.flex.wrap) : null,
        shape.flex ? s(shape.flex.alignItems) : null,
        shape.flex ? s(shape.flex.justifyContent) : null,
        n(l.topPadding),
        n(l.rightPadding),
        n(l.bottomPadding),
        n(l.leftPadding),
        n(l.rowGap),
        n(l.columnGap),
      ]
  }
  const lc = shape.layoutChild
  if (lc)
    out.child = [
      n(lc.topMargin),
      n(lc.rightMargin),
      n(lc.bottomMargin),
      n(lc.leftMargin),
    ]

  if (shape.type === 'text') {
    const t = shape as Text
    out.text = [
      t.characters,
      s(t.fontFamily),
      s(t.fontSize),
      s(t.fontWeight),
      s(t.lineHeight),
      s(t.letterSpacing),
      s(t.textTransform),
      s(t.textDecoration),
      s(t.align),
      s(t.verticalAlign),
      s(t.growType),
    ]
  }

  if ('children' in shape && Array.isArray(shape.children))
    out.children = (shape.children as Array<Shape>).map((c) =>
      describe(c, origin, false)
    )
  return out
}

// cyrb53: small, deterministic, no dependency.
const hash = (str: string): string => {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16)
}

const subtree = (root: Shape): Json =>
  describe(root, { x: root.x, y: root.y }, true)

// `root` is the documented root: a variant container (FAMILY: every
// variant's main is covered) or a component / board (its own subtree).
export const fingerprintOf = (root: Shape): string => {
  if (isContainer(root) && root.variants) {
    const variants = root.variants
    const props = variantPropertiesOf(variants).map((p) => p.name)
    const entries = variantComponentsOf(variants)
      .map((c) => {
        const values = props.map((p) => c.variantProps?.[p] ?? '')
        const main = safe(() => c.mainInstance())
        return { key: values.join('\u0001'), values, main }
      })
      .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    return `fp1:${hash(
      stringify({
        family: root.name,
        props,
        variants: entries.map((e) => [
          e.values,
          e.main ? subtree(e.main) : null,
        ]),
      })
    )}`
  }
  return `fp1:${hash(stringify(subtree(root)))}`
}
