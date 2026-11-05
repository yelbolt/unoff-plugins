import { planParts, walkParts } from './parts'
import type { PartsDetail } from '../../app/types/annotations'
import type { Part, PartPlan } from './parts'
import type { Entry } from './groups'

export interface MergedPart {
  n: number
  key: string
  name: string
  type: string
  path: string
  cpath: string
  shapes: Map<Entry, Part>
}

export interface MergedModel {
  entries: Array<Entry>
  plan: Array<PartPlan>
  parts: Array<MergedPart>
}

/** Later variants number their unseen parts after the first's; such a part has a number but no marker on the specimen. */
export const buildMerged = (
  entries: Array<Entry>,
  depth: PartsDetail
): MergedModel => {
  const byKey = new Map<string, MergedPart>()
  const parts: Array<MergedPart> = []
  for (const entry of entries)
    for (const p of walkParts(entry.main, depth)) {
      const key = `${p.path}:${p.shape.type}`
      let part = byKey.get(key)
      if (!part) {
        part = {
          n: parts.length,
          key,
          name: p.shape.name,
          type: p.shape.type,
          path: p.path,
          cpath: p.cpath,
          shapes: new Map(),
        }
        byKey.set(key, part)
        parts.push(part)
      }
      part.shapes.set(entry, p)
    }
  return { entries, plan: planParts(entries[0].main, depth), parts }
}
