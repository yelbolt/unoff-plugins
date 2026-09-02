---
name: global-config
description: Central plugin configuration in global.config.ts covering limits, environment variables, URLs, plan, versions, features, lang, and fees sections. Use when adding new config values, understanding what is available via ConfigContext, or wiring environment variables.
---

# Global Configuration

## Overview

See [core.md](../core.md) for the central-config rule. This file is the field-by-field reference for the `globalConfig` object, typed as `Config` (from `/src/app/types/config.ts`).

`globalConfig` is consumed on both sides of the plugin:
- **Canvas side**: Imported directly in `/src/index.ts` and bridge functions
- **UI side**: Passed through `ConfigProvider` context and accessed via `WithConfig` HOC

## Config Type Definition

```typescript
// /src/app/types/config.ts
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
    colorMode: 'figma-light' | 'figma-dark' | 'penpot-light' | 'penpot-dark'
      | 'sketch-light' | 'sketch-dark' | 'framer-light' | 'framer-dark'
    isSupabaseEnabled: boolean
    isMixpanelEnabled: boolean
    isSentryEnabled: boolean
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
```

## Config Sections

### limits

Window and pagination constraints:

```typescript
limits: {
  pageSize: 20,       // Items per page in list views
  width: 640,         // Default plugin window width
  height: 640,        // Default plugin window height
  minWidth: 240,      // Minimum resizable width
  minHeight: 420,     // Minimum resizable height
}
```

Used by `loadUI.ts` for initial window sizing and by `RESIZE_UI` for constraints.

### env

Runtime environment flags and identifiers:

```typescript
env: {
  platform: 'figma',                    // Target platform
  editor: 'figma',                      // Current editor (changes at runtime)
  ui: 'figma',                          // UI theme variant
  colorMode: 'figma-dark',             // Color mode (changes at runtime)
  isDev: import.meta.env.MODE === 'development',
  isSupabaseEnabled: true,              // Toggle Supabase auth
  isMixpanelEnabled: true,             // Toggle Mixpanel analytics
  isSentryEnabled: true,               // Toggle Sentry monitoring
  announcementsDbId: import.meta.env.VITE_NOTION_ANNOUNCEMENTS_ID,
  onboardingDbId: import.meta.env.VITE_NOTION_ONBOARDING_ID,
  pluginId: '{{ pluginId }}',          // Figma plugin ID
}
```

**Service toggle flags** (`isSupabaseEnabled`, `isMixpanelEnabled`, `isSentryEnabled`) control whether external services are initialized at startup. Set to `false` to disable without removing code.

### information

Static plugin metadata:

```typescript
information: {
  pluginName: '{{ pluginName }}',       // Display name
  authorName: '{{ authorName }}',       // Author/company name
  licenseName: '{{ licenseName }}',     // License identifier
  repositoryName: '{{ pluginSlug }}',   // Repository/slug name
}
```

Used in About dialog, consent messages, and metadata displays.

### plan

Monetization configuration:

```typescript
plan: {
  isProEnabled: false,                  // Enable pro plan features
  isTrialEnabled: false,                // Enable trial system
  isCreditsEnabled: false,              // Enable credits system
  trialTime: 72,                        // Trial duration in hours
  creditsLimit: 250,                    // Max credits per period
  creditsRenewalPeriodDays: 1,          // Renewal period in days
  creditsRenewalPeriodHours: 24,        // Renewal period in hours
}
```

Controls the plan/trial/credits system. When `isProEnabled` is `false`, all pro gating is disabled.

### dbs

Database view configuration:

```typescript
dbs: {
  dbViewName: 'table_view_name',        // Supabase view name
}
```

### urls

All external URLs centralized (20+ entries):

```typescript
urls: {
  // Service endpoints (from .env)
  authWorkerUrl: import.meta.env.VITE_AUTH_WORKER_URL,
  announcementsWorkerUrl: import.meta.env.VITE_ANNOUNCEMENTS_WORKER_URL,
  corsWorkerUrl: import.meta.env.VITE_CORS_WORKER_URL,
  databaseUrl: import.meta.env.VITE_SUPABASE_URL,
  authUrl: import.meta.env.VITE_AUTH_URL,
  storeApiUrl: import.meta.env.VITE_LEMONSQUEEZY_URL,

  // Platform URLs
  platformUrl: 'https://www.figma.com',
  uiUrl: isDev ? 'http://localhost:4400' : 'https://ui.example.com',

  // Public URLs
  documentationUrl: 'https://docs.example.com',
  repositoryUrl: 'https://git.example.com/repo',
  communityUrl: 'https://community.example.com',
  supportEmail: 'https://support.example.com',
  feedbackUrl: 'https://feedback.example.com',
  trialFeedbackUrl: 'https://feedback.example.com/trial',
  requestsUrl: 'https://ideas.example.com',
  networkUrl: 'https://social.example.com',
  authorUrl: 'https://example.com/author',
  licenseUrl: 'https://example.com/license',
  privacyUrl: 'https://example.com/privacy',
  storeUrl: 'https://example.com/store',
  storeManagementUrl: 'https://example.com/store-management',
}
```

Service URLs use environment variables (`.env` file). Public URLs are hardcoded with template placeholders.

### versions

Versioning for data migrations:

```typescript
versions: {
  userConsentVersion: '2025.09',        // User consent schema version
  trialVersion: '2024.03',              // Trial system version
  pluginVersion: __APP_VERSION__,       // From Vite define (package.json version)
  creditsVersion: '2025.12',            // Credits system version
}
```

Used to detect when stored user data needs migration (e.g., consent version changed → re-prompt).

### features

Feature flag array, generated by `doSpecificMode()`:

```typescript
features: doSpecificMode(
  [/* deactivated features */],
  ['MY_FIRST_CONTEXT_SUBCONTEXT_B'],   // Pro features
  ['MY_FIRST_CONTEXT_SUBCONTEXT_C'],   // New features
),
```

See [feature-flags.md](feature-flags.md) for details.

### lang

Default language:

```typescript
lang: 'en-US',
```

### fees

Service-specific fee configuration:

```typescript
fees: {
  myFee: 50,
}
```

## Environment Variables

Config values sourced from `.env`:

| Variable | Used In | Purpose |
|----------|---------|---------|
| `VITE_MIXPANEL_TOKEN` | `index.tsx` | Mixpanel project token |
| `VITE_SENTRY_DSN` | `index.tsx` | Sentry DSN |
| `VITE_SUPABASE_PUBLIC_ANON_KEY` | `index.tsx` | Supabase anonymous key |
| `VITE_SUPABASE_URL` | `global.config.ts` | Supabase database URL |
| `VITE_TOLGEE_URL` | `index.tsx` | Tolgee API URL |
| `VITE_TOLGEE_API_KEY` | `index.tsx` | Tolgee API key |
| `VITE_AUTH_WORKER_URL` | `global.config.ts` | Auth worker endpoint |
| `VITE_ANNOUNCEMENTS_WORKER_URL` | `global.config.ts` | Announcements CMS |
| `VITE_CORS_WORKER_URL` | `global.config.ts` | CORS proxy worker |
| `VITE_AUTH_URL` | `global.config.ts` | Auth redirect URL |
| `VITE_LEMONSQUEEZY_URL` | `global.config.ts` | LemonSqueezy store API |
| `VITE_NOTION_ANNOUNCEMENTS_ID` | `global.config.ts` | Notion DB for announcements |
| `VITE_NOTION_ONBOARDING_ID` | `global.config.ts` | Notion DB for onboarding |
| `VITE_NOTION_API_KEY` | `index.tsx` | Notion API key |

Environment variables prefixed with `VITE_` are exposed to both Canvas and UI builds by Vite.

## Limits Mapping

After config creation, feature limits are mapped from the `limits` section:

```typescript
const limitsMapping: { [key: string]: keyof typeof globalConfig.limits } = {
  // Map feature names to limit keys
  // e.g., 'BATCH_EXPORT': 'pageSize'
}

globalConfig.features.forEach((feature: Feature<'MY_SERVICE'>) => {
  const limitKey = limitsMapping[feature.name]
  if (limitKey && globalConfig.limits[limitKey] !== undefined)
    feature.limit = globalConfig.limits[limitKey]
})
```

This allows features to inherit their usage limits from the centralized `limits` section.

## How Config Flows Through the App

```
/src/global.config.ts
    ↓
    ├── Canvas: import globalConfig (direct)
    │   └── loadUI.ts, bridge functions, src/index.ts
    │
    └── UI: passed to ConfigProvider
        ↓
        <ConfigProvider
          limits={globalConfig.limits}
          env={globalConfig.env}
          information={globalConfig.information}
          plan={globalConfig.plan}
          dbs={globalConfig.dbs}
          urls={globalConfig.urls}
          versions={globalConfig.versions}
          features={globalConfig.features}
          lang={globalConfig.lang}
          fees={globalConfig.fees}
        >
          ↓
          WithConfig HOC → this.props.config
          ↓
          Any class component
```

## Best Practices

### 1. Add New URLs to the urls Section

```typescript
// ✅ Centralize in globalConfig
urls: {
  myNewServiceUrl: import.meta.env.VITE_MY_SERVICE_URL,
}

// ❌ Hardcode URLs in components
const url = 'https://api.example.com/v1'
```

### 2. Use Service Toggle Flags

```typescript
// ✅ Check before initializing
if (globalConfig.env.isMixpanelEnabled && mixpanelToken !== undefined) {
  mixpanel.init(mixpanelToken, { ... })
}

// ❌ Initialize unconditionally
mixpanel.init(mixpanelToken, { ... })
```

### 3. Template Placeholders

The config uses `{{ pluginName }}`, `{{ pluginId }}`, etc. These are replaced by the CLI scaffolding tool at project creation time. In your actual plugin, replace them with real values.

### 4. Version Bumping

When changing stored data schemas (consent, trial, credits), bump the corresponding version string. The app uses these to detect outdated stored data and re-prompt users.

```typescript
// Before: userConsentVersion: '2025.09'
// After:  userConsentVersion: '2025.10'  ← triggers re-consent
```
