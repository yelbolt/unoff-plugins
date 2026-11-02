import { NotificationMessage } from '../types/messages'
import {
  AnnotationAppliedData,
  AnnotationKind,
  AnnotationRefusedData,
  ContractsUpdatedData,
  ContractWrittenData,
  DocumentationsUpdatedData,
  RefusalReason,
} from '../types/annotations'

type Translate = (
  key: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: Record<string, any> | undefined
) => string

const REFUSAL_KEYS: Record<RefusalReason, string> = {
  NO_SELECTION: 'handoff.refusal.noSelection',
  WRONG_SELECTION_COUNT: 'handoff.refusal.wrongSelectionCount',
  NOT_A_FAMILY: 'handoff.refusal.notAFamily',
  NO_VIEW: 'handoff.refusal.noView',
  NO_VARIANT: 'handoff.refusal.noVariant',
  ANNOTATION_SELECTED: 'handoff.refusal.annotationSelected',
  NOTHING_TO_UPDATE: 'handoff.refusal.nothingToUpdate',
  NO_CONTRACT: 'handoff.refusal.noContract',
}

// A refusal can read differently depending on the output it concerns.
const CONTRACT_REFUSAL_KEYS: Partial<Record<RefusalReason, string>> = {
  NOTHING_TO_UPDATE: 'handoff.refusal.nothingToUpdateContract',
}

export const getRefusalMessage = (
  reason: RefusalReason,
  t: Translate,
  kind: AnnotationKind = 'DOCUMENTATION'
) =>
  t(
    (kind === 'CONTRACT' ? CONTRACT_REFUSAL_KEYS[reason] : undefined) ??
      REFUSAL_KEYS[reason] ??
      'handoff.refusal.unknown'
  )

export const buildAppliedNotification = (
  data: AnnotationAppliedData,
  t: Translate
): NotificationMessage => {
  const parts = [
    t(
      data.created > 0 && data.updated === 0
        ? 'handoff.result.documentation.created'
        : 'handoff.result.documentation.updated',
      {
        parts: data.parts ?? 0,
        variants: data.variants ?? 0,
      }
    ),
  ]
  if (data.rotatedNotice) parts.push(t('handoff.result.rotated'))

  return { type: 'SUCCESS', message: parts.join(' '), timer: 6000 }
}

export const buildRefusedNotification = (
  data: AnnotationRefusedData,
  t: Translate
): NotificationMessage => ({
  type: 'WARNING',
  message: getRefusalMessage(data.reason, t, data.kind),
  timer: 8000,
})

export const buildDocumentationsUpdatedNotification = (
  data: DocumentationsUpdatedData,
  t: Translate
): NotificationMessage => ({
  type: 'SUCCESS',
  message: t('handoff.result.documentationsUpdated', {
    updated: data.updated,
    removed: data.removed,
  }),
  timer: 6000,
})

export const buildContractWrittenNotification = (
  data: ContractWrittenData,
  t: Translate
): NotificationMessage => ({
  type: 'SUCCESS',
  message: t(
    data.created
      ? 'handoff.result.contract.created'
      : 'handoff.result.contract.updated',
    { name: data.name }
  ),
  timer: 6000,
})

export const buildContractsUpdatedNotification = (
  data: ContractsUpdatedData,
  t: Translate
): NotificationMessage => ({
  type: 'SUCCESS',
  message: t('handoff.result.contractsUpdated', {
    updated: data.updated,
    removed: data.removed,
  }),
  timer: 6000,
})
