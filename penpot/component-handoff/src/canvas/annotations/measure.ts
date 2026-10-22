import { spacingOf } from './spacing'
import { collectProperties } from './properties'
import { layoutRows } from './layout'
import type { Shape } from '@penpot/plugin-types'
import type { AnnotationStyle } from '../../app/types/annotations'
import type { RefCtx } from './refs'
import type { Category } from './redlines'
import type { PropertyRow } from './properties'

export type { Category }

// Display order of the measurement cards.
export const CATEGORIES: Array<Category> = ['SIZE', 'PADDING', 'GAP', 'RADIUS', 'LAYOUT']

export type MeasureRows = Record<Category, Array<PropertyRow>>

const nonZero = (r: PropertyRow): boolean =>
  r.ref === 'token' || parseFloat(r.value) !== 0

// The values the redlines of each category show, as the properties panel
// reports them: token name, else the raw value. Empty categories are simply
// empty arrays (the card is omitted).
export const measureRows = (
  shape: Shape,
  style: AnnotationStyle,
  refs: RefCtx
): MeasureRows => {
  const out: MeasureRows = {
    SIZE: [],
    PADDING: [],
    GAP: [],
    RADIUS: [],
    LAYOUT: layoutRows(shape, style, refs),
  }
  const info = spacingOf(shape)
  const hasGaps = (info?.gaps.length ?? 0) > 0
  const flex = shape.type === 'board' ? shape.flex : null
  // A flex layout spaces its children along one axis only.
  const gapAxis = flex
    ? String(flex.dir).startsWith('row')
      ? 'columnGap'
      : 'rowGap'
    : null

  const groups = collectProperties(
    shape,
    ['DIMENSIONS', 'SPACING', 'RADIUS'],
    style,
    refs
  )
  for (const g of groups)
    for (const r of g.rows) {
      const k = r.key
      if (k === 'width' || k === 'height') out.SIZE.push(r)
      else if (k.startsWith('padding')) {
        if (nonZero(r)) out.PADDING.push(r)
      } else if (k === 'rowGap' || k === 'columnGap') {
        if (hasGaps && (gapAxis === null || gapAxis === k) && nonZero(r))
          out.GAP.push(r)
      } else if (k.startsWith('gap#')) out.GAP.push(r)
      else if (k === 'radius' || k.startsWith('borderRadius'))
        out.RADIUS.push(r)
    }
  return out
}
