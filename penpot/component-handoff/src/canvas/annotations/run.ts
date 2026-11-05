import { resolveTarget } from './target'
import { loadStyle } from './style'
import { collectStatus } from './status'
import { normalizeDepth, normalizeFilter, normalizeGrouping, readOptions, sanitizeViews } from './options'
import { invalidate } from './memo'
import {
  currentPage,
  findDocumentationById,
  isAnnotationShape,
  readTargets,
} from './layer'
import { countMatching } from './groups'
import { drawDocumentation } from './documentation'
import { KEYS } from './constants'
import { commitAnnotation } from './commit'
import type { Shape } from '@penpot/plugin-types'
import type {
  AnnotationAppliedData,
  AnnotationKind,
  AnnotationRefusedData,
  AnnotationStyle,
  DocTarget,
  DocumentationsUpdatedData,
  GenerateDocumentationData,
  RefusalReason,
  UpdateDocumentationsData,
} from '../../app/types/annotations'
import type { CommitResult } from './commit'

export type Outcome =
  { applied: AnnotationAppliedData } | { refused: AnnotationRefusedData }

export type UpdateOutcome =
  { updated: DocumentationsUpdatedData } | { refused: AnnotationRefusedData }

const KIND: AnnotationKind = 'DOCUMENTATION'

const refuse = (reason: RefusalReason): { refused: AnnotationRefusedData } => ({
  refused: { kind: KIND, reason },
})

// Resolves the target and draws; returns a refusal reason when the target
// cannot be documented. Shared by GENERATE_DOCUMENTATION and the update.
export const documentShape = (
  shape: Shape,
  data: GenerateDocumentationData,
  style: AnnotationStyle
): CommitResult | RefusalReason => {
  const res = resolveTarget(shape, data.target)
  if (typeof res === 'string') return res
  if (
    res.target === 'FAMILY' &&
    res.variants &&
    data.variantFilter &&
    countMatching(res, data.variantFilter) === 0
  )
    return 'NO_VARIANT'
  return commitAnnotation(KIND, [res.root], style, (env) =>
    drawDocumentation(env, res, data)
  )
}

export const generateDocumentation = (
  data: GenerateDocumentationData
): Outcome => {
  invalidate() // a user action reads the file as it is now
  const selected = penpot.selection
  if (selected.length === 0) return refuse('NO_SELECTION')
  if (selected.length !== 1) return refuse('WRONG_SELECTION_COUNT')
  if (isAnnotationShape(selected[0])) return refuse('ANNOTATION_SELECTED')
  const target: DocTarget = data.target === 'FAMILY' ? 'FAMILY' : 'COMPONENT'
  const views = sanitizeViews(data.views, target)
  if (views.length === 0) return refuse('NO_VIEW')

  const result = documentShape(
    selected[0],
    {
      target,
      views,
      depth: normalizeDepth(data.depth),
      grouping: normalizeGrouping(data.grouping),
      variantFilter:
        target === 'FAMILY' ? normalizeFilter(data.variantFilter) : null,
    },
    loadStyle()
  )
  if (typeof result === 'string') return refuse(result)
  return {
    applied: {
      kind: KIND,
      created: result.created,
      updated: result.updated,
      boardName: result.boardName,
      rotatedNotice: result.rotated,
      parts: result.parts,
      ...(result.variants !== undefined ? { variants: result.variants } : {}),
    },
  }
}

// Regenerates documentations in place from their stored options; removes the
// ones whose target is gone (or no longer documentable).
export const updateDocumentations = (
  data: UpdateDocumentationsData
): UpdateOutcome => {
  invalidate()
  const page = currentPage()
  const status = collectStatus()
  const wanted =
    data.docIds === 'OUTDATED'
      ? // 'Update all' never deletes: missing ones need their explicit Remove.
        status.items.filter((i) => i.outdated && !i.missing)
      : status.items.filter(
          (i) => Array.isArray(data.docIds) && data.docIds.includes(i.docId)
        )
  if (wanted.length === 0) return refuse('NOTHING_TO_UPDATE')

  const style = loadStyle()
  let updated = 0
  let removed = 0
  for (const item of wanted) {
    const group = findDocumentationById(item.docId)
    if (!group) continue
    const target = readTargets(group)[0]
    const shape = target ? page.getShapeById(target) : null
    if (!shape) {
      group.remove()
      removed++
      continue
    }
    const result = documentShape(
      shape,
      readOptions(group.getPluginData(KEYS.options)),
      style
    )
    // A refusal can be transient (e.g. mainInstance() failing once): keep the
    // existing documentation untouched rather than deleting it. Only a missing
    // target removes a documentation.
    if (typeof result !== 'string') updated++
  }
  return { updated: { updated, removed } }
}
