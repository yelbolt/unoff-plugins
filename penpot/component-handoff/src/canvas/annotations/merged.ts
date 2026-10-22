import { planParts, walkParts } from './parts'
import type { PartsDetail } from '../../app/types/annotations'
import type { Part, PartPlan } from './parts'
import type { Entry } from './groups'

// One part of the UNION of every variant's parts, keyed by layer path + type.
export interface MergedPart {
  n: number
  key: string
  name: string // layer name, from the first variant that has the part
  type: string
  path: string
  shapes: Map<Entry, Part> // the part's live shape in each variant that has it
}

export interface MergedModel {
  entries: Array<Entry>
  plan: Array<PartPlan> // the first variant's plan: binds the specimen copy
  parts: Array<MergedPart> // ordered by number; 0 is the root
}

// Numbering: the first variant keeps its own walk order (0..k); each later
// variant then contributes its unseen parts, in walk order, after the last
// number already given. A part absent from the first variant therefore has a
// number but no marker on the specimen.
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
          shapes: new Map(),
        }
        byKey.set(key, part)
        parts.push(part)
      }
      part.shapes.set(entry, p)
    }
  return { entries, plan: planParts(entries[0].main, depth), parts }
}
