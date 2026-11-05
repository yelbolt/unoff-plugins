// Shared vocabulary between UI (src/app) and Canvas (src/canvas, src/bridges).
// This file is the message contract for Component Handoff — change a `type`
// or a payload shape here and on both sides, never on one side only.

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

/** Section order in the generated documentation (Variants first). */
export const DOC_VIEWS: Array<DocView> = [
  'VARIANTS',
  'PROPS',
  'ANATOMY',
  'MEASUREMENTS',
  'COLORS',
]

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
  /** Variant properties (0 for a component). */
  props: number
  rules: number
  /** 0..1 — share of token-capable rule values backed by a token. */
  tokenizedShare: number
  exceptions: number
}

/** Document-level contract settings, stored on the file (private plugin data). */
export interface ContractSettings {
  /** Rewrite outdated contracts without asking (default false). */
  autoUpdate: boolean
}

export const DEFAULT_CONTRACT_SETTINGS: ContractSettings = {
  autoUpdate: false,
}

/** One contract of the current page, with its freshness. */
export interface ContractStatus {
  /** `contract:<targetId>`. */
  key: string
  targetId: string
  name: string
  target: DocTarget
  /** As written in the contract's `status`, refreshed at launch and after each save. */
  outdated: boolean
  /** The documented target no longer exists. */
  missing: boolean
  /** Epoch ms. */
  generatedAt: number
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
  /** Hex, e.g. '#FF3D7F'. */
  color: string
  /** In px. */
  textSize: number
  unit: Unit
  /** Px per rem, used only when unit === 'rem'. */
  remBase: number
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
  'FAMILY' | 'VARIANT' | 'MAIN' | 'COPY' | 'BOARD' | 'OTHER'

export interface VariantProperty {
  name: string
  /** In the family's own order; no value is a default. */
  values: Array<string>
}

export interface SelectionItem {
  id: string
  name: string
  /** Penpot shape type: 'board' | 'rectangle' | 'text' | … */
  type: string
  componentKind: ComponentKind
  /** Library component name (COPY → its main). */
  componentName: string | null
  /** Variant container name when FAMILY / VARIANT / COPY of a variant. */
  familyName: string | null
  /** Empty unless a family is reachable. */
  variantProperties: Array<VariantProperty>
  /** 0 unless a family is reachable. */
  variantCount: number
  /** VARIANT (or COPY of a variant): its own variantProps; null otherwise. */
  variantValues: Record<string, string> | null
  /** Every variant's variantProps when a family is reachable (lets the UI count filter matches); empty otherwise. */
  familyVariants: Array<Record<string, string>>
  /** Names of the documented root's direct visible layers (first variant for a family) — makes PartsDetail 'MAIN' concrete. */
  topLevelLayers: Array<string>
  /** Count of every nested visible layer under that root — makes PartsDetail 'ALL' concrete. */
  nestedLayerCount: number
  isRotated: boolean
  hasChildren: boolean
  /** Shape belongs to a Component Handoff documentation layer. */
  isAnnotation: boolean
  /**
   * The documented root for each choice of "What to document" (variant
   * container for FAMILY, main component otherwise), null when that choice is
   * refused. Lets the UI find the stored contract (contractKey(id)) in the
   * status list without computing anything.
   */
  targetIds: { COMPONENT: string | null; FAMILY: string | null }
}

export interface SelectionDigest {
  count: number
  /** Capped at 2 meaningful items; `count` stays exact. */
  items: Array<SelectionItem>
  /** Top-level board hosting the first item. */
  boardId: string | null
  boardName: string | null
  /** Existing documentations targeting the selected items. */
  annotatedCount: number
  /** True if ANY selected shape (not only items) is a documentation shape. */
  containsAnnotation: boolean
}

/** One documentation found on the current page, with its freshness. */
export interface DocumentationStatus {
  /** Id of the documentation group. */
  docId: string
  /** Documented root (variant container for a family, main otherwise). */
  targetId: string
  /** Component or family name. */
  name: string
  target: DocTarget
  boardName: string | null
  /** Fingerprint of the target differs from the one stored at generation. */
  outdated: boolean
  /** The documented target no longer exists. */
  missing: boolean
  /** Epoch ms. */
  generatedAt: number
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

export interface GenerateDocumentationData {
  target: DocTarget
  views: Array<DocView>
  /** Which layers become numbered parts. */
  depth: PartsDetail
  /** FAMILY only; ignored for COMPONENT. */
  grouping: Grouping
  /** FAMILY only; null = every variant. */
  variantFilter: VariantFilter | null
}

export interface LocateDocumentationData {
  /** Selects the documentation and brings it into view. */
  docId: string
}

export interface UpdateDocumentationsData {
  /** Explicit ids, or every outdated one on the page. */
  docIds: Array<string> | 'OUTDATED'
}

export interface GetContractData {
  /** `contract:<targetId>`. */
  key: string
}

export interface UpdateContractsData {
  /** Explicit keys, or every outdated, non-missing one on the page. */
  keys: Array<string> | 'OUTDATED'
}

export interface RemoveContractData {
  /** Explicit removal only — a missing target never removes a contract by itself. */
  key: string
}

export interface AnnotationAppliedData {
  kind: AnnotationKind
  created: number
  /** Re-runs update in place instead of duplicating. */
  updated: number
  boardName: string | null
  /** At least one measured element was rotated (bbox). */
  rotatedNotice: boolean
  /** Anatomy parts numbered. */
  parts?: number
  /** FAMILY: variants documented. */
  variants?: number
  /**
   * The machine contract written alongside, for the same target and always
   * for the whole family (no filter, views or style); null if it could not be
   * written — the documentation itself is still generated.
   */
  contract: ContractSummary | null
}

export interface AnnotationRefusedData {
  kind: AnnotationKind
  reason: RefusalReason
}

export interface DocumentationsStatusData {
  items: Array<DocumentationStatus>
  outdatedCount: number
  /** Contracts whose documented target is on the current page (or missing, last seen on it). */
  contracts: Array<ContractStatus>
  contractsOutdatedCount: number
}

export interface DocumentationsUpdatedData {
  updated: number
  /** Documentations whose target is gone, removed. */
  removed: number
}

export interface ContractLoadedData {
  key: string
  /** The stored contract, pretty-printed, ready to copy. */
  json: string
}

export interface ContractsUpdatedData {
  updated: number
  /** Only through REMOVE_CONTRACT. */
  removed: number
}

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
