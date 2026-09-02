import type { TokenSetSummary } from '../../app/types/tokens'

/**
 * Feeds the "which set?" picker in the create-token dialog
 * (DeviationGroupRow). Fetched fresh on each dialog open rather than cached
 * from the audit report — a set can be activated/deactivated at any time,
 * and this is a cheap synchronous read.
 */
export const listActiveTokenSets = (): TokenSetSummary[] =>
  penpot.library.local.tokens.sets
    .filter((set) => set.active)
    .map((set) => ({ id: set.id, name: set.name }))
