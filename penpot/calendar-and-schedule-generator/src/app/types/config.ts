import { Feature } from '@unoff/utils'
import { Language } from './translations'
import { Editor } from './app'

export interface Config {
  limits: {
    pageSize: number
    width: number
    height: number
    minWidth: number
    minHeight: number
  }
  env: {
    isDev: boolean
    platform: 'figma' | 'penpot' | 'sketch' | 'framer'
    editor: Editor
    ui: 'figma' | 'penpot' | 'sketch' | 'framer'
    colorMode:
      | 'figma-light'
      | 'figma-dark'
      | 'penpot-light'
      | 'penpot-dark'
      | 'sketch-light'
      | 'sketch-dark'
      | 'framer-light'
      | 'framer-dark'
    isSupabaseEnabled: boolean
    isMixpanelEnabled: boolean
    isSentryEnabled: boolean
    isNotionEnabled: boolean
    announcementsDbId: string
    onboardingDbId: string
    readonly pluginId: string
  }
  information: {
    readonly pluginName: string
    readonly authorName: string
    readonly licenseName: string
    readonly repositoryName: string
  }
  plan: {
    isProEnabled: boolean
    isTrialEnabled: boolean
    isCreditsEnabled: boolean
    trialTime: number
    creditsLimit: number
    creditsRenewalPeriodDays: number
    creditsRenewalPeriodHours?: number
  }
  dbs: {
    dbViewName: string
  }
  urls: {
    authWorkerUrl: string
    announcementsWorkerUrl: string
    corsWorkerUrl: string
    databaseUrl: string
    authUrl: string
    storeApiUrl: string
    platformUrl: string
    uiUrl: string
    documentationUrl: string
    repositoryUrl: string
    supportEmail: string
    communityUrl: string
    feedbackUrl: string
    trialFeedbackUrl: string
    requestsUrl: string
    networkUrl: string
    authorUrl: string
    licenseUrl: string
    privacyUrl: string
    storeUrl: string
    storeManagementUrl: string
  }
  versions: {
    readonly userConsentVersion: string
    readonly trialVersion: string
    readonly pluginVersion: string
    readonly creditsVersion: string
  }
  features: Array<Feature<'MY_SERVICE'>>
  lang: Language
  fees: {
    myFee: number
  }
}
