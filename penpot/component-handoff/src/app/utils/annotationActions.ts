import {
  AnnotationAction,
  AnnotationStyle,
  GenerateDocumentationData,
  LocateDocumentationData,
  UpdateDocumentationsData,
} from '../types/annotations'
import { $pendingAction } from '../stores/annotations'
import { sendPluginMessage } from './pluginMessage'

type ActionPayloads = {
  GET_SELECTION: undefined
  GET_ANNOTATION_STYLE: undefined
  SET_ANNOTATION_STYLE: AnnotationStyle
  GENERATE_DOCUMENTATION: GenerateDocumentationData
  GET_DOCUMENTATIONS_STATUS: undefined
  LOCATE_DOCUMENTATION: LocateDocumentationData
  UPDATE_DOCUMENTATIONS: UpdateDocumentationsData
}

const READ_ONLY_ACTIONS: Array<AnnotationAction> = [
  'GET_SELECTION',
  'GET_ANNOTATION_STYLE',
  'GET_DOCUMENTATIONS_STATUS',
  'LOCATE_DOCUMENTATION',
  // Autosave: persisted silently, never shown as a pending action.
  'SET_ANNOTATION_STYLE',
]

/**
 * Sends a UI → Canvas action and marks it pending until a result message
 * (applied, refused, documentations updated, style saved) clears it in App.tsx.
 */
export const sendAnnotationAction = <A extends AnnotationAction>(
  type: A,
  data?: ActionPayloads[A]
) => {
  if (!READ_ONLY_ACTIONS.includes(type)) $pendingAction.set(type)

  sendPluginMessage(
    { pluginMessage: data === undefined ? { type } : { type, data } },
    '*'
  )
}
