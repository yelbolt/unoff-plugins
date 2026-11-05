import { SelectionDigest } from '../types/annotations'
import { DocSettings } from '../stores/annotations'
import {
  getDocumentedItem,
  getTarget,
  getVariantCounts,
  isFamilyFiltered,
} from './annotationRules'

/**
 * Estimated number of elements above which a generation is announced as
 * potentially slow: it runs inside Penpot and can freeze it. Shared by the
 * visual documentation and the machine contract.
 */
export const LARGE_VOLUME_THRESHOLD = 120

/**
 * Visual documentation: documented variants (after the filter, 1 for a
 * component) x parts (layers numbered by the chosen depth, +1 for the root).
 * Computed from the selection digest only.
 */
export const estimateVisualVolume = (
  selection: SelectionDigest,
  settings: DocSettings
): number => {
  const item = getDocumentedItem(selection)
  if (item === null) return 0

  const isFamily = getTarget(selection, settings) === 'FAMILY'
  const variants = !isFamily
    ? 1
    : isFamilyFiltered(selection, settings)
      ? getVariantCounts(selection, settings).matching
      : Math.max(item.variantCount, 1)
  const parts =
    (settings.depth === 'ALL'
      ? item.nestedLayerCount
      : item.topLevelLayers.length) + 1

  return variants * parts
}

/**
 * Machine contract: it always covers the whole family, so every variant x
 * (every nested layer + the root).
 */
export const estimateContractVolume = (
  selection: SelectionDigest,
  settings: DocSettings
): number => {
  const item = getDocumentedItem(selection)
  if (item === null) return 0

  const variants =
    getTarget(selection, settings) === 'FAMILY'
      ? Math.max(item.variantCount, 1)
      : 1

  return variants * (item.nestedLayerCount + 1)
}
