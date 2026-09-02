let notionApiKey: string | null = null

export const initNotion = (apiKey: string) => {
  notionApiKey = apiKey
}

export const buildHeaders = (): HeadersInit =>
  notionApiKey ? { Authorization: notionApiKey } : {}
