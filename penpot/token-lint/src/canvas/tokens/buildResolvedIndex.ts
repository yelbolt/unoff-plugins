import type { Token, TokenSet } from '@penpot/plugin-types'
import type {
  ResolvedTokenIndex,
  ResolvedTokenIndexEntry,
  TokenCategory,
} from '../../app/types/tokens'

const emptyByCategory = (): Record<TokenCategory, ResolvedTokenIndexEntry[]> => ({
  color: [],
  spacing: [],
  radius: [],
  typography: [],
  dimension: [],
})

const dedupeKey = (
  category: TokenCategory,
  name: string,
  resolvedValue: string | number,
  field?: string
): string => `${category}::${name}::${field ?? ''}::${String(resolvedValue)}`

const pushEntriesForToken = (
  token: Token,
  set: TokenSet,
  dedup: Map<string, ResolvedTokenIndexEntry>
): void => {
  const base = {
    tokenId: token.id,
    tokenName: token.name,
    setId: set.id,
    setName: set.name,
    aliasChain: [token.name],
  }

  // Sets are iterated in `penpot.library.local.tokens.sets` order, which is
  // ascending precedence (see dedupeKey doc) — a plain Map.set() overwrite
  // on a colliding key therefore always leaves the highest-precedence
  // (latest-active-set) token's metadata as the winner, matching Penpot's
  // own resolution rule.
  const put = (
    category: TokenCategory,
    resolvedValue: string | number,
    field?: string
  ): void => {
    dedup.set(dedupeKey(category, token.name, resolvedValue, field), {
      ...base,
      category,
      resolvedValue,
    })
  }

  switch (token.type) {
    case 'borderRadius':
    case 'color':
    case 'spacing':
    case 'dimension':
    case 'sizing':
    case 'borderWidth':
    case 'fontSizes':
    case 'fontWeights':
    case 'letterSpacing': {
      if (token.resolvedValue == null) return
      const category: TokenCategory =
        token.type === 'borderRadius'
          ? 'radius'
          : token.type === 'color'
            ? 'color'
            : token.type === 'spacing'
              ? 'spacing'
              : token.type === 'fontSizes' ||
                  token.type === 'fontWeights' ||
                  token.type === 'letterSpacing'
                ? 'typography'
                : 'dimension' // dimension | sizing | borderWidth
      put(category, token.resolvedValue)
      return
    }
    case 'typography': {
      const resolved = token.resolvedValue?.[0]
      if (!resolved) return
      const fields: Array<[string, string | number | null | undefined]> = [
        ['fontSize', resolved.fontSizes],
        ['fontWeight', resolved.fontWeights],
        ['letterSpacing', resolved.letterSpacing],
        ['lineHeight', resolved.lineHeight],
      ]
      for (const [field, value] of fields) {
        if (value == null) continue
        put('typography', value, field)
      }
      return
    }
    default:
      return
  }
}

export const buildResolvedIndex = (): ResolvedTokenIndex => {
  const dedup = new Map<string, ResolvedTokenIndexEntry>()

  const allSets = penpot.library.local.tokens.sets
  const activeSets = allSets.filter((set) => set.active)
  for (const set of activeSets)
    for (const token of set.tokens) pushEntriesForToken(token, set, dedup)

  const byCategory = emptyByCategory()
  for (const entry of dedup.values()) byCategory[entry.category].push(entry)

  console.debug('[token-lint] resolved index built:', {
    activeSets: activeSets.length,
    totalSets: allSets.length,
    tokensInActiveSets: activeSets.reduce((n, set) => n + set.tokens.length, 0),
    entriesByCategory: Object.fromEntries(
      (Object.keys(byCategory) as TokenCategory[]).map((c) => [c, byCategory[c].length])
    ),
  })

  return { builtAt: Date.now(), byCategory }
}
