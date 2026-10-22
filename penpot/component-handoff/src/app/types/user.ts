export type ConnectionStatus = 'CONNECTED' | 'UNCONNECTED'

export interface UserSession {
  connectionStatus: ConnectionStatus
  id: string
  fullName: string
  avatar: string
}

export interface UserIdentity {
  id: string
  fullName: string
  avatar: string
}
