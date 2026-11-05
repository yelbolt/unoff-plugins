import { safe } from './target'
import { annotationsOf, currentPage, findLayers, readTargets } from './layer'
import { fingerprintOf } from './fingerprint'
import { collectContractStatuses } from './contract'
import { KEYS } from './constants'
import type { Group } from '@penpot/plugin-types'
import type {
  DocumentationStatus,
  DocumentationsStatusData,
} from '../../app/types/annotations'

const readOptions = (g: Group): { target: 'COMPONENT' | 'FAMILY' } => {
  try {
    const o = JSON.parse(g.getPluginData(KEYS.options) || '{}')
    return { target: o.target === 'FAMILY' ? 'FAMILY' : 'COMPONENT' }
  } catch {
    return { target: 'COMPONENT' }
  }
}

/**
 * Warms the fingerprint of the `index`-th documented target of the page (its
 * documentations and contracts together). Returns false once every target is
 * done. Lets the status refresh run one target per tick instead of one block.
 */
export const warmTarget = (index: number): boolean => {
  const page = currentPage()
  const ids = new Set<string>()
  for (const layer of findLayers())
    for (const g of annotationsOf(layer)) {
      const id = readTargets(g)[0]
      if (id) ids.add(id)
    }
  for (const c of collectContractStatuses()) ids.add(c.targetId)
  const id = [...ids][index]
  if (id === undefined) return false
  const target = safe(() => page.getShapeById(id))
  if (target) fingerprintOf(target)
  return true
}

/**
 * Freshness of every documentation of the current page. A documentation whose
 * target is gone is reported `missing` AND `outdated`, so that "update all"
 * also clears it (it is removed by UPDATE_DOCUMENTATIONS).
 */
export const collectStatus = (): DocumentationsStatusData => {
  const page = currentPage()
  const items: Array<DocumentationStatus> = []
  for (const layer of findLayers()) {
    const key = layer.getPluginData(KEYS.layer)
    const board = key ? safe(() => page.getShapeById(key)) : null
    for (const g of annotationsOf(layer)) {
      const targetId = readTargets(g)[0] ?? ''
      const target = targetId ? safe(() => page.getShapeById(targetId)) : null
      const stored = g.getPluginData(KEYS.fingerprint)
      const missing = !target
      const outdated =
        missing || !stored || fingerprintOf(target) !== stored
      items.push({
        docId: g.id,
        targetId,
        name: g.getPluginData(KEYS.name) || target?.name || g.name,
        target: readOptions(g).target,
        boardName: board ? board.name : null,
        outdated,
        missing,
        generatedAt: parseInt(g.getPluginData(KEYS.generatedAt) || '0', 10) || 0,
      })
    }
  }
  const contracts = collectContractStatuses()
  return {
    items,
    outdatedCount: items.filter((i) => i.outdated).length,
    contracts,
    contractsOutdatedCount: contracts.filter((c) => c.outdated).length,
  }
}
