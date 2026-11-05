import {
  AnnotationAction,
  AnnotationStyle,
  ContractSettings,
  GenerateDocumentationData,
  GetContractData,
  LocateDocumentationData,
  RemoveContractData,
  UpdateContractsData,
  UpdateDocumentationsData,
} from '../types/annotations'
import { PendingChannel, markPending } from '../stores/annotations'
import { sendPluginMessage } from './pluginMessage'

type ActionPayloads = {
  GET_SELECTION: undefined
  GET_ANNOTATION_STYLE: undefined
  SET_ANNOTATION_STYLE: AnnotationStyle
  GENERATE_DOCUMENTATION: GenerateDocumentationData
  GET_DOCUMENTATIONS_STATUS: undefined
  LOCATE_DOCUMENTATION: LocateDocumentationData
  UPDATE_DOCUMENTATIONS: UpdateDocumentationsData
  GET_CONTRACT: GetContractData
  UPDATE_CONTRACTS: UpdateContractsData
  REMOVE_CONTRACT: RemoveContractData
  GET_CONTRACT_SETTINGS: undefined
  SET_CONTRACT_SETTINGS: ContractSettings
}

const READ_ONLY_ACTIONS: Array<AnnotationAction> = [
  'GET_SELECTION',
  'GET_ANNOTATION_STYLE',
  'GET_DOCUMENTATIONS_STATUS',
  'LOCATE_DOCUMENTATION',
  // Autosave: persisted silently, never shown as a pending action.
  'SET_ANNOTATION_STYLE',
  'GET_CONTRACT_SETTINGS',
  'SET_CONTRACT_SETTINGS',
]

const PENDING_CHANNELS: Partial<Record<AnnotationAction, PendingChannel>> = {
  GENERATE_DOCUMENTATION: 'DOCUMENTATION',
  UPDATE_DOCUMENTATIONS: 'DOCUMENTATION',
  UPDATE_CONTRACTS: 'CONTRACT',
  GET_CONTRACT: 'CONTRACT',
  REMOVE_CONTRACT: 'CONTRACT',
}

/**
 * Sends a UI → Canvas action and marks it pending until its result message
 * releases the channel in App.tsx. Several actions may be pending at once
 * (one per channel); the loader waits for all of them.
 */
export const sendAnnotationAction = <A extends AnnotationAction>(
  type: A,
  data?: ActionPayloads[A]
) => {
  const channel = PENDING_CHANNELS[type]
  if (!READ_ONLY_ACTIONS.includes(type) && channel !== undefined)
    markPending(type, channel)

  sendPluginMessage(
    { pluginMessage: data === undefined ? { type } : { type, data } },
    '*'
  )
}
