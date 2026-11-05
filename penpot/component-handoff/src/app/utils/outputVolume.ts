import { SelectionDigest } from '../types/annotations'
import { DocSettings } from '../stores/annotations'
import {
  getDocumentedItem,
  getTarget,
  getVariantCounts,
  isFamilyFiltered,
} from './annotationRules'

/** Element count above which a generation can freeze Penpot and is announced as slow. */
export const LARGE_VOLUME_THRESHOLD = 120

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

export const estimateGenerationVolume = (
  selection: SelectionDigest,
  settings: DocSettings
): number =>
  estimateVisualVolume(selection, settings) +
  estimateContractVolume(selection, settings)
