import { DOC_VIEWS } from '../../app/types/annotations'
import type {
  DocTarget,
  DocView,
  GenerateDocumentationData,
  Grouping,
  PartsDetail,
  VariantFilter,
} from '../../app/types/annotations'

// MAIN / ALL; documents generated before this change stored a number
// (1 = direct layers, anything else = deeper).
export const normalizeDepth = (d: unknown): PartsDetail =>
  d === 'ALL' || (typeof d === 'number' && d !== 1) ? 'ALL' : 'MAIN'

// Old documentations carry no grouping: they read as MERGED.
export const normalizeGrouping = (g: unknown): Grouping =>
  g === 'SPLIT' ? 'SPLIT' : 'MERGED'

// { property: [ticked values] } or null (every variant). Old options carry
// none: they read as null.
export const normalizeFilter = (f: unknown): VariantFilter | null => {
  if (!f || typeof f !== 'object' || Array.isArray(f)) return null
  const out: VariantFilter = {}
  for (const [k, v] of Object.entries(f as Record<string, unknown>))
    if (Array.isArray(v)) out[k] = v.filter((x) => typeof x === 'string')
  return Object.keys(out).length > 0 ? out : null
}

export const sanitizeViews = (
  views: unknown,
  target: DocTarget
): Array<DocView> =>
  DOC_VIEWS.filter(
    (v) =>
      Array.isArray(views) &&
      views.includes(v) &&
      !((v === 'VARIANTS' || v === 'PROPS') && target === 'COMPONENT')
  )

export const readOptions = (raw: string): GenerateDocumentationData => {
  try {
    const o = JSON.parse(raw || '{}')
    const target: DocTarget = o.target === 'FAMILY' ? 'FAMILY' : 'COMPONENT'
    const views = sanitizeViews(o.views, target)
    return {
      target,
      views: views.length > 0 ? views : sanitizeViews(DOC_VIEWS, target),
      depth: normalizeDepth(o.depth),
      grouping: normalizeGrouping(o.grouping),
      variantFilter:
        target === 'FAMILY' ? normalizeFilter(o.variantFilter) : null,
    }
  } catch {
    return {
      target: 'COMPONENT',
      views: sanitizeViews(DOC_VIEWS, 'COMPONENT'),
      depth: 'MAIN' as PartsDetail,
      grouping: 'MERGED' as Grouping,
      variantFilter: null,
    }
  }
}
