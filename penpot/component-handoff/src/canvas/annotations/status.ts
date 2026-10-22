import { safe } from './target'
import { annotationsOf, currentPage, findLayers, readTargets } from './layer'
import { fingerprintOf } from './fingerprint'
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

// Freshness of every documentation of the current page. A documentation whose
// target is gone is reported `missing` AND `outdated`, so that "update all"
// also clears it (it is removed by UPDATE_DOCUMENTATIONS).
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
  return { items, outdatedCount: items.filter((i) => i.outdated).length }
}
