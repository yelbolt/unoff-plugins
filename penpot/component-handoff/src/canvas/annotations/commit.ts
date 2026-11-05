import { makeScale } from './scale'
import { Placer } from './placement'
import { markSelfWrite } from './memo'
import {
  findExistingAnywhere,
  findLayer,
  layerKeyFor,
  obstaclesOf,
  placeInLayer,
} from './layer'
import { tr } from './i18n'
import { Pen } from './draw'
import { KEYS } from './constants'
import type { Group, Shape } from '@penpot/plugin-types'
import type {
  AnnotationKind,
  AnnotationStyle,
} from '../../app/types/annotations'
import type { Scale } from './scale'
import type { LayerKey } from './layer'

export interface DrawEnv {
  style: AnnotationStyle
  sc: Scale
  pen: Pen
  placer: Placer
  lk: LayerKey
  layer: Group | null
  existing: Group | null
}

export interface DrawResult {
  rotated: boolean
  group: Group | null
  name: string
  fingerprint: string
  options: Record<string, unknown>
  parts: number
  variants?: number
}

export interface CommitResult {
  created: number
  updated: number
  rotated: boolean
  boardName: string | null
  groupId: string
  parts: number
  variants?: number
}

export const commitAnnotation = (
  kind: AnnotationKind,
  targets: Array<Shape>,
  style: AnnotationStyle,
  draw: (env: DrawEnv) => DrawResult
): CommitResult => {
  // Children read in z-order, appendChild goes on top.
  penpot.flags.naturalChildOrdering = true
  markSelfWrite()

  const lk = layerKeyFor(targets[0])
  const layer = findLayer(lk.key)
  const targetIds = targets.map((t) => t.id)
  const existing = findExistingAnywhere(kind, targetIds)
  const sc = makeScale(style)
  const obstacles = obstaclesOf(layer, existing?.id)

  const env: DrawEnv = {
    style,
    sc,
    pen: new Pen(style, sc),
    placer: new Placer(obstacles, sc),
    lk,
    layer,
    existing,
  }

  const result = draw(env)
  const group = result.group
  if (!group) throw new Error('Could not group the documentation')

  group.name = `${tr(`kind.${kind}`)} · ${targets.map((t) => t.name).join(' ↔ ')}`
  group.setPluginData(KEYS.kind, kind)
  group.setPluginData(KEYS.targets, JSON.stringify(targetIds))
  group.setPluginData(KEYS.options, JSON.stringify(result.options))
  group.setPluginData(KEYS.fingerprint, result.fingerprint)
  group.setPluginData(KEYS.generatedAt, String(Date.now()))
  group.setPluginData(KEYS.name, result.name)

  // Place first, remove after: removing the previous drawing may delete its emptied layer.
  try {
    placeInLayer(group, lk, layer)
  } catch (error) {
    try {
      group.remove()
    } catch {
      /* already gone */
    }
    throw error
  }
  if (existing) existing.remove()

  return {
    created: existing ? 0 : 1,
    updated: existing ? 1 : 0,
    rotated: result.rotated,
    boardName: lk.board ? lk.board.name : null,
    groupId: group.id,
    parts: result.parts,
    variants: result.variants,
  }
}
