import { DEFAULT_ANNOTATION_STYLE } from '../../app/types/annotations'
import { KEYS } from './constants'
import type { AnnotationStyle } from '../../app/types/annotations'

const HEX = /^#[0-9a-fA-F]{6}$/

// Defensive: the file's plugin data is string-only and may be missing,
// malformed or from an older version.
export const sanitizeStyle = (raw: unknown): AnnotationStyle => {
  const d = DEFAULT_ANNOTATION_STYLE
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >
  const num = (v: unknown, fallback: number, min: number, max: number) =>
    typeof v === 'number' && isFinite(v)
      ? Math.min(max, Math.max(min, v))
      : fallback
  return {
    color: typeof o.color === 'string' && HEX.test(o.color) ? o.color : d.color,
    textSize: num(o.textSize, d.textSize, 6, 96),
    unit: o.unit === 'rem' || o.unit === 'px' ? o.unit : d.unit,
    remBase: num(o.remBase, d.remBase, 1, 256),
    labelPlacement:
      o.labelPlacement === 'AUTO' ||
      o.labelPlacement === 'OUTSIDE' ||
      o.labelPlacement === 'INSIDE'
        ? o.labelPlacement
        : d.labelPlacement,
    scaleMode:
      o.scaleMode === 'DESIGN' || o.scaleMode === 'VIEWPORT'
        ? o.scaleMode
        : d.scaleMode,
  }
}

export const loadStyle = (): AnnotationStyle => {
  try {
    const raw = penpot.currentFile?.getPluginData(KEYS.style)
    return sanitizeStyle(raw ? JSON.parse(raw) : null)
  } catch {
    return { ...DEFAULT_ANNOTATION_STYLE }
  }
}

export const saveStyle = (style: unknown): AnnotationStyle => {
  const clean = sanitizeStyle(style)
  penpot.currentFile?.setPluginData(KEYS.style, JSON.stringify(clean))
  return clean
}
