export interface NotificationMessage {
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
  message: string
  timer?: number
}

export interface PluginMessageData {
  type: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
}
