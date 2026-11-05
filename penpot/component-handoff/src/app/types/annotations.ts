// Message contract shared by UI (src/app) and Canvas (src/canvas, src/bridges).

/** DOCUMENTATION is drawn for humans; CONTRACT is JSON for AI agents, written alongside every documentation and unaffected by its options. */
export type AnnotationKind = 'DOCUMENTATION' | 'CONTRACT'

export type DocTarget = 'COMPONENT' | 'FAMILY'

/** VARIANTS and PROPS are ignored for COMPONENT. */
export type DocView =
  'ANATOMY' | 'VARIANTS' | 'PROPS' | 'MEASUREMENTS' | 'COLORS'

/** Section order in the generated documentation. */
export const DOC_VIEWS: Array<DocView> = [
  'VARIANTS',
  'PROPS',
  'ANATOMY',
  'MEASUREMENTS',
  'COLORS',
]

/** Shared plugin data namespace on `penpot.currentFile`, readable by any plugin. */
export const CONTRACT_NAMESPACE = 'unoff.handoff'
/** Bump on a breaking change. */
export const CONTRACT_SCHEMA = 'unoff.handoff/contract@1'
export const CONTRACT_INDEX_KEY = 'index'
/** `targetId` is the documented root (variant container for a family, main otherwise). */
export const contractKey = (targetId: string): string => `contract:${targetId}`

export interface ContractSummary {
  /** 0 for a component. */
  props: number
  rules: number
  /** 0..1 — share of token-capable rule values backed by a token. */
  tokenizedShare: number
  exceptions: number
}

export interface ContractSettings {
  autoUpdate: boolean
}

export const DEFAULT_CONTRACT_SETTINGS: ContractSettings = {
  autoUpdate: false,
}

export interface ContractStatus {
  /** `contract:<targetId>`. */
  key: string
  targetId: string
  name: string
  target: DocTarget
  outdated: boolean
  missing: boolean
  /** Epoch ms. */
  generatedAt: number
  summary: ContractSummary
}

export type PartsDetail = 'MAIN' | 'ALL'

export type Grouping = 'MERGED' | 'SPLIT'

/** A variant is documented when, for every listed property, its value is ticked; absent properties are unfiltered. */
export type VariantFilter = Record<string, Array<string>>

export type Unit = 'px' | 'rem'

export type LabelPlacement = 'AUTO' | 'OUTSIDE' | 'INSIDE'

/** VIEWPORT divides sizes by the viewport zoom at draw time. */
export type ScaleMode = 'DESIGN' | 'VIEWPORT'

export interface AnnotationStyle {
  color: string
  /** In px. */
  textSize: number
  unit: Unit
  /** Px per rem, used only when unit is 'rem'. */
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

/** COPY is documented through its main component. */
export type ComponentKind =
  'FAMILY' | 'VARIANT' | 'MAIN' | 'COPY' | 'BOARD' | 'OTHER'

export interface VariantProperty {
  name: string
  /** In the family's own order. */
  values: Array<string>
}

export interface SelectionItem {
  id: string
  name: string
  type: string
  componentKind: ComponentKind
  /** COPY → its main's name. */
  componentName: string | null
  familyName: string | null
  variantProperties: Array<VariantProperty>
  variantCount: number
  variantValues: Record<string, string> | null
  /** Lets the UI count filter matches. */
  familyVariants: Array<Record<string, string>>
  /** Direct visible layers of the documented root (first variant for a family). */
  topLevelLayers: Array<string>
  nestedLayerCount: number
  isRotated: boolean
  hasChildren: boolean
  isAnnotation: boolean
  /** Documented root per DocTarget, null when refused; feeds contractKey(). */
  targetIds: { COMPONENT: string | null; FAMILY: string | null }
}

export interface SelectionDigest {
  count: number
  /** Capped at 2; `count` stays exact. */
  items: Array<SelectionItem>
  boardId: string | null
  boardName: string | null
  annotatedCount: number
  /** Any selected shape, not only `items`. */
  containsAnnotation: boolean
}

export interface DocumentationStatus {
  docId: string
  targetId: string
  name: string
  target: DocTarget
  boardName: string | null
  outdated: boolean
  missing: boolean
  /** Epoch ms. */
  generatedAt: number
}

export type RefusalReason =
  | 'NO_SELECTION'
  | 'WRONG_SELECTION_COUNT'
  | 'NOT_A_FAMILY'
  | 'NO_VIEW'
  | 'NO_VARIANT'
  | 'ANNOTATION_SELECTED'
  | 'NOTHING_TO_UPDATE'
  | 'NO_CONTRACT'

export interface GenerateDocumentationData {
  target: DocTarget
  views: Array<DocView>
  depth: PartsDetail
  /** FAMILY only. */
  grouping: Grouping
  /** FAMILY only; null = every variant. */
  variantFilter: VariantFilter | null
}

export interface LocateDocumentationData {
  docId: string
}

export interface UpdateDocumentationsData {
  docIds: Array<string> | 'OUTDATED'
}

export interface GetContractData {
  key: string
}

export interface UpdateContractsData {
  keys: Array<string> | 'OUTDATED'
}

export interface RemoveContractData {
  /** A missing target never removes a contract by itself. */
  key: string
}

export interface AnnotationAppliedData {
  kind: AnnotationKind
  created: number
  updated: number
  boardName: string | null
  rotatedNotice: boolean
  parts?: number
  variants?: number
  /** Always the whole family (no filter, views or style); null if the write failed. */
  contract: ContractSummary | null
}

export interface AnnotationRefusedData {
  kind: AnnotationKind
  reason: RefusalReason
}

export interface DocumentationsStatusData {
  items: Array<DocumentationStatus>
  outdatedCount: number
  contracts: Array<ContractStatus>
  contractsOutdatedCount: number
}

export interface DocumentationsUpdatedData {
  updated: number
  /** Documentations whose target is gone. */
  removed: number
}

export interface ContractLoadedData {
  key: string
  json: string
}

export interface ContractsUpdatedData {
  updated: number
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
