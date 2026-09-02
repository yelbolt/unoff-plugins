import { parseNumericLike, roundNumeric } from '../../utils/numeric'
import type { Shape, TokenProperty } from '@penpot/plugin-types'
import type { TraversedShape } from '../traversal/select'
import type { TokenCategory } from '../../app/types/tokens'
import type { OccurrenceOwnership } from '../../app/types/audit'

/**
 * One auditable (propertyPath, rawValue) pair found on a shape, already
 * resolved against component-instance inheritance — never an
 * inherited/computed value.
 */
export interface RawOccurrenceCandidate {
  shapeId: string
  shapeName: string
  propertyPath: string
  category: TokenCategory
  rawValue: string | number
  /**
   * Penpot TokenProperty name(s) this value maps to for `shape.applyToken`.
   * Empty array = no discrete TokenProperty targets this value alone
   * (currently only `lineHeight`) — apply must refuse with
   * ApplySkipReason.TYPE_INCOMPATIBLE rather than touch anything.
   */
  tokenProperties: TokenProperty[]
  ownership: OccurrenceOwnership
  componentMainId?: string
  /**
   * The shape whose `.tokens` map actually governs this property, and
   * where a fix must be written. Equal to the traversed shape itself,
   * except when the property is inherited unmodified from a component's
   * main instance (ownership redirected to 'MAIN_COMPONENT' below) — an
   * instance that never overrides a property carries no token binding of
   * its own for it, only the main shape does.
   */
  ownerShape: Shape
  isHidden: boolean
  isLocked: boolean
  isOffBoard: boolean
}

/**
 * Reads the raw value at a canonical property path off any shape. Used both
 * to enumerate a shape's own properties and, for component instances, to
 * read the same path off `componentRefShape()` so a genuine override can be
 * told apart from an inherited value.
 */
export const readValueAtPath = (
  shape: Shape,
  propertyPath: string
): string | number | undefined => {
  const fillMatch = propertyPath.match(/^fills\[(\d+)]\.fillColor$/)
  if (fillMatch)
    return shape.fills === 'mixed'
      ? undefined
      : shape.fills[Number(fillMatch[1])]?.fillColor

  const strokeColorMatch = propertyPath.match(/^strokes\[(\d+)]\.strokeColor$/)
  if (strokeColorMatch)
    return shape.strokes[Number(strokeColorMatch[1])]?.strokeColor

  const strokeWidthMatch = propertyPath.match(/^strokes\[(\d+)]\.strokeWidth$/)
  if (strokeWidthMatch)
    return shape.strokes[Number(strokeWidthMatch[1])]?.strokeWidth

  if (propertyPath === 'borderRadius') return shape.borderRadius
  if (propertyPath === 'width') return shape.width
  if (propertyPath === 'height') return shape.height

  if (propertyPath.startsWith('flexLayout.')) {
    if (!penpot.utils.types.isBoard(shape) || !shape.flex) return undefined
    const field = propertyPath.slice('flexLayout.'.length) as
      | 'rowGap'
      | 'columnGap'
      | 'topPadding'
      | 'rightPadding'
      | 'bottomPadding'
      | 'leftPadding'
    return shape.flex[field]
  }

  if (penpot.utils.types.isText(shape)) {
    // fontSize/lineHeight/letterSpacing are typed `string | 'mixed'` at
    // runtime; 'mixed' means multiple runs with different values, and a
    // bare `Number(...)` would turn that into NaN — see parseNumericLike.
    if (propertyPath === 'fontSize') return parseNumericLike(shape.fontSize)
    if (propertyPath === 'fontWeight') return shape.fontWeight
    if (propertyPath === 'lineHeight') return parseNumericLike(shape.lineHeight)
    if (propertyPath === 'letterSpacing')
      return parseNumericLike(shape.letterSpacing)
  }

  return undefined
}

// Corner properties are the only TokenProperty Penpot exposes for radius —
// there is no flat 'borderRadius' TokenProperty. Applying a radius token
// means writing all four.
const RADIUS_TOKEN_PROPERTIES: TokenProperty[] = [
  'borderRadiusTopLeft',
  'borderRadiusTopRight',
  'borderRadiusBottomRight',
  'borderRadiusBottomLeft',
]

const FLEX_TOKEN_PROPERTY: Record<string, TokenProperty> = {
  'flexLayout.rowGap': 'rowGap',
  'flexLayout.columnGap': 'columnGap',
  'flexLayout.topPadding': 'paddingTop',
  'flexLayout.rightPadding': 'paddingRight',
  'flexLayout.bottomPadding': 'paddingBottom',
  'flexLayout.leftPadding': 'paddingLeft',
}

const push = (
  candidates: RawOccurrenceCandidate[],
  traversed: TraversedShape,
  propertyPath: string,
  category: TokenCategory,
  // Typed `string | number | undefined` per the .d.ts, but an unset
  // color/stroke property can come back as `null` at runtime (e.g.
  // `fillColor` on a fill bound to a library color reference). `== null`
  // catches both so it never becomes an "auditable" candidate.
  rawValue: string | number | null | undefined,
  tokenProperties: TokenProperty[]
): void => {
  if (rawValue == null) return

  // Collapse floating-point noise (see roundNumeric) before this value
  // becomes a grouping key or is shown to the user. Also drop NaN values
  // (a 'mixed' text run, or an unparseable string) the same way as null.
  const normalizedRawValue: string | number =
    typeof rawValue === 'number' ? roundNumeric(rawValue) : rawValue
  if (
    typeof normalizedRawValue === 'number' &&
    Number.isNaN(normalizedRawValue)
  )
    return

  let ownership = traversed.ownership
  let shapeId = traversed.shape.id
  let shapeName = traversed.shape.name
  let ownerShape = traversed.shape
  let componentMainId: string | undefined

  if (traversed.ownership === 'INSTANCE_OVERRIDE') {
    const refShape = traversed.componentRefShape
    const rawRefValue = refShape
      ? readValueAtPath(refShape, propertyPath)
      : undefined
    // Round the reference side too, otherwise two identical values with
    // independent float noise could be misread as a real override.
    const refValue: string | number | undefined =
      typeof rawRefValue === 'number' ? roundNumeric(rawRefValue) : rawRefValue

    if (refShape && refValue !== undefined && refValue === normalizedRawValue) {
      // Not a genuine override — the instance mirrors its main unchanged,
      // so the main shape (not this instance) is the one that carries the
      // token binding, if any. Checking compliance against the instance
      // here would always read an empty `.tokens` map and misreport an
      // already-tokened property as a raw-value deviation.
      ownership = 'MAIN_COMPONENT'
      shapeId = refShape.id
      shapeName = refShape.name
      ownerShape = refShape
    } else componentMainId = refShape?.id
  }
  // MAIN_COMPONENT (naturally traversed, or redirected above): deviations
  // inside a component are counted once, on the main component — this
  // occurrence IS that single count.

  candidates.push({
    shapeId,
    shapeName,
    propertyPath,
    category,
    rawValue: normalizedRawValue,
    tokenProperties,
    ownership,
    componentMainId,
    ownerShape,
    isHidden: traversed.isHidden,
    isLocked: traversed.isLocked,
    isOffBoard: traversed.isOffBoard,
  })
}

/** Enumerates every auditable (propertyPath, rawValue) pair on one shape, for the requested categories only. */
export const collectAuditableProperties = (
  traversed: TraversedShape,
  categories: TokenCategory[]
): RawOccurrenceCandidate[] => {
  const { shape } = traversed
  const candidates: RawOccurrenceCandidate[] = []

  const wantsColor = categories.includes('color')
  const wantsRadius = categories.includes('radius')
  const wantsSpacing = categories.includes('spacing')
  const wantsDimension = categories.includes('dimension')
  const wantsTypography = categories.includes('typography')

  // ── Color: fills (image/gradient/library-reference fills excluded) ───
  // A fill bound to a library color asset isn't a hardcoded value, so it
  // has no business being audited as one.
  if (wantsColor && shape.fills !== 'mixed')
    shape.fills.forEach((fill, i) => {
      if (fill.fillColorGradient || fill.fillImage) return
      if (fill.fillColorRefId || fill.fillColorRefFile) return
      push(
        candidates,
        traversed,
        `fills[${i}].fillColor`,
        'color',
        fill.fillColor,
        ['fill']
      )
    })

  // ── Color: strokes ────────────────────────────────────────────────────
  // Same library-color-reference exclusion as fills, above.
  if (wantsColor)
    shape.strokes.forEach((stroke, i) => {
      if (stroke.strokeColorGradient) return
      if (stroke.strokeColorRefId || stroke.strokeColorRefFile) return
      push(
        candidates,
        traversed,
        `strokes[${i}].strokeColor`,
        'color',
        stroke.strokeColor,
        ['strokeColor']
      )
    })

  // ── Dimension: stroke width ──────────────────────────────────────────
  if (wantsDimension)
    shape.strokes.forEach((stroke, i) => {
      push(
        candidates,
        traversed,
        `strokes[${i}].strokeWidth`,
        'dimension',
        stroke.strokeWidth,
        ['strokeWidth']
      )
    })

  // ── Radius ────────────────────────────────────────────────────────────
  if (wantsRadius)
    push(
      candidates,
      traversed,
      'borderRadius',
      'radius',
      shape.borderRadius,
      RADIUS_TOKEN_PROPERTIES
    )

  // ── Spacing: flex layout gaps + padding ──────────────────────────────
  if (wantsSpacing && penpot.utils.types.isBoard(shape) && shape.flex)
    for (const propertyPath of Object.keys(FLEX_TOKEN_PROPERTY))
      push(
        candidates,
        traversed,
        propertyPath,
        'spacing',
        readValueAtPath(shape, propertyPath),
        [FLEX_TOKEN_PROPERTY[propertyPath]]
      )

  // ── Dimension: width/height, fixed sizing only ───────────────────────
  // Inherited/computed values are not deviations — hug and fill sizing are
  // computed, not authored, so they never produce an occurrence.
  if (
    wantsDimension &&
    (penpot.utils.types.isBoard(shape) ||
      penpot.utils.types.isRectangle(shape) ||
      penpot.utils.types.isEllipse(shape))
  ) {
    const boardHugsH =
      penpot.utils.types.isBoard(shape) && shape.horizontalSizing === 'auto'
    const boardHugsV =
      penpot.utils.types.isBoard(shape) && shape.verticalSizing === 'auto'
    const fillsParentH = shape.layoutChild?.horizontalSizing === 'fill'
    const fillsParentV = shape.layoutChild?.verticalSizing === 'fill'

    if (!boardHugsH && !fillsParentH)
      push(candidates, traversed, 'width', 'dimension', shape.width, ['width'])
    if (!boardHugsV && !fillsParentV)
      push(candidates, traversed, 'height', 'dimension', shape.height, ['height'])
  }

  // ── Typography ────────────────────────────────────────────────────────
  if (wantsTypography && penpot.utils.types.isText(shape)) {
    // See parseNumericLike usage in readValueAtPath above for why a bare
    // `Number(...)` call is not safe here.
    push(
      candidates,
      traversed,
      'fontSize',
      'typography',
      parseNumericLike(shape.fontSize),
      ['fontSize']
    )
    push(
      candidates,
      traversed,
      'fontWeight',
      'typography',
      shape.fontWeight,
      ['fontWeight']
    )
    // No discrete TokenProperty targets lineHeight alone — only the
    // composite 'typography' property does, and applying that would also
    // rewrite fontSize/fontWeight/letterSpacing/fontFamilies as a side
    // effect. Reported for coverage/visibility, but apply must refuse it
    // (empty tokenProperties -> ApplySkipReason.TYPE_INCOMPATIBLE).
    push(
      candidates,
      traversed,
      'lineHeight',
      'typography',
      parseNumericLike(shape.lineHeight),
      []
    )
    push(
      candidates,
      traversed,
      'letterSpacing',
      'typography',
      parseNumericLike(shape.letterSpacing),
      ['letterSpacing']
    )
  }

  return candidates
}
