import {
  getContract as read,
  loadContractSettings,
  removeContract as drop,
  saveContractSettings,
  updateContracts as refresh,
} from '../../canvas/annotations/contract'
import { surfaceError } from './surfaceError'
import { pushDocumentationsStatus } from './documentationsStatus'
import type {
  GetContractData,
  RemoveContractData,
  UpdateContractsData,
} from '../../app/types/annotations'

const refused = (r: { refused: unknown }): void =>
  penpot.ui.sendMessage({ type: 'ANNOTATION_REFUSED', data: r.refused })

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
