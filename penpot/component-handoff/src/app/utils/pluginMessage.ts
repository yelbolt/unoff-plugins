interface PluginMessageData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pluginMessage?: any
  pluginId?: string
}

interface PluginMessageEventDetail {
  message: PluginMessageData
  targetOrigin: string
}

export class PluginMessageEvent extends CustomEvent<PluginMessageEventDetail> {
  constructor(message: PluginMessageData, targetOrigin = '*') {
    super('pluginMessage', {
      detail: {
        message,
        targetOrigin,
      },
      bubbles: true,
      composed: true,
    })
  }

  get message(): PluginMessageData {
    return this.detail.message
  }

  get targetOrigin(): string {
    return this.detail.targetOrigin
  }
}

// Helper function to create and dispatch a plugin message within the iframe
export const sendPluginMessage = (
  message: PluginMessageData,
  targetOrigin = '*'
): void => {
  const event = new CustomEvent('pluginMessage', {
    detail: { message: message, targetOrigin: targetOrigin || '*' },
  })

  window.dispatchEvent(event)
}
