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

/** Stays set until every request sent got its reply, tracked per channel. */
export const $pendingAction = atom<string | null>(null)

export type PendingChannel = 'DOCUMENTATION' | 'CONTRACT'

const awaitingChannels = new Set<PendingChannel>()

export const markPending = (type: string, channel: PendingChannel) => {
  awaitingChannels.add(channel)
  $pendingAction.set(type)
}

export const resolvePending = (channel: PendingChannel) => {
  awaitingChannels.delete(channel)
  if (awaitingChannels.size === 0) $pendingAction.set(null)
}

export const clearPending = () => {
  awaitingChannels.clear()
  $pendingAction.set(null)
}

export const $localNotice = atom<NotificationMessage | null>(null)

export const showLocalNotice = (notice: NotificationMessage) =>
  $localNotice.set({ ...notice })

export const $contractSettings = atom<ContractSettings>({
  ...DEFAULT_CONTRACT_SETTINGS,
})

export interface DocSettings {
  target: DocTarget | null // null = follow the default derived from the selection
  views: Array<DocView>
  depth: PartsDetail
  grouping: Grouping
  unticked: Record<string, Array<string>>
}

export const DEFAULT_DOC_SETTINGS: DocSettings = {
  target: null,
  views: [...DOC_VIEWS],
  depth: 'MAIN',
  grouping: 'MERGED',
  unticked: {},
}

export const $docSettings = atom<DocSettings>({ ...DEFAULT_DOC_SETTINGS })

export const updateDocSettings = (
  patch:
    Partial<DocSettings> | ((settings: DocSettings) => Partial<DocSettings>)
) => {
  const current = $docSettings.get()
  $docSettings.set({
    ...current,
    ...(typeof patch === 'function' ? patch(current) : patch),
  })
}

let lastSelectedId: string | undefined = $selection.get().items[0]?.id
$selection.listen((value) => {
  const id = value.items[0]?.id
  if (id === lastSelectedId) return
  lastSelectedId = id
  updateDocSettings({ target: null, unticked: {} })
})
