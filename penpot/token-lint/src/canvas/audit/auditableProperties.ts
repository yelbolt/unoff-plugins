import { parseNumericLike, roundNumeric } from '../../utils/numeric'
import type { Shape, TokenProperty } from '@penpot/plugin-types'
import type { TraversedShape } from '../traversal/select'
import type { TokenCategory } from '../../app/types/tokens'
import type { OccurrenceOwnership } from '../../app/types/audit'

export interface RawOccurrenceCandidate {
  shapeId: string
  shapeName: string
  propertyPath: string
  category: TokenCategory
  rawValue: string | number
  // Empty array = no discrete TokenProperty for this value (lineHeight) —
  // apply must refuse with ApplySkipReason.TYPE_INCOMPATIBLE.
  tokenProperties: TokenProperty[]
  ownership: OccurrenceOwnership
  componentMainId?: string
  // Shape whose `.tokens` map governs this property — the traversed shape,
  // or the main shape when the property is inherited, not overridden.
  ownerShape: Shape
  isHidden: boolean
  isLocked: boolean
  isOffBoard: boolean
}

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
    // 'mixed' (multiple runs, different values) must not become NaN.
    if (propertyPath === 'fontSize') return parseNumericLike(shape.fontSize)
    if (propertyPath === 'fontWeight') return shape.fontWeight
    if (propertyPath === 'lineHeight') return parseNumericLike(shape.lineHeight)
    if (propertyPath === 'letterSpacing')
      return parseNumericLike(shape.letterSpacing)
  }

  return undefined
}

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
  // Runtime can return `null` (e.g. a fill bound to a library color) even
  // though the .d.ts says `string | number | undefined`.
  rawValue: string | number | null | undefined,
  tokenProperties: TokenProperty[]
): void => {
  if (rawValue == null) return

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
    const refValue: string | number | undefined =
      typeof rawRefValue === 'number' ? roundNumeric(rawRefValue) : rawRefValue

    if (refShape && refValue !== undefined && refValue === normalizedRawValue) {
      ownership = 'MAIN_COMPONENT'
      shapeId = refShape.id
      shapeName = refShape.name
      ownerShape = refShape
    } else componentMainId = refShape?.id
  }

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

  // A fill/stroke bound to a library color asset isn't a hardcoded value.
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

  if (wantsRadius)
    push(
      candidates,
      traversed,
      'borderRadius',
      'radius',
      shape.borderRadius,
      RADIUS_TOKEN_PROPERTIES
    )

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

  // Hug/fill sizing is computed, not authored — never a deviation.
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

  if (wantsTypography && penpot.utils.types.isText(shape)) {
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
    // lineHeight has no discrete TokenProperty — only composite 'typography'.
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
