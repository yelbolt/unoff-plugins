import { trimNumber } from './geometry'
import type { AnnotationStyle } from '../../app/types/annotations'

export const formatLength = (px: number, style: AnnotationStyle): string =>
  style.unit === 'rem' && style.remBase > 0
    ? `${trimNumber(px / style.remBase)}rem`
    : `${trimNumber(px)}px`
