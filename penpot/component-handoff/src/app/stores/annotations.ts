import { atom } from 'nanostores'
import {
  AnnotationStyle,
  DEFAULT_ANNOTATION_STYLE,
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
})

export const setDocumentationsStatus = (status: DocumentationsStatusData) =>
  $documentationsStatus.set(status)

export const setSelection = (digest: SelectionDigest) => $selection.set(digest)

export const setAnnotationStyle = (style: AnnotationStyle) => {
  $annotationStyle.set({ ...style })
  $isAnnotationStyleLoaded.set(true)
}

/**
 * Message type of the action awaiting a Canvas answer (drives button loaders).
 * Cleared by App.tsx when any result message (applied, refused,
 * documentations updated, style saved) arrives.
 */
export const $pendingAction = atom<string | null>(null)

/**
 * Documentation tab settings, shared by the selection header (Generate button)
 * and the Document context (the form).
 */
export interface DocSettings {
  target: DocTarget | null // null = follow the default derived from the selection
  views: Array<DocView>
  depth: PartsDetail
  grouping: Grouping
  unticked: Record<string, Array<string>> // per variant property, the values the user unticked
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
