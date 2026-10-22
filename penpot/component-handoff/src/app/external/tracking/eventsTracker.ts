import { ConsentConfiguration } from '@unoff/ui'
import {
  LanguageEvent,
  PricingEvent,
  TourEvent,
  TrialEvent,
} from '../../types/events'
import { PlanStatus } from '../../types/app'
import { getEditor, getMixpanel, getMixpanelEnv } from './client'

const getOptimizedUserId = (
  userSessionId: string,
  userIdentityId: string
): string => {
  return userSessionId !== '' ? userSessionId : userIdentityId
}

export const trackUserConsentEvent = (
  isEnabled: boolean,
  version: string,
  consent: Array<ConsentConfiguration>
) => {
  const mixpanel = getMixpanel()

  if (!isEnabled) return

  if (mixpanel)
    mixpanel.track('Consent Proof Sent', {
      'User Consent Version': version,
      Env: getMixpanelEnv(),
      Editor: getEditor(),
      Consent: consent.map((c) => {
        return { [c.name]: c.isConsented }
      }),
    })
}

export const trackEditorEvent = (
  isEnabled: boolean,
  userSessionId: string,
  userIdentityId: string,
  planStatus: PlanStatus,
  consent: boolean
) => {
  const mixpanel = getMixpanel()
  const id = getOptimizedUserId(userSessionId, userIdentityId)

  if (!consent || !isEnabled) return
  if (mixpanel)
    mixpanel.track('Editor Run', {
      Env: getMixpanelEnv(),
      Editor: getEditor(),
      Plan: planStatus,
    })

  if (id === '') return
  if (mixpanel) mixpanel.identify(id)
}

export const trackSignInEvent = (
  isEnabled: boolean,
  userSessionId: string,
  userIdentityId: string,
  planStatus: PlanStatus,
  consent: boolean
) => {
  const mixpanel = getMixpanel()
  const id = getOptimizedUserId(userSessionId, userIdentityId)

  if (!consent || !isEnabled) return
  if (mixpanel)
    mixpanel.track('Signed In', {
      Env: getMixpanelEnv(),
      Editor: getEditor(),
      Plan: planStatus,
    })

  if (id === '') return
  if (mixpanel) mixpanel.identify(id)
}

export const trackSignOutEvent = (
  isEnabled: boolean,
  userSessionId: string,
  userIdentityId: string,
  planStatus: PlanStatus,
  consent: boolean
) => {
  const mixpanel = getMixpanel()
  const id = getOptimizedUserId(userSessionId, userIdentityId)

  if (!consent || !isEnabled) return
  if (mixpanel)
    mixpanel.track('Signed Out', {
      Env: getMixpanelEnv(),
      Editor: getEditor(),
      Plan: planStatus,
    })

  if (id === '') return
  if (mixpanel) mixpanel.identify(id)
}

export const trackTrialEnablementEvent = (
  isEnabled: boolean,
  userSessionId: string,
  userIdentityId: string,
  planStatus: PlanStatus,
  consent: boolean,
  options: TrialEvent
) => {
  const mixpanel = getMixpanel()
  const id = getOptimizedUserId(userSessionId, userIdentityId)

  if (!consent || !isEnabled) return
  if (mixpanel)
    mixpanel.track('Trial Enabled', {
      Env: getMixpanelEnv(),
      Editor: getEditor(),
      Plan: planStatus,
      'Trial Start Date': new Date(options.date).toISOString(),
      'Trial End Date': new Date(
        options.date + options.trialTime * 3600 * 1000
      ).toISOString(),
      'Trial Time': options.trialTime + ' hours',
      'Trial Version': '3.2.0',
    })

  if (id === '') return
  if (mixpanel) mixpanel.identify(id)
}

export const trackPurchaseEvent = (
  isEnabled: boolean,
  userSessionId: string,
  userIdentityId: string,
  planStatus: PlanStatus,
  consent: boolean
) => {
  const mixpanel = getMixpanel()
  const id = getOptimizedUserId(userSessionId, userIdentityId)

  if (!consent || !isEnabled) return
  if (mixpanel)
    mixpanel.track('Purchase Enabled', {
      Env: getMixpanelEnv(),
      Editor: getEditor(),
      Plan: planStatus,
    })

  if (id === '') return
  if (mixpanel) mixpanel.identify(id)
}

export const trackOnboardingEvent = (
  isEnabled: boolean,
  userSessionId: string,
  userIdentityId: string,
  planStatus: PlanStatus,
  consent: boolean,
  options: TourEvent
) => {
  const mixpanel = getMixpanel()
  const id = getOptimizedUserId(userSessionId, userIdentityId)

  if (!consent || !isEnabled) return
  if (mixpanel)
    mixpanel.track('Onboarding Consulted', {
      Env: getMixpanelEnv(),
      Editor: getEditor(),
      Plan: planStatus,
      Feature: options.feature,
    })

  if (id === '') return
  if (mixpanel) mixpanel.identify(id)
}

export const trackAnnouncementsEvent = (
  isEnabled: boolean,
  userSessionId: string,
  userIdentityId: string,
  planStatus: PlanStatus,
  consent: boolean,
  options: TourEvent
) => {
  const mixpanel = getMixpanel()
  const id = getOptimizedUserId(userSessionId, userIdentityId)

  if (!consent || !isEnabled) return
  if (mixpanel)
    mixpanel.track('Announcements Consulted', {
      Env: getMixpanelEnv(),
      Editor: getEditor(),
      Plan: planStatus,
      Feature: options.feature,
    })

  if (id === '') return
  if (mixpanel) mixpanel.identify(id)
}

export const trackPricingEvent = (
  isEnabled: boolean,
  userSessionId: string,
  userIdentityId: string,
  planStatus: PlanStatus,
  consent: boolean,
  options: PricingEvent
) => {
  const mixpanel = getMixpanel()
  const id = getOptimizedUserId(userSessionId, userIdentityId)

  if (!consent || !isEnabled) return
  if (mixpanel)
    mixpanel.track('Pricing Consulted', {
      Env: getMixpanelEnv(),
      Editor: getEditor(),
      Plan: planStatus,
      Feature: options.feature,
    })

  if (id === '') return
  if (mixpanel) mixpanel.identify(id)
}

export const trackLanguageEvent = (
  isEnabled: boolean,
  userSessionId: string,
  userIdentityId: string,
  planStatus: PlanStatus,
  consent: boolean,
  options: LanguageEvent
) => {
  const mixpanel = getMixpanel()
  const id = getOptimizedUserId(userSessionId, userIdentityId)

  if (!consent || !isEnabled) return
  if (mixpanel)
    mixpanel.track('Language Updated', {
      Env: getMixpanelEnv(),
      Editor: getEditor(),
      Plan: planStatus,
      Lang: options.lang,
    })

  if (id === '') return
  if (mixpanel) mixpanel.identify(id)
}
