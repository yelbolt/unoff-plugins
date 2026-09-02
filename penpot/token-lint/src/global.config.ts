import { Feature } from '@unoff/utils'
import { Config } from './app/types/config'
import { doSpecificMode } from './app/stores/features'

declare const __APP_VERSION__: string

const isDev = import.meta.env.MODE === 'development'

const globalConfig: Config = {
  limits: {
    pageSize: 20,
    width: 600,
    height: 800,
    minWidth: 240,
    minHeight: 420,
    auditChunkSize: 200,
    auditProgressIntervalMs: 250,
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
    pluginId: '1787230713023627494',
  },
  information: {
    pluginName: 'Token Lint',
    authorName: 'Aurélien Grimaud',
    licenseName: 'MIT',
    repositoryName: 'unoff-plugins',
  },
  plan: {
    isProEnabled: false,
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
    platformUrl: '*',
    uiUrl: isDev
      ? 'http://localhost:4400'
      : 'https://plugins.unoff.dev/penpot/token-lint',
    documentationUrl: '',
    repositoryUrl:
      'https://github.com/yelbolt/unoff-plugins/tree/main/penpot/token-lint',
    communityUrl: 'https://uno.ylb.lt/community',
    supportEmail: '',
    feedbackUrl: '',
    trialFeedbackUrl: '',
    requestsUrl: 'https://github.com/yelbolt/unoff-plugins/issues',
    networkUrl: 'https://uno.ylb.lt/network',
    authorUrl: 'https://uno.ylb.lt/author',
    licenseUrl:
      'https://github.com/yelbolt/unoff-plugins/blob/main/penpot/token-lint/LICENSE',
    privacyUrl: '',
    storeUrl: '',
    storeManagementUrl: '',
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
      'PRO_PLAN',
      'USER_LICENSE',
      'AUTHENTICATION',
      'USER_CONSENT',
      'HELP_DOCUMENTATION',
      'HELP_ANNOUNCEMENTS',
      'HELP_ONBOARDING',
      'HELP_EMAIL',
      'HELP_CHAT',
      'INVOLVE_FEEDBACK',
    ],
    [
      // Pro features
    ],
    [
      // New features
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

globalConfig.features.forEach((feature: Feature<'TOKEN_LINT'>) => {
  const limitKey = limitsMapping[feature.name]
  if (limitKey && globalConfig.limits[limitKey] !== undefined)
    feature.limit = globalConfig.limits[limitKey]
})

export default globalConfig
