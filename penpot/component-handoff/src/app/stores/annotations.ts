import { atom } from 'nanostores'
import { NotificationMessage } from '../types/messages'
import {
  AnnotationStyle,
  ContractSettings,
  DEFAULT_ANNOTATION_STYLE,
  DEFAULT_CONTRACT_SETTINGS,
  DOC_VIEWS,
  DocTarget,
  DocView,
  DocumentationsStatusData,
  Grouping,
  PartsDetail,
  SelectionDigest,
} from '../types/annotations'

// Fed exclusively by confirmed Canvas → UI messages routed in App.tsx
// (SELECTION_CHANGED, ANNOTATION_STYLE_LOADED, ANNOTATION_STYLE_SAVED).

export const EMPTY_SELECTION: SelectionDigest = {
  count: 0,
  items: [],
  boardId: null,
  boardName: null,
  annotatedCount: 0,
  containsAnnotation: false,
}

export const $selection = atom<SelectionDigest>(EMPTY_SELECTION)
export const $annotationStyle = atom<AnnotationStyle>({
  ...DEFAULT_ANNOTATION_STYLE,
})

/** True once the Canvas answered GET_ANNOTATION_STYLE at least once. */
export const $isAnnotationStyleLoaded = atom<boolean>(false)

export const $documentationsStatus = atom<DocumentationsStatusData>({
  items: [],
  outdatedCount: 0,
  contracts: [],
  contractsOutdatedCount: 0,
})

export const setDocumentationsStatus = (status: DocumentationsStatusData) =>
  $documentationsStatus.set(status)

export const setSelection = (digest: SelectionDigest) => $selection.set(digest)

export const setAnnotationStyle = (style: AnnotationStyle) => {
  $annotationStyle.set({ ...style })
  $isAnnotationStyleLoaded.set(true)
}

/**
 * Message type of the latest action awaiting a Canvas answer (drives button
 * loaders). It stays set until EVERY request sent got its reply: requests are
 * tracked per reply channel (see PENDING_CHANNELS), and App.tsx releases a
 * channel when the matching result message arrives.
 */
export const $pendingAction = atom<string | null>(null)

/**
 * The Canvas answers on one of two channels: the visual documentation
 * (ANNOTATION_APPLIED, DOCUMENTATIONS_UPDATED, ANNOTATION_REFUSED of kind
 * DOCUMENTATION) or the machine contract (CONTRACT_WRITTEN, CONTRACTS_UPDATED,
 * CONTRACT_LOADED, ANNOTATION_REFUSED of kind CONTRACT).
 */
export type PendingChannel = 'DOCUMENTATION' | 'CONTRACT'

const awaitingChannels = new Set<PendingChannel>()

export const markPending = (type: string, channel: PendingChannel) => {
  awaitingChannels.add(channel)
  $pendingAction.set(type)
}

/** A reply arrived on this channel; the loader stops once no channel is left. */
export const resolvePending = (channel: PendingChannel) => {
  awaitingChannels.delete(channel)
  if (awaitingChannels.size === 0) $pendingAction.set(null)
}

/** Releases everything (an error surfaced without a per-channel reply). */
export const clearPending = () => {
  awaitingChannels.clear()
  $pendingAction.set(null)
}

/** A notification raised by the UI itself (e.g. clipboard result); App.tsx displays it. */
export const $localNotice = atom<NotificationMessage | null>(null)

export const showLocalNotice = (notice: NotificationMessage) =>
  $localNotice.set({ ...notice })

export const $contractSettings = atom<ContractSettings>({
  ...DEFAULT_CONTRACT_SETTINGS,
})

/**
 * Documentation tab settings, shared by the selection header (Generate button)
 * and the Document context (the form).
 */
export interface DocSettings {
  outputs: { documentation: boolean; contract: boolean } // one switch per output
  target: DocTarget | null // null = follow the default derived from the selection
  views: Array<DocView>
  depth: PartsDetail
  grouping: Grouping
  unticked: Record<string, Array<string>> // per variant property, the values the user unticked
}

export const DEFAULT_DOC_SETTINGS: DocSettings = {
  outputs: { documentation: true, contract: false },
  target: null,
  views: [...DOC_VIEWS],
  depth: 'MAIN',
  grouping: 'MERGED',
  unticked: {},
}

export const $docSettings = atom<DocSettings>({ ...DEFAULT_DOC_SETTINGS })

export const updateDocSettings = (
  patch: Partial<DocSettings> | ((settings: DocSettings) => Partial<DocSettings>)
) => {
  const current = $docSettings.get()
  $docSettings.set({
    ...current,
    ...(typeof patch === 'function' ? patch(current) : patch),
  })
}

// Only a different element re-derives the default target and clears the
// variant filter; the push that follows a generate or an update keeps the
// user's manual choices.
let lastSelectedId: string | undefined = $selection.get().items[0]?.id
$selection.listen((value) => {
  const id = value.items[0]?.id
  if (id === lastSelectedId) return
  lastSelectedId = id
  updateDocSettings({ target: null, unticked: {} })
})
