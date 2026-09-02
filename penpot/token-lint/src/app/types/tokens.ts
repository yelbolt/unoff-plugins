// Domain types for the design-token model this plugin audits against.
// Separate from `audit.ts` (the audit-run/report domain).

/**
 * Product-facing audit categories. Not 1:1 with Penpot's own `TokenType`
 * union — `buildResolvedIndex.ts` maps one or more Penpot token types onto
 * each category (e.g. `typography` covers the composite token plus the
 * granular fontSizes/fontWeights/letterSpacing/fontFamilies tokens).
 */
export type TokenCategory =
  | 'color'
  | 'spacing'
  | 'radius'
  | 'typography'
  | 'dimension'

/** One entry in the resolved-value index built from active token sets before matching starts. */
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

/** One active token set, for the "which set?" picker in the create-token dialog. */
export interface TokenSetSummary {
  id: string
  name: string
}
