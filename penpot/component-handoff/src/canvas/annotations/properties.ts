import { parseNumericLike } from '../../utils/numeric'
import { spacingOf } from './spacing'
import { colorStyleName, matchTypography, tokenOf } from './refs'
import { tr } from './i18n'
import { boundsRect, isRotated, round2, trimNumber } from './geometry'
import { formatLength } from './format'
import type { Shape, Text, TokenProperty } from '@penpot/plugin-types'
import type { AnnotationStyle } from '../../app/types/annotations'
import type { RefCtx } from './refs'

export type PropFamily =
  | 'DIMENSIONS'
  | 'SPACING'
  | 'RADIUS'
  | 'FILLS_STROKES'
  | 'TYPOGRAPHY'
  | 'EFFECTS'

export const FAMILY_ORDER: Array<PropFamily> = [
  'DIMENSIONS',
  'SPACING',
  'RADIUS',
  'FILLS_STROKES',
  'TYPOGRAPHY',
  'EFFECTS',
]

export type RefKind = 'token' | 'style' | 'raw'

export interface PropertyRow {
  key: string // stable identity, used to compare variants
  label: string
  value: string // token name, else style name, else raw value
  ref: RefKind
  swatch?: string // hex of the color this row shows, when it is a plain color
}

export interface PropertyGroup {
  family: PropFamily
  rows: Array<PropertyRow>
}

interface Env {
  style: AnnotationStyle
  ctx: RefCtx
}

const hex = (c?: string): string => (c ? c.toUpperCase() : '')
const pct = (n: number): string => `${trimNumber(n * 100)}%`

// token, else style, else raw. Returns null when there is nothing to show.
const row = (
  key: string,
  label: string,
  raw: string,
  token?: string,
  styleName?: string,
  swatch?: string
): PropertyRow | null => {
  if (token) return { key, label, value: token, ref: 'token', swatch }
  if (styleName) return { key, label, value: styleName, ref: 'style', swatch }
  return raw ? { key, label, value: raw, ref: 'raw', swatch } : null
}

const compact = (rows: Array<PropertyRow | null>): Array<PropertyRow> =>
  rows.filter((r): r is PropertyRow => r !== null)

const dimensions = (s: Shape, { style, ctx }: Env): Array<PropertyRow> => {
  if (isRotated(s)) {
    const b = boundsRect(s)
    const suffix = ` (${tr('bbox')})`
    return compact([
      row('width', tr('prop.width') + suffix, formatLength(b.w, style)),
      row('height', tr('prop.height') + suffix, formatLength(b.h, style)),
      row(
        'rotation',
        tr('prop.rotation'),
        `${trimNumber(s.rotation)}°`,
        tokenOf(ctx, s, 'rotation')
      ),
    ])
  }
  return compact([
    row(
      'width',
      tr('prop.width'),
      formatLength(s.width, style),
      tokenOf(ctx, s, 'width')
    ),
    row(
      'height',
      tr('prop.height'),
      formatLength(s.height, style),
      tokenOf(ctx, s, 'height')
    ),
  ])
}

const spacing = (s: Shape, { style, ctx }: Env): Array<PropertyRow> => {
  const rows: Array<PropertyRow | null> = []
  const info = spacingOf(s)
  if (info) {
    const layout = info.source === 'layout'
    const pads: Array<[TokenProperty, number]> = [
      ['paddingTop', info.pads.top],
      ['paddingRight', info.pads.right],
      ['paddingBottom', info.pads.bottom],
      ['paddingLeft', info.pads.left],
    ]
    for (const [prop, v] of pads)
      rows.push(
        row(
          prop,
          tr(`prop.${prop}`),
          formatLength(v, style),
          layout ? tokenOf(ctx, s, prop) : undefined
        )
      )
    if (layout) {
      const l = s.type === 'board' ? (s.flex ?? s.grid) : null
      if (l) 
        rows.push(
          row(
            'rowGap',
            tr('prop.rowGap'),
            formatLength(l.rowGap, style),
            tokenOf(ctx, s, 'rowGap')
          ),
          row(
            'columnGap',
            tr('prop.columnGap'),
            formatLength(l.columnGap, style),
            tokenOf(ctx, s, 'columnGap')
          )
        )
      
    } else
      info.gaps.forEach((g, i) =>
        rows.push(
          row(
            `gap#${i}:${g.a.name}>${g.b.name}`,
            tr('prop.gapBetween', { from: g.a.name, to: g.b.name }),
            formatLength(g.value, style)
          )
        )
      )
    if (info.skipped > 0)
      rows.push(
        row(
          'skipped',
          tr('prop.gap'),
          tr('doc.skippedPairs', { count: info.skipped })
        )
      )
  }
  const lc = s.layoutChild
  if (lc) {
    const margins: Array<[TokenProperty, number]> = [
      ['marginTop', lc.topMargin],
      ['marginRight', lc.rightMargin],
      ['marginBottom', lc.bottomMargin],
      ['marginLeft', lc.leftMargin],
    ]
    for (const [prop, v] of margins) {
      const token = tokenOf(ctx, s, prop)
      if (v || token)
        rows.push(row(prop, tr(`prop.${prop}`), formatLength(v, style), token))
    }
  }
  return compact(rows)
}

export const radiiOf = (
  s: Shape
): Array<[TokenProperty, number]> | null => {
  const corners: Array<[TokenProperty, unknown]> = [
    ['borderRadiusTopLeft', s.borderRadiusTopLeft],
    ['borderRadiusTopRight', s.borderRadiusTopRight],
    ['borderRadiusBottomRight', s.borderRadiusBottomRight],
    ['borderRadiusBottomLeft', s.borderRadiusBottomLeft],
  ]
  if (corners.some(([, v]) => typeof v !== 'number')) return null
  return corners as Array<[TokenProperty, number]>
}

const radius = (s: Shape, { style, ctx }: Env): Array<PropertyRow> => {
  const corners = radiiOf(s)
  if (!corners) return []
  const tokens = corners.map(([p]) => tokenOf(ctx, s, p))
  const values = corners.map(([, v]) => v)
  const uniform =
    values.every((v) => v === values[0]) && tokens.every((t) => t === tokens[0])
  if (uniform) {
    if (!values[0] && !tokens[0]) return []
    return compact([
      row(
        'radius',
        tr('prop.radius'),
        formatLength(values[0], style),
        tokens[0]
      ),
    ])
  }
  return compact(
    corners.map(([p, v], i) =>
      row(p, tr(`prop.${p}`), formatLength(v, style), tokens[i])
    )
  )
}

const fillsStrokes = (s: Shape, { style, ctx }: Env): Array<PropertyRow> => {
  const rows: Array<PropertyRow | null> = []
  if (s.fills !== 'mixed')
    s.fills.forEach((f, i) => {
      let raw: string
      if (f.fillColor)
        raw =
          hex(f.fillColor) +
          (f.fillOpacity !== undefined && f.fillOpacity < 1
            ? ` ${pct(f.fillOpacity)}`
            : '')
      else if (f.fillColorGradient) raw = tr('prop.gradient')
      else if (f.fillImage) raw = tr('prop.image')
      else return
      rows.push(
        row(
          `fill#${i}`,
          tr('prop.fill'),
          raw,
          // shape.tokens.fill is a single binding: it names the first fill.
          i === 0 ? tokenOf(ctx, s, 'fill') : undefined,
          colorStyleName(ctx, f.fillColorRefId),
          f.fillColor
        )
      )
    })
  s.strokes.forEach((st, i) => {
    rows.push(
      row(
        `stroke#${i}`,
        tr('prop.stroke'),
        (st.strokeColor ? hex(st.strokeColor) : tr('prop.gradient')) +
          (st.strokeOpacity !== undefined && st.strokeOpacity < 1
            ? ` ${pct(st.strokeOpacity)}`
            : ''),
        i === 0 ? tokenOf(ctx, s, 'strokeColor') : undefined,
        colorStyleName(ctx, st.strokeColorRefId),
        st.strokeColor
      ),
      row(
        `strokeWidth#${i}`,
        tr('prop.strokeWidth'),
        formatLength(st.strokeWidth ?? 0, style),
        i === 0 ? tokenOf(ctx, s, 'strokeWidth') : undefined
      )
    )
  })
  return compact(rows)
}

const typography = (s: Shape, { style, ctx }: Env): Array<PropertyRow> => {
  if (s.type !== 'text') return []
  const t = s as Text
  const str = (v: unknown) => (typeof v === 'string' && v !== 'mixed' ? v : '')

  // A composite typography token covers every text property, line height
  // included (no TokenProperty exists for it).
  const composite = tokenOf(ctx, s, 'typography')
  if (composite)
    return [
      {
        key: 'typography',
        label: tr('prop.typography'),
        value: composite,
        ref: 'token',
      },
    ]

  const matched = matchTypography(ctx, t)
  const size = parseNumericLike(t.fontSize)
  const lh = parseNumericLike(t.lineHeight)
  const ls = parseNumericLike(t.letterSpacing)
  // Properties a matched style covers (when no token backs them).
  const covered = (token?: string) => (token ? undefined : matched)
  const styleLabel = (name: string) => `${name} ${tr('doc.matched')}`
  const rows: Array<PropertyRow | null> = []
  let styleShown = false
  const push = (
    key: string,
    label: string,
    raw: string,
    token: string | undefined
  ) => {
    const m = covered(token)
    if (m) {
      if (!styleShown)
        rows.push({
          key: 'typographyStyle',
          label: tr('prop.typography'),
          value: styleLabel(m),
          ref: 'style',
        })
      styleShown = true
      return
    }
    rows.push(row(key, label, raw, token))
  }
  push(
    'fontFamily',
    tr('prop.fontFamily'),
    str(t.fontFamily),
    tokenOf(ctx, s, 'fontFamilies')
  )
  push(
    'fontSize',
    tr('prop.fontSize'),
    isNaN(size) ? '' : formatLength(size, style),
    tokenOf(ctx, s, 'fontSize')
  )
  push(
    'fontWeight',
    tr('prop.fontWeight'),
    str(t.fontWeight),
    tokenOf(ctx, s, 'fontWeight')
  )
  push('lineHeight', tr('prop.lineHeight'), isNaN(lh) ? '' : trimNumber(lh), undefined)
  push(
    'letterSpacing',
    tr('prop.letterSpacing'),
    isNaN(ls) ? '' : trimNumber(ls),
    tokenOf(ctx, s, 'letterSpacing')
  )
  rows.push(
    row(
      'textCase',
      tr('prop.textCase'),
      str(t.textTransform),
      tokenOf(ctx, s, 'textCase')
    ),
    row(
      'textDecoration',
      tr('prop.textDecoration'),
      str(t.textDecoration),
      tokenOf(ctx, s, 'textDecoration')
    )
  )
  return compact(rows)
}

const effects = (s: Shape, { style, ctx }: Env): Array<PropertyRow> => {
  const rows: Array<PropertyRow | null> = []
  const opacityToken = tokenOf(ctx, s, 'opacity')
  if (s.opacity < 1 || opacityToken)
    rows.push(
      row('opacity', tr('prop.opacity'), pct(s.opacity), opacityToken)
    )
  s.shadows.forEach((sh, i) => {
    if (sh.hidden) return
    rows.push(
      row(
        `shadow#${i}`,
        sh.style === 'inner-shadow'
          ? tr('prop.innerShadow')
          : tr('prop.dropShadow'),
        `${trimNumber(sh.offsetX ?? 0)} ${trimNumber(sh.offsetY ?? 0)} ${trimNumber(sh.blur ?? 0)} ${trimNumber(sh.spread ?? 0)} ${hex(sh.color?.color)}`.trim(),
        i === 0 ? tokenOf(ctx, s, 'shadow') : undefined,
        undefined,
        sh.color?.color
      )
    )
  })
  if (s.blur && !s.blur.hidden)
    rows.push(
      row(
        'layerBlur',
        tr('prop.layerBlur'),
        formatLength(round2(s.blur.value ?? 0), style)
      )
    )
  if (s.backgroundBlur && !s.backgroundBlur.hidden)
    rows.push(
      row(
        'backgroundBlur',
        tr('prop.backgroundBlur'),
        formatLength(round2(s.backgroundBlur.value ?? 0), style)
      )
    )
  return compact(rows)
}

const READERS: Record<PropFamily, (s: Shape, e: Env) => Array<PropertyRow>> = {
  DIMENSIONS: dimensions,
  SPACING: spacing,
  RADIUS: radius,
  FILLS_STROKES: fillsStrokes,
  TYPOGRAPHY: typography,
  EFFECTS: effects,
}

export const collectProperties = (
  shape: Shape,
  families: Array<PropFamily>,
  style: AnnotationStyle,
  ctx: RefCtx
): Array<PropertyGroup> =>
  families
    .map((family) => ({ family, rows: READERS[family](shape, { style, ctx }) }))
    .filter((g) => g.rows.length > 0)
