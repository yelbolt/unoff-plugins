// Shared vocabulary between UI (src/app) and Canvas (src/canvas, src/bridges).
// This file is the message contract for Component Handoff — change a `type`
// or a payload shape here and on both sides, never on one side only.

// ── Domain ─────────────────────────────────────────────────────────────────

/**
 * One generation, two readers (spec: "One generation, two readers"):
 * DOCUMENTATION is drawn on the canvas for humans; CONTRACT is JSON written to
 * the file's shared plugin data for AI agents (Penpot MCP), alongside every
 * documentation. No option of the documentation changes the contract.
 */
export type AnnotationKind = 'DOCUMENTATION' | 'CONTRACT'

/** What is documented: one component, or a whole variant family. */
export type DocTarget = 'COMPONENT' | 'FAMILY'

/**
 * The views of a documentation — each one is its own titled section
 * (spec: "What the documentation shows"). VARIANTS and PROPS are ignored for
 * COMPONENT.
 */
export type DocView =
  | 'ANATOMY' // assembled copy with numbered parts + the parts exploded one by one
  | 'VARIANTS' // property overview + every variant on its own row (instance, its own values) — no default, no comparison
  | 'PROPS' // the component's API: per variant property, its values and what it drives
  | 'MEASUREMENTS' // separate copy with redlines: size, padding, gap, radius
  | 'COLORS' // separate copy + per-part fills/strokes/typography/effects with token / style / raw

// Section order in the generated documentation (spec: Variants first).
export const DOC_VIEWS: Array<DocView> = [
  'VARIANTS',
  'PROPS',
  'ANATOMY',
  'MEASUREMENTS',
  'COLORS',
]

// ── Machine contract (spec: "Machine contract") ────────────────────────────
// Shared by the Canvas (writes) and the UI (agent instructions it copies).

/** Shared plugin data namespace on `penpot.currentFile`, readable by any plugin. */
export const CONTRACT_NAMESPACE = 'unoff.handoff'
/** Schema id written in every contract; bump on a breaking change. */
export const CONTRACT_SCHEMA = 'unoff.handoff/contract@1'
/** Key of the index listing every contract of the file. */
export const CONTRACT_INDEX_KEY = 'index'
/** Key of one contract; `targetId` is the documented root (variant container for a family, main otherwise). */
export const contractKey = (targetId: string): string => `contract:${targetId}`

/** What a contract holds, in one line (`2 props · 14 rules · 92 % tokenized · 2 exceptions`). */
export interface ContractSummary {
  props: number // variant properties (0 for a component)
  rules: number
  tokenizedShare: number // 0..1 — share of token-capable rule values backed by a token
  exceptions: number
}

/** Document-level contract settings, stored on the file (private plugin data). */
export interface ContractSettings {
  autoUpdate: boolean // rewrite outdated contracts without asking (default false)
}

export const DEFAULT_CONTRACT_SETTINGS: ContractSettings = {
  autoUpdate: false,
}

/** One contract of the current page, with its freshness. */
export interface ContractStatus {
  key: string // `contract:<targetId>`
  targetId: string
  name: string
  target: DocTarget
  outdated: boolean // as written in the contract's `status`, refreshed at launch and after each save
  missing: boolean // the documented target no longer exists
  generatedAt: number // epoch ms
  summary: ContractSummary
}

/**
 * MAIN → the component's direct layers are the numbered parts (was depth 1)
 * ALL  → every nested visible layer is a numbered part (was depth -1)
 */
export type PartsDetail = 'MAIN' | 'ALL'

/**
 * MERGED → one anatomy and one table per category for the whole family; values
 *          that vary are keyed by the variant property that drives them (default)
 * SPLIT  → one anatomy and one set of tables per group of variants sharing a structure
 */
export type Grouping = 'MERGED' | 'SPLIT'

/**
 * Ticked values per variant property. A variant is documented when, for every
 * property listed here, its value is in the list. Properties absent from the
 * record are unfiltered. Applies to every view.
 */
export type VariantFilter = Record<string, Array<string>>

export type Unit = 'px' | 'rem'

export type LabelPlacement = 'AUTO' | 'OUTSIDE' | 'INSIDE'

/**
 * DESIGN   → annotations drawn at design scale; text size is a design-pixel size.
 * VIEWPORT → sizes divided by the current viewport zoom at draw time, so they
 *            read at `textSize` on screen at the zoom they were created at.
 * The chosen mode is stated where the style is set (spec: legibility across zoom).
 */
export type ScaleMode = 'DESIGN' | 'VIEWPORT'

export interface AnnotationStyle {
  color: string // hex, e.g. '#FF3D7F'
  textSize: number // px
  unit: Unit
  remBase: number // px per rem, used only when unit === 'rem'
  labelPlacement: LabelPlacement
  scaleMode: ScaleMode
}

export const DEFAULT_ANNOTATION_STYLE: AnnotationStyle = {
  color: '#FF3D7F',
  textSize: 12,
  unit: 'px',
  remBase: 16,
  labelPlacement: 'AUTO',
  scaleMode: 'DESIGN',
}

/**
 * FAMILY  → a variant container
 * VARIANT → a main component that belongs to a variant container
 * MAIN    → a main component outside any variant container
 * COPY    → a component copy (documented through its main component)
 * BOARD   → a plain board, not a component
 * OTHER   → any other shape
 */
export type ComponentKind =
  | 'FAMILY'
  | 'VARIANT'
  | 'MAIN'
  | 'COPY'
  | 'BOARD'
  | 'OTHER'

export interface VariantProperty {
  name: string
  values: Array<string> // in the family's own order; no value is a default
}

export interface SelectionItem {
  id: string
  name: string
  type: string // Penpot shape type: 'board' | 'rectangle' | 'text' | …
  componentKind: ComponentKind
  componentName: string | null // library component name (COPY → its main)
  familyName: string | null // variant container name when FAMILY / VARIANT / COPY of a variant
  variantProperties: Array<VariantProperty> // empty unless a family is reachable
  variantCount: number // 0 unless a family is reachable
  variantValues: Record<string, string> | null // VARIANT (or COPY of a variant): its own variantProps; null otherwise
  familyVariants: Array<Record<string, string>> // every variant's variantProps when a family is reachable (lets the UI count filter matches); empty otherwise
  topLevelLayers: Array<string> // names of the documented root's direct visible layers (first variant for a family) — makes PartsDetail 'MAIN' concrete
  nestedLayerCount: number // count of every nested visible layer under that root — makes PartsDetail 'ALL' concrete
  isRotated: boolean
  hasChildren: boolean
  isAnnotation: boolean // shape belongs to a Component Handoff documentation layer
  // The documented root for each choice of "What to document" (variant
  // container for FAMILY, main component otherwise), null when that choice is
  // refused. Lets the UI find the stored contract (contractKey(id)) in the
  // status list without computing anything.
  targetIds: { COMPONENT: string | null; FAMILY: string | null }
}

export interface SelectionDigest {
  count: number
  items: Array<SelectionItem> // capped at 2 meaningful items; count stays exact
  boardId: string | null // top-level board hosting the first item
  boardName: string | null
  annotatedCount: number // existing documentations targeting the selected items
  containsAnnotation: boolean // true if ANY selected shape (not only items) is a documentation shape
}

/** One documentation found on the current page, with its freshness. */
export interface DocumentationStatus {
  docId: string // id of the documentation group
  targetId: string // documented root (variant container for a family, main otherwise)
  name: string // component or family name
  target: DocTarget
  boardName: string | null
  outdated: boolean // fingerprint of the target differs from the one stored at generation
  missing: boolean // the documented target no longer exists
  generatedAt: number // epoch ms
}

export type RefusalReason =
  | 'NO_SELECTION'
  | 'WRONG_SELECTION_COUNT' // documentation needs exactly 1 element
  | 'NOT_A_FAMILY' // target FAMILY but no variant container is reachable
  | 'NO_VIEW' // no view ticked
  | 'NO_VARIANT' // the variant filter matches no variant
  | 'ANNOTATION_SELECTED' // the selection is itself a documentation shape
  | 'NOTHING_TO_UPDATE' // UPDATE_DOCUMENTATIONS / UPDATE_CONTRACTS found nothing matching
  | 'NO_CONTRACT' // GET_CONTRACT / REMOVE_CONTRACT: no contract under that key

// ── UI → Canvas payloads (VERB_NOUN) ───────────────────────────────────────

export interface GenerateDocumentationData {
  target: DocTarget
  views: Array<DocView>
  depth: PartsDetail // which layers become numbered parts
  grouping: Grouping // FAMILY only; ignored for COMPONENT
  variantFilter: VariantFilter | null // FAMILY only; null = every variant
}

export interface LocateDocumentationData {
  docId: string // selects the documentation and brings it into view
}

export interface UpdateDocumentationsData {
  docIds: Array<string> | 'OUTDATED' // explicit ids, or every outdated one on the page
}

export interface GetContractData {
  key: string // `contract:<targetId>`
}

export interface UpdateContractsData {
  keys: Array<string> | 'OUTDATED' // explicit keys, or every outdated, non-missing one on the page
}

export interface RemoveContractData {
  key: string // explicit removal only — a missing target never removes a contract by itself
}

// ── Canvas → UI payloads (NOUN_PAST_TENSE) ─────────────────────────────────

export interface AnnotationAppliedData {
  kind: AnnotationKind
  created: number
  updated: number // re-runs update in place instead of duplicating
  boardName: string | null
  rotatedNotice: boolean // at least one measured element was rotated (bbox)
  parts?: number // anatomy parts numbered
  variants?: number // FAMILY: variants documented
  // The machine contract written alongside, for the same target and always
  // for the whole family (no filter, views or style); null if it could not be
  // written — the documentation itself is still generated.
  contract: ContractSummary | null
}

export interface AnnotationRefusedData {
  kind: AnnotationKind
  reason: RefusalReason
}

export interface DocumentationsStatusData {
  items: Array<DocumentationStatus>
  outdatedCount: number
  contracts: Array<ContractStatus> // contracts whose documented target is on the current page (or missing, last seen on it)
  contractsOutdatedCount: number
}

export interface DocumentationsUpdatedData {
  updated: number
  removed: number // documentations whose target is gone, removed
}

export interface ContractLoadedData {
  key: string
  json: string // the stored contract, pretty-printed, ready to copy
}

export interface ContractsUpdatedData {
  updated: number
  removed: number // only through REMOVE_CONTRACT
}

// ── Message type registry ──────────────────────────────────────────────────

export type AnnotationAction =
  | 'GET_SELECTION' //                  → SELECTION_CHANGED
  | 'GET_ANNOTATION_STYLE' //           → ANNOTATION_STYLE_LOADED
  | 'SET_ANNOTATION_STYLE' //   AnnotationStyle → ANNOTATION_STYLE_SAVED
  | 'GENERATE_DOCUMENTATION' // GenerateDocumentationData → ANNOTATION_APPLIED | ANNOTATION_REFUSED
//                                        (also writes the machine contract of the same target)
  | 'GET_DOCUMENTATIONS_STATUS' //      → DOCUMENTATIONS_STATUS_CHANGED
  | 'LOCATE_DOCUMENTATION' //  LocateDocumentationData → (no reply; selection changes, SELECTION_CHANGED follows)
  | 'UPDATE_DOCUMENTATIONS' //  UpdateDocumentationsData → DOCUMENTATIONS_UPDATED | ANNOTATION_REFUSED
//                                        (also rewrites the contracts of the updated targets; then DOCUMENTATIONS_STATUS_CHANGED)
  | 'GET_CONTRACT' //           GetContractData → CONTRACT_LOADED | ANNOTATION_REFUSED (NO_CONTRACT)
  | 'UPDATE_CONTRACTS' //       UpdateContractsData → CONTRACTS_UPDATED | ANNOTATION_REFUSED (NOTHING_TO_UPDATE)
//                                        (then DOCUMENTATIONS_STATUS_CHANGED)
  | 'REMOVE_CONTRACT' //        RemoveContractData → CONTRACTS_UPDATED | ANNOTATION_REFUSED (NO_CONTRACT)
//                                        (then DOCUMENTATIONS_STATUS_CHANGED)
  | 'GET_CONTRACT_SETTINGS' //            → CONTRACT_SETTINGS_LOADED
  | 'SET_CONTRACT_SETTINGS' //  ContractSettings → CONTRACT_SETTINGS_SAVED

export type AnnotationEvent =
  | 'SELECTION_CHANGED' //              SelectionDigest (also pushed on penpot 'selectionchange')
  | 'ANNOTATION_STYLE_LOADED' //        AnnotationStyle
  | 'ANNOTATION_STYLE_SAVED' //         AnnotationStyle
  | 'ANNOTATION_APPLIED' //             AnnotationAppliedData
  | 'ANNOTATION_REFUSED' //             AnnotationRefusedData
  | 'DOCUMENTATIONS_STATUS_CHANGED' //  DocumentationsStatusData (also pushed on 'contentsave', 'pagechange', and after generate/update)
  | 'DOCUMENTATIONS_UPDATED' //         DocumentationsUpdatedData
  | 'CONTRACT_LOADED' //                ContractLoadedData
  | 'CONTRACTS_UPDATED' //              ContractsUpdatedData
  | 'CONTRACT_SETTINGS_LOADED' //       ContractSettings
  | 'CONTRACT_SETTINGS_SAVED' //        ContractSettings
