import type { AuditOccurrence } from '../types/audit'

// Stable identity for one (group, occurrence) pair. Shared by
// DeviationGroupRow (builds the key when applying / rendering, and reads
// $appliedOccurrenceKeys to know which of its occurrences are gone),
// stores/audit.ts's TOKEN_APPLIED router (writes the key once an
// OCCURRENCE-mode apply is confirmed), and AuditReport (derives live
// coverage from which keys are marked). Previously each of those recomputed
// this string independently — a single source keeps them from drifting.
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
