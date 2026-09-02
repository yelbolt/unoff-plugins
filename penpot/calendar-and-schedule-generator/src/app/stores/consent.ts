import { atom } from 'nanostores'
import { ConsentConfiguration } from '@unoff/ui'

export const getUserConsent = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  locales: (key: string, params?: Record<string, any> | undefined) => string
): Array<ConsentConfiguration> => [
  {
    name: locales('vendors.mixpanel.name'),
    id: 'mixpanel',
    icon: 'https://asset.brandfetch.io/idr_rhI2FS/ideb-tnj2D.svg',
    description: locales('vendors.mixpanel.description'),
    isConsented: false,
  },
  // Add more consent configurations as needed
]

export const $userConsent = atom<Array<ConsentConfiguration>>([])

export const updateUserConsent = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  locales: (key: string, params?: Record<string, any> | undefined) => string
) => {
  const currentConsent = $userConsent.get()
  const updatedConsent = getUserConsent(locales).map((consent) => {
    const existing = currentConsent.find((c) => c.id === consent.id)
    return existing
      ? { ...consent, isConsented: existing.isConsented }
      : consent
  })
  $userConsent.set(updatedConsent)
}

export const updateUserConsentWithData = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  locales: (key: string, params?: Record<string, any> | undefined) => string,
  consentData: Array<ConsentConfiguration>
) => {
  const updatedConsent = getUserConsent(locales).map((consent) => {
    const existing = consentData.find((c) => c.id === consent.id)
    return existing
      ? { ...consent, isConsented: existing.isConsented }
      : consent
  })
  $userConsent.set(updatedConsent)
}
