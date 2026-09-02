---
name: app-bootstrap
description: Full startup sequence for Canvas (i18n, loadUI) and UI (Mixpanel → Sentry → Supabase → Tolgee → Bridge → Render) sides. Canvas init differs per platform (Figma vs Penpot). UI init is shared. Use when modifying initialization order, adding a new service to the startup chain, or debugging startup failures.
---

# App Bootstrap & Initialization

## Overview

The plugin has two independent initialization sequences:

1. **Canvas side** (`/src/index.ts`) — Runs in the plugin sandbox (no DOM). **Platform-specific.**
2. **UI side** (`/src/app/index.tsx`) — Runs in the iframe (DOM, React, external services). **Shared across platforms.**

Both sides communicate through the **platformMessage** bridge established during UI initialization.

---

## Canvas Side Initialization — Figma

**Entry point**: `/src/index.ts`

```typescript
// 1. Pre-load fonts (async, non-blocking — needed before any text node creation)
figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
figma.loadFontAsync({ family: 'Inter', style: 'Medium' })
figma.loadFontAsync({ family: 'Martian Mono', style: 'Medium' })
figma.loadFontAsync({ family: 'Lexend', style: 'Medium' })

// 2. Plugin run handler — all logic lives inside
figma.on('run', async () => {
  tolgee = createI18n({ 'fr-FR': fr_FR, 'en-US': en_US }, globalConfig.lang)
  figma.on('selectionchange', async () => await checkTrialStatus())
  loadUI()
})
```

### Figma Initialization Sequence

```
figma.loadFontAsync() × 4 (non-blocking)
    ↓
figma.on('run')
    ├── createI18n()
    ├── figma.on('selectionchange') → checkTrialStatus()
    └── loadUI()
         ├── figma.clientStorage.getAsync('plugin_window_width/height')
         ├── figma.showUI(__html__, { width, height, title, themeColors: true })
         └── figma.ui.onmessage = async (msg) => { ... }
```

### Figma loadUI() highlights

```typescript
// Restore saved window size
const width = (await figma.clientStorage.getAsync('plugin_window_width')) ?? globalConfig.limits.width
figma.showUI(__html__, { width, height, title: '{{ pluginName }}', themeColors: true })

figma.ui.onmessage = async (msg) => {
  const path = msg  // message is the payload directly
  // ...action map
}
```

Key Figma-specific actions in the map:
- `RESIZE_UI` → `figma.clientStorage.setAsync(...)` + `figma.ui.resize(w, h)`
- `OPEN_IN_BROWSER` → `figma.openExternal(url)`
- `UPDATE_LANGUAGE` → `figma.clientStorage.setAsync('user_language', lang)`
- `LOAD_DATA` → reads tokens from `figma.clientStorage.getAsync()`, sends user `photoUrl`

Full loadUI reference: [bridge/figma/communication-pattern.md](../bridge/figma/communication-pattern.md) and [bridge/figma/bridge-functions.md](../bridge/figma/bridge-functions.md).

---

## Canvas Side Initialization — Penpot

**Entry point**: `/src/index.ts`

```typescript
// No font loading needed — Penpot handles fonts natively
// No 'run' event — code executes directly at module load

export const tolgee = createI18n({ 'fr-FR': fr_FR, 'en-US': en_US }, globalConfig.lang)
loadUI()
```

### Penpot Initialization Sequence

```
createI18n() (synchronous, no run handler)
    ↓
loadUI()
    ├── penpot.ui.open(title, globalConfig.urls.uiUrl, { width, height })
    ├── penpot.ui.onMessage(async (msg) => { ... })
    └── penpot.on('themechange', () => penpot.ui.sendMessage({ type: 'SET_THEME', ... }))
```

### Penpot loadUI() highlights

```typescript
// Size always from globalConfig — no persistence, no resize support
penpot.ui.open(tolgee.t('fullName', { instance: '...' }), globalConfig.urls.uiUrl, {
  width: globalConfig.limits.width,
  height: globalConfig.limits.height,
})

penpot.ui.onMessage(async (msg: any) => {
  const path = msg.pluginMessage  // ← always unwrap .pluginMessage (differs from Figma)
  // ...action map
}
```

Key Penpot differences in the action map vs Figma:
- No `RESIZE_UI` (not supported)
- `OPEN_IN_BROWSER` → re-sent to UI via `penpot.ui.sendMessage` (no native openExternal)
- `UPDATE_LANGUAGE` → `penpot.localStorage.setItem('user_language', lang)` (sync)
- `LOAD_DATA` → reads tokens from `penpot.localStorage.getItem()`, sends user `avatarUrl` (not `photoUrl`)
- `SET_THEME` sent immediately in LOAD_DATA using `penpot.theme`

Full loadUI reference: [bridge/penpot/communication-pattern.md](../bridge/penpot/communication-pattern.md) and [bridge/penpot/bridge-functions.md](../bridge/penpot/bridge-functions.md).

---

## LOAD_DATA Check Chain (both platforms)

The message types and check function names are identical. The storage calls inside each check differ per platform.

```
LOAD_DATA received
    ├── POST: CHECK_USER_AUTHENTICATION (id, name, avatar, tokens)
    ├── POST: CHECK_ANNOUNCEMENTS_VERSION
    ├── POST: CHECK_EDITOR (Figma) / SET_THEME + CHECK_EDITOR (Penpot)
    └── Sequential chain:
        checkUserConsent()
            → checkTrialStatus()
                → checkCredits()
                    → checkUserLicense()
                        → checkUserPreferences()
                            → setState({ isLoaded: true })
```

## UI Side Initialization

**Entry point**: `/src/app/index.tsx`

```typescript
import { createRoot } from 'react-dom/client'
import mixpanel from 'mixpanel-figma'
import { TolgeeProvider } from '@tolgee/react'
import * as Sentry from '@sentry/react'
import globalConfig from '../global.config'
import App from './ui/App'
import { initTolgee } from './external/translation'
import { initMixpanel, setEditor, setMixpanelEnv } from './external/tracking/client'
import { initSentry } from './external/monitoring'
import { initSupabase } from './external/auth'
import { ThemeProvider } from './config/ThemeContext'
import { ConfigProvider } from './config/ConfigContext'

const container = document.getElementById('app')
const root = createRoot(container)
```

### UI Initialization Sequence

```
1. Mixpanel Init (if enabled)
    ↓
2. Sentry Init (if enabled, not dev)
    ↓
3. Supabase Init (if enabled)
    ↓
4. Tolgee Init (always)
    ↓
5. Bridge Setup
    ↓
6. Render
```

### Step 1: Mixpanel

```typescript
if (globalConfig.env.isMixpanelEnabled && mixpanelToken !== undefined) {
  mixpanel.init(mixpanelToken, {
    api_host: 'https://api-eu.mixpanel.com',  // EU data residency
    debug: globalConfig.env.isDev,
    disable_persistence: true,                  // No localStorage
    disable_cookie: true,                       // Cookie-less tracking
    opt_out_tracking_by_default: true,          // Requires opt-in
  })
  mixpanel.opt_in_tracking()
  setMixpanelEnv(import.meta.env.MODE)
  initMixpanel(mixpanel)
  setEditor(globalConfig.env.editor)
}
```

### Step 2: Sentry

```typescript
if (globalConfig.env.isSentryEnabled && !globalConfig.env.isDev && sentryDsn !== undefined) {
  Sentry.init({
    dsn: sentryDsn,
    environment: 'production',
    initialScope: {
      tags: {
        platform: globalConfig.env.platform,
        version: globalConfig.versions.pluginVersion,
      },
    },
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
      Sentry.feedbackIntegration({ colorScheme: 'system', autoInject: false }),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    release: globalConfig.versions.pluginVersion,
  })
  initSentry(Sentry)
} else {
  // Dev logger fallback
  (window as any).Sentry = {
    captureException: (error: Error) => console.error(error),
    captureMessage: (message: string) => console.info(message),
  }
}
```

### Step 3: Supabase

```typescript
if (globalConfig.env.isSupabaseEnabled && supabaseAnonKey !== undefined)
  initSupabase(globalConfig.urls.databaseUrl, supabaseAnonKey)
```

### Step 4: Tolgee

```typescript
const tolgee = initTolgee(tolgeeUrl, tolgeeApiKey, globalConfig.lang, {
  'en-US': en_US,
  'fr-FR': fr_FR,
})
```

### Step 5: Bridge Setup (platformMessage)

This is the critical bridge that connects Canvas messages to the UI:

```typescript
// Canvas → UI: Convert raw postMessage to CustomEvent
window.addEventListener(
  'message',
  (event: MessageEvent) => {
    const pluginEvent = new CustomEvent('platformMessage', {
      detail: event.data.pluginMessage,
    })
    window.dispatchEvent(pluginEvent)
  },
  false
)

// UI → Canvas: Convert CustomEvent to parent.postMessage
window.addEventListener('pluginMessage', ((event: MessageEvent) => {
  if (event instanceof CustomEvent && window.parent !== window) {
    const { message, targetOrigin } = event.detail
    parent.postMessage(message, targetOrigin)
  }
}) as EventListener)
```

This creates a bidirectional bridge:
- **Inbound** (Canvas → UI): `figma.ui.postMessage(data)` → `window 'message'` → `CustomEvent('platformMessage')` → `App.handleMessage()`
- **Outbound** (UI → Canvas): `sendPluginMessage(data)` → `CustomEvent('pluginMessage')` → `parent.postMessage(data)` → `figma.ui.onmessage`

### Step 6: Render

```typescript
tolgee?.run().then(() => {
  root.render(
    <TolgeeProvider tolgee={tolgee} fallback="Loading...">
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
        <ThemeProvider
          theme={globalConfig.env.ui}
          mode={globalConfig.env.colorMode}
        >
          <App />
        </ThemeProvider>
      </ConfigProvider>
    </TolgeeProvider>
  )
})
```

Provider nesting order (outermost → innermost):
1. **TolgeeProvider** — Translation context
2. **ConfigProvider** — Global config context
3. **ThemeProvider** — Theme/mode context
4. **App** — Root component

## App.tsx componentDidMount

After render, `App.tsx`'s `componentDidMount` triggers the data loading:

```typescript
componentDidMount = () => {
  // Subscribe to nanostores
  this.subsscribeSuggestedLanguage = $isSuggestedLanguageDisplayed.subscribe(...)
  this.subscribeUserConsent = $userConsent.subscribe(...)
  this.subscribeCreditCount = $creditsCount.subscribe(...)

  // Set initial consent state
  this.setState({ userConsent: $userConsent.get() })

  // Setup Supabase auth state listener
  if (getSupabase() !== null && this.props.config.env.isSupabaseEnabled)
    getSupabase()?.auth.onAuthStateChange(...)

  // Listen for Canvas messages
  window.addEventListener('platformMessage', this.handleMessage as EventListener)
  window.addEventListener('resize', this.handleResize)
}
```

The UI then sends `LOAD_DATA` to the Canvas (triggered by the first platformMessage or explicitly), which starts the LOAD_DATA check chain. As each check completes, the Canvas posts messages back, and `handleMessage` updates state, eventually setting `isLoaded: true` and rendering the full UI.

## Full Startup Sequence Diagram

```
┌─────── Canvas ──────────┐    ┌──────── UI ────────────────┐
│                         │    │                             │
│ loadFontAsync() ×4      │    │                             │
│ figma.on('run')         │    │                             │
│   createI18n()          │    │                             │
│   loadUI()              │    │                             │
│     figma.showUI()  ────┼───►│ iframe loads                │
│     onmessage setup     │    │ Mixpanel.init()             │
│                         │    │ Sentry.init()               │
│                         │    │ Supabase.init()             │
│                         │    │ Tolgee.init()               │
│                         │    │ Bridge setup                │
│                         │    │ tolgee.run().then(render())  │
│                         │    │ App.componentDidMount()     │
│                         │    │   subscribe nanostores      │
│                         │    │   auth state listener       │
│                         │    │   addEventListener(platform)│
│                  ◄──────┼────│   LOAD_DATA ───────────►    │
│ LOAD_DATA handler       │    │                             │
│   POST: AUTH_DATA  ─────┼───►│ handleMessage(AUTH_DATA)    │
│   POST: ANNOUNCEMENTS ──┼───►│ handleMessage(ANNOUNCE.)   │
│   checkUserConsent() ───┼───►│ handleMessage(CONSENT)     │
│   checkEditor() ────────┼───►│ handleMessage(EDITOR)      │
│   checkTrialStatus() ───┼───►│ handleMessage(TRIAL)       │
│   checkCredits() ───────┼───►│ handleMessage(CREDITS)     │
│   checkUserLicense() ───┼───►│ handleMessage(LICENSE)     │
│   checkUserPreferences()┼───►│ handleMessage(PREFS)       │
│                         │    │   setState({isLoaded: true})│
│                         │    │   Full UI renders           │
└─────────────────────────┘    └─────────────────────────────┘
```

## HTML Structure

**File**: `/index.html`

```html
<div id="app"></div>    <!-- Main app root (Preact renders here) -->
<div id="modal"></div>   <!-- Portal target for modals -->
<div id="toast"></div>   <!-- Portal target for notifications -->
```

## Vite Build Configuration

See [core.md](../core.md) for the dual-build stack fact (IIFE Canvas bundle + single-file UI HTML). One nuance specific to bootstrap ordering: both builds share `globalConfig` but run in completely separate JavaScript contexts — nothing at runtime bridges them except the message contract.

## Best Practices

### 1. Guard External Service Init

```typescript
// ✅ Check enabled flag AND env variable existence
if (globalConfig.env.isMixpanelEnabled && mixpanelToken !== undefined) {
  mixpanel.init(mixpanelToken, { ... })
}

// ❌ Init without checking
mixpanel.init(mixpanelToken, { ... })  // Crashes if token undefined
```

### 2. Sequential Check Chain Ordering

The LOAD_DATA checks must be sequential because later checks depend on earlier ones:
- `checkEditor()` sets the editor, which affects feature availability
- `checkTrialStatus()` depends on subscription state
- `checkUserPreferences()` must come last (triggers `isLoaded: true`)

### 3. Always Clean Up in componentWillUnmount

```typescript
componentWillUnmount = () => {
  if (this.subsscribeSuggestedLanguage) this.subsscribeSuggestedLanguage()
  if (this.subscribeUserConsent) this.subscribeUserConsent()
  if (this.subscribeCreditCount) this.subscribeCreditCount()
  window.removeEventListener('platformMessage', this.handleMessage as EventListener)
  window.removeEventListener('resize', this.handleResize)
}
```

### 4. Loading State

The app shows a spinner until `isLoaded` is `true`. This only happens after `checkUserPreferences()` completes (with a 2-second delay):

```typescript
const checkUserPreferences = () => {
  setTimeout(() => this.setState({ isLoaded: true }), 2000)
  // ...
}
```

Don't render data-dependent UI before `isLoaded` is `true`.
