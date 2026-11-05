import {
  generateContract as run,
  getContract as read,
  loadContractSettings,
  removeContract as drop,
  saveContractSettings,
  updateContracts as refresh,
} from '../../canvas/annotations/contract'
import { surfaceError } from './surfaceError'
import { getSelection } from './getSelection'
import { pushDocumentationsStatus } from './documentationsStatus'
import type {
  GenerateContractData,
  GetContractData,
  RemoveContractData,
  UpdateContractsData,
} from '../../app/types/annotations'

const refused = (r: { refused: unknown }): void =>
  penpot.ui.sendMessage({ type: 'ANNOTATION_REFUSED', data: r.refused })

// GENERATE_CONTRACT -> CONTRACT_WRITTEN | ANNOTATION_REFUSED (then DOCUMENTATIONS_STATUS_CHANGED)
export const generateContract = (data: GenerateContractData): void => {
  try {
    const out = run(data)
    if ('written' in out)
      penpot.ui.sendMessage({ type: 'CONTRACT_WRITTEN', data: out.written })
    else refused(out)
    pushDocumentationsStatus()
    getSelection()
  } catch (error) {
    surfaceError(error)
  }
}

// GET_CONTRACT -> CONTRACT_LOADED | ANNOTATION_REFUSED (NO_CONTRACT)
export const getContract = (data: GetContractData): void => {
  try {
    const out = read(data.key)
    if ('loaded' in out)
      penpot.ui.sendMessage({ type: 'CONTRACT_LOADED', data: out.loaded })
    else refused(out)
  } catch (error) {
    surfaceError(error)
  }
}

// UPDATE_CONTRACTS -> CONTRACTS_UPDATED | ANNOTATION_REFUSED (then status)
export const updateContracts = (data: UpdateContractsData): void => {
  try {
    const out = refresh(data)
    if ('updated' in out)
      penpot.ui.sendMessage({ type: 'CONTRACTS_UPDATED', data: out.updated })
    else refused(out)
    pushDocumentationsStatus()
  } catch (error) {
    surfaceError(error)
    pushDocumentationsStatus()
  }
}

// REMOVE_CONTRACT -> CONTRACTS_UPDATED | ANNOTATION_REFUSED (then status)
export const removeContract = (data: RemoveContractData): void => {
  try {
    const out = drop(data.key)
    if ('updated' in out)
      penpot.ui.sendMessage({ type: 'CONTRACTS_UPDATED', data: out.updated })
    else refused(out)
    pushDocumentationsStatus()
  } catch (error) {
    surfaceError(error)
  }
}

// GET_CONTRACT_SETTINGS -> CONTRACT_SETTINGS_LOADED
export const getContractSettings = (): void => {
  try {
    penpot.ui.sendMessage({
      type: 'CONTRACT_SETTINGS_LOADED',
      data: loadContractSettings(),
    })
  } catch (error) {
    surfaceError(error)
  }
}

// SET_CONTRACT_SETTINGS (ContractSettings) -> CONTRACT_SETTINGS_SAVED
// Turning auto-update on settles contracts that are already outdated on the next status push.
export const setContractSettings = (settings: unknown): void => {
  try {
    penpot.ui.sendMessage({
      type: 'CONTRACT_SETTINGS_SAVED',
      data: saveContractSettings(settings),
    })
    pushDocumentationsStatus()
  } catch (error) {
    surfaceError(error)
  }
}
