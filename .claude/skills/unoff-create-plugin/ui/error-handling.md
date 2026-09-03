---
name: error-handling
description: Error handling patterns for Canvas (try/catch in action map — Figma uses figma.notify, Penpot re-sends to UI) and UI (Promise .catch chains, Sentry dev/prod split, POST_MESSAGE notifications). Use when handling errors in bridge functions, external service calls, or surfacing errors to the user via toast or Sentry.
---

# Error Handling & Monitoring

## Overview

The plugin uses a layered error handling strategy across its three architecture layers. The Canvas side uses try/catch with action maps. The UI side combines Sentry for production monitoring with a dev logger fallback, Promise-based `.catch()` chains for async operations, and user-facing notification messages for recoverable errors.

## When to Use

- Adding error handling to new features
- Integrating with Sentry for production monitoring
- Understanding the notification system for user-facing errors
- Debugging issues across Canvas↔UI boundary

## Error Handling Layers

```
┌─────────────────────────────────────────────┐
│  Canvas Layer (src/index.ts, bridges/)       │
│  try/catch around action maps                │
│  Falls back to DEFAULT action on error       │
├─────────────────────────────────────────────┤
│  UI Layer (src/app/ui/)                      │
│  try/catch around handleMessage action map   │
│  .catch() on all async Promise chains        │
│  POST_MESSAGE for user-facing notifications  │
├─────────────────────────────────────────────┤
│  External Services (src/app/external/)       │
│  Promise reject + console.error              │
│  throw new Error for critical failures       │
├─────────────────────────────────────────────┤
│  Monitoring (Sentry)                         │
│  Production: full Sentry with replay         │
│  Development: dev logger to console          │
└─────────────────────────────────────────────┘
```

## Canvas-Side Error Handling

### loadUI Action Map

In `bridges/loadUI.ts`, the main message handler uses a try/catch around an action map. The catch block always falls back to `DEFAULT` (a no-op) to prevent the plugin sandbox from crashing.

> **Platform note** — The action map structure is identical across platforms, but the Canvas API calls inside each action differ. The examples below show Figma. For Penpot equivalents see [bridge/penpot/communication-pattern.md](../bridge/penpot/communication-pattern.md).

**Figma:**

```typescript
// bridges/loadUI.ts (Figma)
const actions: Record<string, () => void> = {
  SET_ITEMS: () => { /* figma.clientStorage.setAsync() */ },
  GET_ITEMS: () => { /* figma.clientStorage.getAsync() */ },
  POST_MESSAGE: () => {
    figma.notify(path.data.message, { error: path.data.type === 'ERROR' })
  },
  OPEN_IN_BROWSER: () => figma.openExternal(path.data.url),
  DEFAULT: () => null,
}
try {
  return actions[path.type]?.()
} catch {
  return actions['DEFAULT']?.()
}
```

**Penpot** — `figma.notify()` does not exist; surface errors via `POST_MESSAGE` re-sent to the UI. `figma.openExternal()` does not exist; send `OPEN_IN_BROWSER` back to the UI and handle it in the browser.

```typescript
// bridges/loadUI.ts (Penpot)
const actions: Record<string, () => void> = {
  SET_ITEMS: () => { /* penpot.localStorage.setItem() */ },
  POST_MESSAGE: () => {
    penpot.ui.sendMessage({ type: 'POST_MESSAGE', data: path.data })
  },
  OPEN_IN_BROWSER: () => {
    penpot.ui.sendMessage({ type: 'OPEN_IN_BROWSER', data: { url: path.data.url, isNewTab: true } })
  },
  DEFAULT: () => null,
}
try {
  return actions[path.type]?.()
} catch {
  return actions['DEFAULT']?.()
}
```

### Bridge Check Functions

Bridge functions (e.g. `checkUserLicense`, `checkTrialStatus`) follow a pattern where they read from client storage and post messages to the UI. Errors in these functions would be caught by the outer loadUI try/catch.

## UI-Side Error Handling

### handleMessage Action Map

The `App.tsx` component's main message handler wraps the entire action dispatch in try/catch:

```typescript
// App.tsx
handleMessage = (e: CustomEvent<PluginMessageData>) => {
  const path = e.detail

  try {
    const actions: Record<string, () => void | Promise<void>> = {
      SWITCH_SERVICE: () => switchService(),
      SET_THEME: () => setTheme(),
      CHECK_USER_AUTHENTICATION: () => checkUserAuthentication(),
      // ...30+ action handlers
      REPORT_ERROR: () => reportError(),
      DEFAULT: () => null,
    }

    return actions[path.type ?? 'DEFAULT']?.()
  } catch (error) {
    console.error(error)
    return
  }
}
```

**Pattern**: Unknown message types fall to `DEFAULT`. Any exception is caught, logged, and swallowed to keep the UI responsive.

### REPORT_ERROR Action

```typescript
const reportError = () => console.error(path.data)
```

The Canvas side can send `REPORT_ERROR` messages to log errors in the UI console (visible in browser DevTools).

## Async Error Handling

### Promise .catch() Pattern

All external service calls use Promise chains with `.catch()`:

```typescript
// External service call pattern
activateUserLicenseKey({
  corsWorkerUrl: config.urls.corsWorkerUrl,
  storeApiUrl: config.urls.storeApiUrl,
  licenseKey: key,
  instanceName: name,
  platform: config.env.platform,
})
  .then((result) => {
    // Success: update state + notify user
    sendPluginMessage({
      pluginMessage: {
        type: 'POST_MESSAGE',
        data: { type: 'SUCCESS', message: t('success.activated') },
      },
    }, '*')
  })
  .catch((error) => {
    // Error: log + notify user
    console.error(error)
    sendPluginMessage({
      pluginMessage: {
        type: 'POST_MESSAGE',
        data: { type: 'ERROR', message: t('error.generic') },
      },
    }, '*')
  })
```

### External Service Error Patterns

Each external service uses `new Promise((resolve, reject) => ...)` with consistent error handling:

```typescript
// Authentication
const signIn = async ({ ... }) => {
  return new Promise((resolve, reject) => {
    fetch(`${authWorkerUrl}/passkey`)
      .then((response) => {
        if (response.ok) return response.json()
        else return reject(new Error('Failed to fetch passkey'))
      })
      .then((result) => { /* ... */ })
      .catch((error) => {
        console.error(error)
        return reject(error)
      })
  })
}

// License validation
const validateUserLicenseKey = async ({ ... }): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    fetch(/* ... */)
      .then((response) => response.json())
      .then((data) => {
        if (data.valid) return resolve(data.valid)
        if (data.error) throw new Error(data.error)
      })
      .catch((error) => {
        console.error(error)
        return reject(error)
      })
  })
}
```

**Common patterns across all external services:**
1. `fetch()` → `.then(response.json())` → `.then(data)` → `.catch(reject)`
2. API errors checked via `data.error` → `throw new Error(data.error)`
3. All `.catch()` blocks include `console.error(error)`
4. Errors propagated via `reject()` to the caller

### Authentication Timeout

```typescript
// authentication.ts - 2-minute timeout for auth polling
setTimeout(() => {
  if (!isAuthenticated) {
    clearInterval(poll)
    reject(new Error('Authentication timeout'))
  }
}, 2 * 60 * 1000)
```

### Critical Initialization Errors

Some functions throw immediately for missing prerequisites:

```typescript
// checkConnectionStatus.ts
if (!supabase) throw new Error('Supabase client is not initialized')

// tracking/client.ts
if (!mixpanelEnv) throw new Error('Mixpanel environment not set')
if (!editor) throw new Error('Editor not set')
```

## Sentry Integration

### Production Initialization

```typescript
// src/app/index.tsx
if (
  globalConfig.env.isSentryEnabled &&
  !globalConfig.env.isDev &&
  sentryDsn !== undefined
) {
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
      Sentry.feedbackIntegration({
        colorScheme: 'system',
        autoInject: false,
      }),
    ],
    attachStacktrace: true,
    normalizeDepth: 15,
    maxValueLength: 5000,
    maxBreadcrumbs: 150,
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    release: globalConfig.versions.pluginVersion,
  })

  initSentry(Sentry)
}
```

Key configuration:
- **Session replay on error only** (`replaysOnErrorSampleRate: 1.0`, `replaysSessionSampleRate: 0`)
- **Full tracing** (`tracesSampleRate: 1.0`)
- **Feedback widget** — manual trigger, not auto-injected
- **Platform and version tags** for filtering in Sentry dashboard

### Development Logger

```typescript
// When Sentry is disabled (dev mode or missing DSN)
const devLogger = {
  captureException: (error: Error) => {
    console.group('🐛 Dev Error Logger')
    console.error(error)
    console.groupEnd()
  },
  captureMessage: (message: string) => {
    console.group('📝 Dev Message Logger')
    console.info(message)
    console.groupEnd()
  },
}

;(window as any).Sentry = devLogger
```

In development, a lightweight logger replaces Sentry. Same API surface but outputs to browser console with visual grouping.

### Sentry Singleton Pattern

```typescript
// external/monitoring/index.ts
let sentryInstance: any | null = null

export const initSentry = (instance: any) => {
  sentryInstance = instance
  return sentryInstance
}

export const getSentry = () => {
  return sentryInstance
}
```

Components access Sentry through `getSentry()`. Example from the Report modal:

```typescript
// Report.tsx
getSentry()
  .sendFeedback({
    name: this.state.userFullName,
    email: this.state.userEmail,
    message: this.state.userMessage,
    url: this.props.config.urls.platformUrl,
    tags: { platform: this.props.config.env.platform },
  }, { includeReplay: true })
  .then(() => { /* success notification */ })
  .catch((error) => {
    console.error(error)
    // error notification
  })
```

## User-Facing Notifications

### NotificationMessage Type

```typescript
// types/messages.ts
export interface NotificationMessage {
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
  message: string
  timer?: number
}
```

### POST_MESSAGE Flow

UI components send notification messages to the user via:

```typescript
sendPluginMessage({
  pluginMessage: {
    type: 'POST_MESSAGE',
    data: {
      type: 'SUCCESS',  // or 'ERROR', 'WARNING', 'INFO'
      message: this.props.t('success.report'),
    },
  },
}, '*')
```

This triggers the Canvas-side `POST_MESSAGE` handler which calls `figma.notify()`, or in UI-side renders via the `NotificationBanner` toast component.

### Notification Severity Levels

| Type | Usage | Example |
|---|---|---|
| `SUCCESS` | Operation completed | License activated, report sent |
| `ERROR` | Operation failed | API call failed, validation error |
| `WARNING` | Degraded state | Trial expiring, credits low |
| `INFO` | Informational | Status updates |

## Error Handling Patterns Summary

### Pattern 1: Action Map + try/catch

Used in both Canvas (`loadUI.ts`) and UI (`App.tsx`) for message handling:

```typescript
const actions = { ACTION_A: () => ..., DEFAULT: () => null }
try {
  return actions[path.type ?? 'DEFAULT']?.()
} catch (error) {
  console.error(error)
  return actions['DEFAULT']?.()
}
```

### Pattern 2: Promise chain + user notification

Used in all external service interactions:

```typescript
someAsyncFunction(params)
  .then((result) => {
    // Update state
    // Send SUCCESS notification
  })
  .catch((error) => {
    console.error(error)
    // Send ERROR notification
  })
```

### Pattern 3: Guard + throw

Used at service boundaries for missing prerequisites:

```typescript
if (!supabase) throw new Error('Supabase client is not initialized')
```

### Pattern 4: Conditional service init

Services are only initialized when enabled:

```typescript
if (globalConfig.env.isSentryEnabled && !globalConfig.env.isDev && sentryDsn !== undefined) {
  Sentry.init({ ... })
} else {
  // Dev logger fallback
}
```

## Best Practices

✅ Always catch errors in async chains — don't leave unhandled Promise rejections  
✅ Use `POST_MESSAGE` to notify users of errors with translated messages  
✅ Log errors with `console.error()` for debugging even when showing user notifications  
✅ Use the dev logger pattern in development — it mirrors the Sentry API  
✅ Guard service initialization with config flags before using service instances  
✅ Use the `DEFAULT` fallback in action maps for unknown message types  

## What to Avoid

❌ Don't throw from Canvas-side handlers — the plugin sandbox will crash  
❌ Don't show raw error messages to users — use `t('error.generic')` or specific translation keys  
❌ Don't call `getSentry()` without checking if the instance exists  
❌ Don't catch errors silently without at least `console.error()`  
❌ Don't use Sentry in dev mode — use the dev logger pattern instead  
