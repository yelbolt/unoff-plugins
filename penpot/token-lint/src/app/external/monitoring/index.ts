// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sentryInstance: any | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const initSentry = (instance: any) => {
  sentryInstance = instance
  return sentryInstance
}

export const getSentry = () => {
  return sentryInstance
}
