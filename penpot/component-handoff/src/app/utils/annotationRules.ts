import {
  AnnotationKind,
  DocView,
  VariantFilter,
  DocTarget,
  ContractStatus,
  DocumentationsStatusData,
  DocumentationStatus,
  contractKey,
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
  void kind

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

export const getTarget = (
  selection: SelectionDigest,
  settings: DocSettings
): DocTarget => {
  const item = getDocumentedItem(selection)
  const target = settings.target ?? getDefaultTarget(item)

  return target === 'FAMILY' && !canDocumentFamily(item) ? 'COMPONENT' : target
}

// VARIANTS and PROPS only exist for a family.
export const getEffectiveViews = (
  selection: SelectionDigest,
  settings: DocSettings
): Array<DocView> => {
  const isFamily = getTarget(selection, settings) === 'FAMILY'

  return settings.views.filter(
    (view) => isFamily || (view !== 'VARIANTS' && view !== 'PROPS')
  )
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

/**
 * One row of the Generated tab: a documentation with the contract written
 * alongside it, or a contract whose documentation is not on the page.
 */
export interface GeneratedRow {
  id: string
  documentation: DocumentationStatus | null
  contract: ContractStatus | null
  outdated: boolean // the documentation OR its contract is outdated
  /** How the row is brought up to date: the documentation update rewrites the contract too. */
  updateWith: 'DOCUMENTATION' | 'CONTRACT' | null
}

export const buildGeneratedRows = (
  status: DocumentationsStatusData
): Array<GeneratedRow> => {
  const usedKeys = new Set<string>()
  const rows: Array<GeneratedRow> = status.items.map((item) => {
    const contract =
      status.contracts.find(
        (candidate) => candidate.key === contractKey(item.targetId)
      ) ?? null
    if (contract !== null) usedKeys.add(contract.key)

    const documentationOutdated = item.outdated || item.missing
    const contractOutdated =
      contract !== null && contract.outdated && !contract.missing

    return {
      id: `documentation-${item.docId}`,
      documentation: item,
      contract,
      outdated: documentationOutdated || contractOutdated,
      updateWith: documentationOutdated
        ? 'DOCUMENTATION'
        : contractOutdated
          ? 'CONTRACT'
          : null,
    }
  })

  status.contracts
    .filter((contract) => !usedKeys.has(contract.key))
    .forEach((contract) =>
      rows.push({
        id: `contract-${contract.key}`,
        documentation: null,
        contract,
        outdated: contract.outdated && !contract.missing,
        updateWith: contract.outdated && !contract.missing ? 'CONTRACT' : null,
      })
    )

  return rows
}

/** Rows that need an update (a documentation and its own contract count once). */
export const countOutdated = (status: DocumentationsStatusData): number =>
  buildGeneratedRows(status).filter((row) => row.outdated).length
