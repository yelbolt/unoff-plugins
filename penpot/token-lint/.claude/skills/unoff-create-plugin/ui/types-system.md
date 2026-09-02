---
name: types-system
description: TypeScript type definitions across the plugin (app, config, events, messages, translations, user). Use when adding new types, extending BaseProps, defining union types for state machines, or adding new contexts, modals, events, or languages.
---

# Types System

## Overview

The plugin uses a centralized type system in `src/app/types/` with strict TypeScript. Types are organized by domain — application state, configuration, events, messages, users, and translations — providing full type safety across all three layers (Canvas, Bridge, UI).

## When to Use

- Defining props for new components
- Adding new message types for Canvas↔UI communication
- Extending application state
- Creating new event tracking functions
- Adding contexts, plans, or editor support

## Type Files Overview

```
src/app/types/
├── app.ts          # Core application types (contexts, plans, editors, modals)
├── config.ts       # Config interface (used by globalConfig + ConfigContext)
├── events.ts       # Event payloads for analytics tracking
├── messages.ts     # Message types for Canvas↔UI communication
├── translations.ts # Translation key types and language definitions
└── user.ts         # User session and identity types
```

## Core Types

### app.ts — Application Domain

The central file defining the plugin's domain model.

#### Platform & Service

```typescript
export type Platform = 'figma' | 'penpot' | 'sketch' | 'framer'
export type Service = 'MY_SERVICE'
```

- `Platform` — Multi-platform support (currently only `figma` template active)
- `Service` — Plugin's service identifier used for feature flags and tracking

#### BaseProps

```typescript
export interface BaseProps {
  service: Service
  userSession: UserSession
  userIdentity: UserIdentity
  userConsent: Array<ConsentConfiguration>
  plans: Plans
  planStatus: PlanStatus
  trialStatus: TrialStatus
  trialRemainingTime: number
  creditsCount: number
  creditsRenewalDate: number
  editor: Editor
  documentWidth: number
}
```

**This is the most important interface.** Every context/subcontext component receives `BaseProps` via spread:

```tsx
<MyFirstContext {...this.state} />
```

The `App` component's state satisfies `BaseProps` and is passed down to all children.

#### Context

```typescript
export type Context =
  | 'MY_FIRST_CONTEXT'
  | 'MY_SECOND_CONTEXT'
  | 'MY_THIRD_CONTEXT'
  | 'MY_FIRST_CONTEXT_SUBCONTEXT_A'
  | 'MY_FIRST_CONTEXT_SUBCONTEXT_B'
  | 'MY_FIRST_CONTEXT_SUBCONTEXT_C'
```

Each value maps to a tab in the plugin UI. Used in `setContexts()` to build the context list and in `FeatureStatus` for permission checks.

#### ContextItem

```typescript
export interface ContextItem {
  label: string
  id: Context
  isUpdated: boolean
  isNew?: boolean
  isActive: boolean
}
```

Returned by `setContexts()`. Drives tab rendering — `isActive` is computed from `FeatureStatus`, `isNew` marks newly released tabs.

#### Plan & Trial Types

```typescript
export type PlanStatus = 'UNPAID' | 'PAID' | 'NOT_SUPPORTED'
export type TrialStatus = 'UNUSED' | 'PENDING' | 'EXPIRED' | 'SUSPENDED'
export type Plans = Array<'PLAN_A' | 'PLAN_B' | 'ACTIVATE'>
```

- `PlanStatus` — Controls feature-gate checks in `FeatureStatus`
- `TrialStatus` — Tracks trial lifecycle
- `Plans` — Available plans for pricing UI

#### Editor

```typescript
export type Editor =
  | 'figma'
  | 'figjam'
  | 'dev'
  | 'dev_vscode'
  | 'buzz'
  | 'penpot'
  | 'sketch'
  | 'framer'
```

On **Figma**: detected from `figma.editorType` on the Canvas side. On **Penpot**: no `editorType` — the value is always `'penpot'`, set directly in `globalConfig.env.editor`. `availabilityForEditors` checks should use only `'penpot'` for Penpot plugins; FigJam/Dev Mode values are Figma-only.

#### Modal & Announcement Types

```typescript
export type ModalContext =
  | 'EMPTY'
  | 'NOTIFICATION'
  | 'PREFERENCES'
  | 'LICENSE'
  | 'ANNOUNCEMENTS'
  | 'ONBOARDING'
  | 'REPORT'
  | 'CHAT'
  | 'FEEDBACK'
  | 'ABOUT'
  | 'TRY'
  | 'PRICING'
  | 'WELCOME_TO_PRO'
  | 'WELCOME_TO_TRIAL'

export type AnnouncementsStatus =
  | 'NO_ANNOUNCEMENTS'
  | 'DISPLAY_ANNOUNCEMENTS_NOTIFICATION'
  | 'DISPLAY_ANNOUNCEMENTS_DIALOG'

export type OnboardingStatus = 'NO_ONBOARDING' | 'DISPLAY_ONBOARDING_DIALOG'

export interface AnnouncementsDigest {
  version: string
  status: AnnouncementsStatus
}
```

`ModalContext` drives which modal component is rendered via `createPortal`.

### config.ts — Configuration Interface

```typescript
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
    colorMode: string  // e.g. 'figma-light' | 'figma-dark'
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
  dbs: { dbViewName: string }
  urls: { /* 20+ URL fields */ }
  versions: {
    readonly userConsentVersion: string
    readonly trialVersion: string
    readonly pluginVersion: string
    readonly creditsVersion: string
  }
  features: Array<Feature<'MY_SERVICE'>>
  lang: Language
  fees: { myFee: number }
}
```

Full definition in `src/global.config.ts`. Documented in detail at [config/global-config.md](../config/global-config.md).

### events.ts — Analytics Event Payloads

```typescript
export interface TrialEvent {
  date: number
  trialTime: number
}

export interface TourEvent {
  feature: 'NEXT_STEP' | 'LEARN_MORE' | 'END_TOUR'
}

export interface PricingEvent {
  feature: 'VIEW_PRICING' | 'GO_TO_CHECKOUT' | 'GO_TO_PLAN_A' | 'GO_TO_PLAN_B'
}

export interface LanguageEvent {
  lang: Language
}
```

Used exclusively by `eventsTracker.ts` functions. Each tracking function receives the relevant event interface.

### messages.ts — Canvas↔UI Message Types

```typescript
export interface NotificationMessage {
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
  message: string
  timer?: number
}

export interface PluginMessageData {
  type: string
  data: any
}
```

- `NotificationMessage` — Used by toast/notification banners and the `POST_MESSAGE` action
- `PluginMessageData` — The generic shape of all `platformMessage` event details

### translations.ts — Type-Safe Translation Keys

```typescript
import enUS from '../content/translations/en-US.json'

type RecursiveKeyOf<TObj extends object> = {
  [TKey in keyof TObj & string]: TObj[TKey] extends object
    ? `${TKey}` | `${TKey}.${RecursiveKeyOf<TObj[TKey]>}`
    : `${TKey}`
}[keyof TObj & string]

export type TranslationKeys = RecursiveKeyOf<typeof enUS>
export type Translations = typeof enUS
export type Language = 'en-US' | 'fr-FR' | 'pt-BR' | 'zh-Hans-CN'
```

- `RecursiveKeyOf` — Advanced mapped type that generates a union of all dot-paths from the JSON structure
- `TranslationKeys` — Provides autocomplete for `t('key.subkey')` calls
- `Language` — Supported language codes

### user.ts — User Types

```typescript
export type ConnectionStatus = 'CONNECTED' | 'UNCONNECTED'

export interface UserSession {
  connectionStatus: ConnectionStatus
  id: string
  fullName: string
  avatar: string
}

export interface UserIdentity {
  id: string
  fullName: string
  avatar: string
}
```

- `UserSession` — Authenticated user (Supabase), includes `connectionStatus`
- `UserIdentity` — platform user identity, always available (Figma: `figma.currentUser?.name / photoUrl` — Penpot: `penpot.currentUser.name / avatarUrl`)

## Type Patterns

### 1. Union Types for State Machines

The codebase uses string literal unions as lightweight state machines:

```typescript
// Plan lifecycle
type PlanStatus = 'UNPAID' | 'PAID' | 'NOT_SUPPORTED'

// Trial lifecycle  
type TrialStatus = 'UNUSED' | 'PENDING' | 'EXPIRED' | 'SUSPENDED'

// Modal state
type ModalContext = 'EMPTY' | 'NOTIFICATION' | 'PREFERENCES' | ...
```

Pattern: Use a union type → match in a switch/action map → render accordingly.

### 2. Generic Feature Type

```typescript
// From @unoff/utils
type Feature<S extends string> = {
  name: string
  description: string
  isActive: boolean
  isNew: boolean
  type: 'SERVICE' | 'CONTEXT' | 'DIVISION' | 'ACTION'
  service: Array<S>
  editor: Array<string>
  // ...
}

// In config:
features: Array<Feature<'MY_SERVICE'>>
```

The generic parameter `<'MY_SERVICE'>` constrains the service field to the plugin's service identifier.

### 3. Readonly Fields

Configuration fields that must not change at runtime use `readonly`:

```typescript
env: {
  readonly pluginId: string
}
information: {
  readonly pluginName: string
  readonly authorName: string
}
versions: {
  readonly pluginVersion: string
}
```

### 4. Interface Extension for Component Props

```typescript
// Component combines BaseProps with HOC props
interface MyComponentProps extends BaseProps, WithConfigProps, WithTranslationProps {
  onClose: () => void
}
```

### 5. Named Object Parameters

External service functions use named object parameters:

```typescript
const activateUserLicenseKey = async ({
  corsWorkerUrl,
  storeApiUrl,
  licenseKey,
  instanceName,
  platform,
}: {
  corsWorkerUrl: string
  storeApiUrl: string
  licenseKey: string
  instanceName: string
  platform: Platform
}): Promise<{...}> => { ... }
```

## Adding New Types

### Adding a New Context

1. Add to the `Context` union in `app.ts`:
   ```typescript
   export type Context = ... | 'MY_NEW_CONTEXT'
   ```
2. Add to `setContexts()` in `utils/setContexts.ts`
3. Add the feature entry in `stores/features.ts` (`featuresScheme`)
4. Create the component in `ui/contexts/`

### Adding a New Modal

1. Add to the `ModalContext` union in `app.ts`:
   ```typescript
   export type ModalContext = ... | 'MY_NEW_MODAL'
   ```
2. Handle in the `App.tsx` portal rendering
3. Create the modal component in `ui/modules/modals/`

### Adding a New Event

1. Define the event interface in `events.ts`:
   ```typescript
   export interface MyNewEvent {
     feature: 'OPTION_A' | 'OPTION_B'
   }
   ```
2. Create the tracking function in `eventsTracker.ts`
3. Call it from the relevant UI component

### Adding a New Language

1. Add the code to the `Language` union in `translations.ts`:
   ```typescript
   export type Language = ... | 'ja-JP'
   ```
2. Create `content/translations/ja-JP.json`
3. Import and register in `src/app/index.tsx` (static data) and `src/index.ts` (Canvas i18n)

## Best Practices

✅ Always extend `BaseProps` for context/subcontext components  
✅ Use `readonly` for configuration fields that should not mutate  
✅ Use string literal unions for finite state values  
✅ Use named object parameters for functions with 3+ arguments  
✅ Add new types to existing domain files, not new files  
✅ Use `RecursiveKeyOf` pattern for nested JSON key types  

## What to Avoid

❌ Don't use `any` — use proper types (the eslint rule warns but doesn't block)  
❌ Don't create new type files without a clear domain — add to existing files first  
❌ Don't duplicate types across files — import from the canonical source  
❌ Don't use `enum` — the codebase uses string literal unions exclusively  
❌ Don't make configuration fields mutable that should be `readonly`  
