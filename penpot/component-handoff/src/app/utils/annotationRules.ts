import {
  AnnotationKind,
  DocView,
  VariantFilter,
  DocTarget,
  RefusalReason,
  SelectionDigest,
  SelectionItem,
} from '../types/annotations'
import { DocSettings } from '../stores/annotations'

/** Why an action is unavailable for the current selection, or null if it fits. */
export const getSelectionBlocker = (
  kind: AnnotationKind,
  selection: SelectionDigest
): RefusalReason | null => {
  void kind // NOTE and DOCUMENTATION share the same selection rules

  if (selection.count === 0) return 'NO_SELECTION'
  if (selection.containsAnnotation) return 'ANNOTATION_SELECTED'
  if (selection.count !== 1) return 'WRONG_SELECTION_COUNT'

  return null
}

/** The single documentable item, or null when the selection is not exactly one. */
export const getDocumentedItem = (
  selection: SelectionDigest
): SelectionItem | null =>
  selection.count === 1 && selection.items[0] !== undefined
    ? selection.items[0]
    : null

/** A family is reachable when the selection exposes at least one variant. */
export const canDocumentFamily = (item: SelectionItem | null): boolean =>
  item !== null && item.variantCount > 0

export const getDefaultTarget = (item: SelectionItem | null): DocTarget =>
  item !== null && item.componentKind === 'FAMILY' ? 'FAMILY' : 'COMPONENT'

// ── Derivations from the shared documentation settings ──────────────────────

export const getTarget = (
  selection: SelectionDigest,
  settings: DocSettings
): DocTarget => {
  const item = getDocumentedItem(selection)
  const target = settings.target ?? getDefaultTarget(item)

  return target === 'FAMILY' && !canDocumentFamily(item) ? 'COMPONENT' : target
}

// VARIANTS only exists for a family.
export const getEffectiveViews = (
  selection: SelectionDigest,
  settings: DocSettings
): Array<DocView> => {
  const isFamily = getTarget(selection, settings) === 'FAMILY'

  return settings.views.filter((view) => isFamily || view !== 'VARIANTS')
}

export const isFamilyFiltered = (
  selection: SelectionDigest,
  settings: DocSettings
): boolean => {
  const item = getDocumentedItem(selection)

  return getTarget(selection, settings) === 'FAMILY' && item !== null
    ? item.variantProperties.length > 0
    : false
}

// Counts the variants whose every value is ticked.
export const getVariantCounts = (
  selection: SelectionDigest,
  settings: DocSettings
): { matching: number; total: number } => {
  const variants = getDocumentedItem(selection)?.familyVariants ?? []
  const matching = variants.filter((variant) =>
    Object.keys(settings.unticked).every(
      (property) =>
        !(settings.unticked[property] ?? []).includes(variant[property])
    )
  ).length

  return { matching, total: variants.length }
}

export const hasNoVariant = (
  selection: SelectionDigest,
  settings: DocSettings
): boolean => {
  const { matching, total } = getVariantCounts(selection, settings)

  return isFamilyFiltered(selection, settings) && total > 0 && matching === 0
}

// null when everything is ticked or the target is a component.
export const getVariantFilter = (
  selection: SelectionDigest,
  settings: DocSettings
): VariantFilter | null => {
  const item = getDocumentedItem(selection)
  if (!isFamilyFiltered(selection, settings) || item === null) return null

  const filter: VariantFilter = {}
  item.variantProperties.forEach((property) => {
    const hidden = settings.unticked[property.name] ?? []
    if (property.values.some((value) => hidden.includes(value)))
      filter[property.name] = property.values.filter(
        (value) => !hidden.includes(value)
      )
  })

  return Object.keys(filter).length > 0 ? filter : null
}
