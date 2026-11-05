import type { TokenSetSummary } from '../../app/types/tokens'

export const listActiveTokenSets = (): TokenSetSummary[] =>
  penpot.library.local.tokens.sets
    .filter((set) => set.active)
    .map((set) => ({ id: set.id, name: set.name }))
