import { Feature } from '@unoff/utils'
import { Config } from './app/types/config'
import { doSpecificMode } from './app/stores/features'

declare const __APP_VERSION__: string

const isDev = import.meta.env.MODE === 'development'

const globalConfig: Config = {
  limits: {
    pageSize: 20,
    width: 640,
    height: 640,
    minWidth: 240,
    minHeight: 420,
  },
  env: {
    platform: 'penpot',
    editor: 'penpot',
    ui: 'penpot',
    colorMode: 'penpot-dark',
    isDev,
    isSupabaseEnabled: false,
    isMixpanelEnabled: false,
    isSentryEnabled: false,
    isNotionEnabled: false,
    announcementsDbId: import.meta.env.VITE_NOTION_ANNOUNCEMENTS_ID as string,
    onboardingDbId: import.meta.env.VITE_NOTION_ONBOARDING_ID as string,
    pluginId: '1786470224232534948',
  },
  information: {
    pluginName: 'Calendar and Schedule Generator',
    authorName: 'Aurélien Grimaud',
    licenseName: 'MIT',
    repositoryName: 'calendar-and-schedule-generator',
  },
  plan: {
    isProEnabled: true,
    isTrialEnabled: false,
    isCreditsEnabled: false,
    trialTime: 72,
    creditsLimit: 250,
    creditsRenewalPeriodDays: 1,
    creditsRenewalPeriodHours: 24,
  },
  dbs: {
    dbViewName: 'table_view_name',
  },
  urls: {
    authWorkerUrl: import.meta.env.VITE_AUTH_WORKER_URL as string,
    announcementsWorkerUrl: import.meta.env
      .VITE_ANNOUNCEMENTS_WORKER_URL as string,
    corsWorkerUrl: import.meta.env.VITE_CORS_WORKER_URL as string,
    databaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
    authUrl: import.meta.env.VITE_AUTH_URL as string,
    storeApiUrl: import.meta.env.VITE_LEMONSQUEEZY_URL as string,
    platformUrl: 'https://www.penpot.com',
    uiUrl: isDev ? 'http://localhost:4400' : 'https://ui.calendar-and-schedule-generator.com',
    documentationUrl: 'https://uno.ylb.lt/docs',
    repositoryUrl: 'https://github.com/yelbolt/unoff-template-penpot',
    communityUrl: 'https://uno.ylb.lt/community',
    supportEmail: 'https://github.com/yelbolt/unoff-template-penpot/issues',
    feedbackUrl: 'https://github.com/yelbolt/unoff-template-penpot/issues',
    trialFeedbackUrl: 'https://github.com/yelbolt/unoff-template-penpot/issues',
    requestsUrl: 'https://github.com/yelbolt/unoff-template-penpot/issues',
    networkUrl: 'https://uno.ylb.lt/network',
    authorUrl: 'https://uno.ylb.lt/author',
    licenseUrl:
      'https://github.com/yelbolt/unoff-template-penpot/blob/main/LICENSE',
    privacyUrl: 'https://uno.ylb.lt/privacy',
    storeUrl: 'https://uno.ylb.lt/start',
    storeManagementUrl: 'https://uno.ylb.lt/start',
  },
  versions: {
    userConsentVersion: '2025.09',
    trialVersion: '2024.03',
    pluginVersion: __APP_VERSION__,
    creditsVersion: '2025.12',
  },
  features: doSpecificMode(
    [
      // Desactivated features
      'RESIZE_UI',
    ],
    [
      // Pro features
      'ADD_ITEM',
    ],
    [
      // New features
      'EXAMPLES_LAYER_INSPECTOR',
    ]
  ),
  lang: 'en-US',
  fees: {
    myFee: 50,
  },
}

const limitsMapping: { [key: string]: keyof typeof globalConfig.limits } = {
  //
}

globalConfig.features.forEach((feature: Feature<'MY_SERVICE'>) => {
  const limitKey = limitsMapping[feature.name]
  if (limitKey && globalConfig.limits[limitKey] !== undefined)
    feature.limit = globalConfig.limits[limitKey]
})

export default globalConfig
