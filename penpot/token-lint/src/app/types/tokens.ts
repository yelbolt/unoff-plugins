/** Not 1:1 with Penpot's `TokenType`; `buildResolvedIndex.ts` maps one or more token types onto each category. */
export type TokenCategory =
  | 'color'
  | 'spacing'
  | 'radius'
  | 'typography'
  | 'dimension'
  | 'opacity'
  | 'rotation'

export interface ResolvedTokenIndexEntry {
  tokenId: string
  tokenName: string // full path, e.g. 'color.action.primary'
  setId: string
  setName: string
  category: TokenCategory
  resolvedValue: string | number
  aliasChain: string[] // token names from reference to final value, display/debug only
}

/** Canvas-internal only — never sent whole across the bridge. */
export interface ResolvedTokenIndex {
  builtAt: number
  byCategory: Record<TokenCategory, ResolvedTokenIndexEntry[]>
}

/** A token proposed as a match for a hard-coded value — exact (no `residual`) or near. */
export interface MatchedToken {
  tokenId: string
  tokenName: string
  setName: string
  resolvedValue: string | number
  residual?: number
}

export interface TokenSetSummary {
  id: string
  name: string
}
