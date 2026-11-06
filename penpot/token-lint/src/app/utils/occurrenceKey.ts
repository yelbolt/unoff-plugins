import type { AuditOccurrence } from '../types/audit'

const OCCURRENCE_KEY_MARKER = '::occurrence::'

export const buildOccurrenceKey = (
  groupId: string,
  occurrence: Pick<AuditOccurrence, 'shapeId' | 'propertyPath'>
): string =>
  `${groupId}${OCCURRENCE_KEY_MARKER}${occurrence.shapeId}::${occurrence.propertyPath}`

export const isOccurrenceKey = (id: string): boolean =>
  id.includes(OCCURRENCE_KEY_MARKER)

export const groupIdFromOccurrenceKey = (key: string): string =>
  key.slice(0, key.indexOf(OCCURRENCE_KEY_MARKER))
