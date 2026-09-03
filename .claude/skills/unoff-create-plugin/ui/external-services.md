---
name: external-services
description: Integration patterns for Supabase (auth), Sentry (error monitoring with replay), Mixpanel (analytics, EU cookie-less), Tolgee (i18n), and Notion CMS (announcements, onboarding via Cloudflare Worker). Use when integrating, configuring, or initializing external services in the plugin.
---

# External Services Integration

## Overview

The plugin integrates with multiple external services for authentication, analytics, monitoring, content management, and license validation.

**Service Directory**: `/src/app/external/`

## Service Categories

```
/src/app/external/
  auth/              # Authentication (Supabase)
  cms/               # Content Management (Notion via announcements worker)
  license/           # License validation
  monitoring/        # Error tracking (Sentry)
  tracking/          # Analytics (Mixpanel)
  translation/       # i18n services
```

## Architecture Principles

1. **Initialize Once**: Services are initialized at app startup
2. **Centralized Configuration**: Use environment variables
3. **Error Handling**: Always handle failures gracefully
4. **Type Safety**: Strong TypeScript types for all services

## Authentication (Supabase)

### Setup

```typescript
// /src/app/external/auth/index.ts

import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLIC_ANON_KEY
)
```

### Environment Variables

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLIC_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Authentication Functions

```typescript
// /src/app/external/auth/authentication.ts

import { supabase } from './index'

export interface AuthResponse {
  success: boolean
  user?: any
  error?: string
}

/**
 * Sign in with email and password
 */
export const signIn = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true, user: data.user }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Sign up with email and password
 */
export const signUp = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true, user: data.user }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Sign out current user
 */
export const signOut = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.signOut()
    return !error
  } catch (error) {
    console.error('Sign out failed:', error)
    return false
  }
}

/**
 * Get current session
 */
export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/**
 * Listen to auth state changes
 */
export const onAuthStateChange = (callback: (session: any) => void) => {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
}
```

### Check Connection Status

```typescript
// /src/app/external/auth/checkConnectionStatus.ts

import { supabase } from './index'

/**
 * Check if user is authenticated
 */
export const checkConnectionStatus = async (): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return !!session
  } catch (error) {
    console.error('Connection check failed:', error)
    return false
  }
}

/**
 * Get current user
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error('Get user failed:', error)
    return null
  }
}
```

### Usage in Components

```typescript
import { signIn, signOut, checkConnectionStatus } from '../external/auth'

class LoginComponent extends React.Component {
  async handleLogin() {
    const result = await signIn(this.state.email, this.state.password)
    
    if (result.success) {
      console.log('Logged in:', result.user)
      this.props.onLoginSuccess?.(result.user)
    } else {
      this.setState({ error: result.error })
    }
  }
  
  async componentDidMount() {
    const isConnected = await checkConnectionStatus()
    this.setState({ isAuthenticated: isConnected })
  }
}
```

## Monitoring (Sentry)

### Setup

```typescript
// /src/app/external/monitoring/index.ts

import * as Sentry from '@sentry/browser'

export const initSentry = () => {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 1.0,
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay()
    ]
  })
}

// Call at app startup
// In /src/app/index.tsx
initSentry()
```

### Environment Variables

```env
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

### Capturing Errors

```typescript
import * as Sentry from '@sentry/browser'

// Capture exception
try {
  // Risky operation
  await processData()
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      section: 'data-processing',
      feature: 'export'
    },
    extra: {
      userId: this.props.userId,
      data: inputData
    }
  })
}

// Capture message
Sentry.captureMessage('Something went wrong', 'warning')

// Set user context
Sentry.setUser({
  id: userId,
  email: userEmail
})

// Add breadcrumb
Sentry.addBreadcrumb({
  category: 'ui',
  message: 'User clicked export button',
  level: 'info'
})
```

### Error Boundary

```typescript
import React from 'react'
import * as Sentry from '@sentry/browser'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true }
  }
  
  componentDidCatch(error, errorInfo) {
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack
        }
      }
    })
  }
  
  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please refresh.</div>
    }
    
    return this.props.children
  }
}

// Usage
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

## Analytics (Mixpanel)

### Setup

```typescript
// /src/app/external/tracking/client.ts

import mixpanel from 'mixpanel-browser'

export const initMixpanel = () => {
  mixpanel.init(import.meta.env.VITE_MIXPANEL_TOKEN, {
    debug: import.meta.env.DEV,
    track_pageview: true,
    persistence: 'localStorage'
  })
}

// Call at app startup
initMixpanel()
```

### Environment Variables

```env
VITE_MIXPANEL_TOKEN=xxxxx
```

### Event Tracking

```typescript
// /src/app/external/tracking/eventsTracker.ts

import mixpanel from 'mixpanel-browser'

/**
 * Track custom event
 */
export const trackEvent = (
  eventName: string,
  properties?: { [key: string]: any }
) => {
  mixpanel.track(eventName, properties)
}

/**
 * Identify user
 */
export const identifyUser = (
  userId: string,
  properties?: { [key: string]: any }
) => {
  mixpanel.identify(userId)
  
  if (properties) {
    mixpanel.people.set(properties)
  }
}

/**
 * Set user properties
 */
export const setUserProperties = (properties: { [key: string]: any }) => {
  mixpanel.people.set(properties)
}

/**
 * Track page view
 */
export const trackPageView = (pageName: string) => {
  mixpanel.track_pageview({
    page: pageName
  })
}

/**
 * Time an event (start)
 */
export const startTimedEvent = (eventName: string) => {
  mixpanel.time_event(eventName)
}

/**
 * Track conversion
 */
export const trackConversion = (
  conversionName: string,
  value?: number
) => {
  mixpanel.track(conversionName, {
    value: value || 0,
    timestamp: Date.now()
  })
}
```

### Usage in Components

```typescript
import { trackEvent, identifyUser, startTimedEvent } from '../external/tracking/eventsTracker'

class ExportComponent extends React.Component {
  handleExport = async () => {
    // Start timing
    startTimedEvent('export_completed')
    
    // Track click
    trackEvent('export_clicked', {
      format: this.state.format,
      nodeCount: this.state.selectedNodes.length
    })
    
    try {
      await exportNodes()
      
      // Track success (with time automatically calculated)
      trackEvent('export_completed', {
        success: true,
        format: this.state.format
      })
    } catch (error) {
      trackEvent('export_failed', {
        error: error.message,
        format: this.state.format
      })
    }
  }
  
  componentDidMount() {
    // Identify user
    if (this.props.userId) {
      identifyUser(this.props.userId, {
        email: this.props.userEmail,
        plan: this.props.planStatus.tier
      })
    }
  }
}
```

## License Validation

### Activate License

```typescript
// /src/app/external/license/activateUserLicenseKey.ts

import { supabase } from '../auth'

export interface LicenseActivationResult {
  success: boolean
  license?: {
    key: string
    tier: 'pro' | 'enterprise'
    expiresAt?: number
    features: string[]
  }
  error?: string
}

/**
 * Activate a license key
 */
export const activateUserLicenseKey = async (
  licenseKey: string,
  userId: string
): Promise<LicenseActivationResult> => {
  try {
    // Validate with backend
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('key', licenseKey)
      .eq('is_active', true)
      .single()
    
    if (error || !data) {
      return {
        success: false,
        error: 'Invalid license key'
      }
    }
    
    // Check if already assigned
    if (data.user_id && data.user_id !== userId) {
      return {
        success: false,
        error: 'License key already in use'
      }
    }
    
    // Assign to user
    await supabase
      .from('licenses')
      .update({ user_id: userId, activated_at: new Date().toISOString() })
      .eq('key', licenseKey)
    
    return {
      success: true,
      license: {
        key: data.key,
        tier: data.tier,
        expiresAt: data.expires_at ? new Date(data.expires_at).getTime() : undefined,
        features: data.features || []
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
```

### Validate License

```typescript
// /src/app/external/license/validateUserLicenseKey.ts

import { supabase } from '../auth'

export interface LicenseValidationResult {
  isValid: boolean
  tier: 'free' | 'pro' | 'enterprise'
  features: string[]
  expiresAt?: number
}

/**
 * Validate current user's license
 */
export const validateUserLicenseKey = async (
  userId: string
): Promise<LicenseValidationResult> => {
  try {
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()
    
    if (error || !data) {
      return {
        isValid: false,
        tier: 'free',
        features: []
      }
    }
    
    // Check expiration
    if (data.expires_at) {
      const expiresAt = new Date(data.expires_at).getTime()
      if (expiresAt < Date.now()) {
        return {
          isValid: false,
          tier: 'free',
          features: []
        }
      }
      
      return {
        isValid: true,
        tier: data.tier,
        features: data.features || [],
        expiresAt
      }
    }
    
    return {
      isValid: true,
      tier: data.tier,
      features: data.features || []
    }
  } catch (error) {
    console.error('License validation failed:', error)
    return {
      isValid: false,
      tier: 'free',
      features: []
    }
  }
}
```

### Deactivate License

```typescript
// /src/app/external/license/desactivateUserLicenseKey.ts

import { supabase } from '../auth'

/**
 * Deactivate a license key
 */
export const deactivateUserLicenseKey = async (
  licenseKey: string,
  userId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('licenses')
      .update({
        user_id: null,
        deactivated_at: new Date().toISOString()
      })
      .eq('key', licenseKey)
      .eq('user_id', userId)
    
    return !error
  } catch (error) {
    console.error('License deactivation failed:', error)
    return false
  }
}
```

## Content Management — Notion CMS

Announcements and onboarding content are stored in Notion databases and fetched through the **announcements worker** (a Cloudflare Worker). The plugin never calls the Notion API directly.

```
Plugin UI → announcements-yelbolt-worker → Notion API
```

### Module structure

```
src/app/external/cms/
├── index.ts                    # initNotion() + buildHeaders()
├── getAnnouncements.ts         # Fetch + filter by platform
├── getOnboarding.ts            # Fetch + filter by platform × editor
└── checkAnnouncementsVersion.ts # Fetch current version string
```

### Initialization

`initNotion()` is called once in `src/app/index.tsx`. It stores the token in module scope. All subsequent requests use `buildHeaders()`, which injects `Authorization` only when a token is present.

```typescript
// src/app/index.tsx
const notionApiKey = import.meta.env.VITE_NOTION_API_KEY

if (globalConfig.env.isNotionEnabled && notionApiKey !== undefined)
  initNotion(notionApiKey)
```

```typescript
// src/app/external/cms/index.ts
let notionApiKey: string | null = null

export const initNotion = (apiKey: string) => { notionApiKey = apiKey }
export const buildHeaders = (): HeadersInit =>
  notionApiKey ? { Authorization: notionApiKey } : {}
```

### API key: dev vs production

| Context | Where the key lives |
|---|---|
| **Local dev** | `.env.local` → `VITE_NOTION_API_KEY` → `initNotion()` |
| **Production** | Cloudflare Worker secret (`wrangler secret put NOTION_API_KEY`) |

In production `VITE_NOTION_API_KEY` is **not set**. `buildHeaders()` returns `{}`. The worker authenticates with Notion using its own secret — the key is never bundled in the plugin JS.

> **Never set `VITE_NOTION_API_KEY` in production.** Vite embeds `VITE_*` variables in the JS bundle at build time.

### CORS preflight

Sending `Authorization` triggers a CORS preflight (`OPTIONS`). The worker must return:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Authorization
```

`checkAnnouncementsVersion` sends no headers (simple GET) and is not affected.

### `getAnnouncements(workerUrl, dbId, platform)`

Called in `Announcements.tsx` on mount. Filters results by the `Platforms` Notion property.

```typescript
import getAnnouncements from '../../../external/cms/getAnnouncements'

getAnnouncements(
  this.props.config.urls.announcementsWorkerUrl,
  this.props.config.env.announcementsDbId,
  this.props.config.env.platform  // 'figma' | 'penpot' | 'sketch' | 'framer'
)
  .then((announcements) => this.setState({ announcements, status: 'LOADED' }))
  .catch(() => this.setState({ status: 'ERROR' }))
```

### `getOnboarding(workerUrl, dbId, platform, editor)`

Called in `Onboarding.tsx` on mount. Filters by `Platforms` **and** `Editors`.

```typescript
import getOnboarding from '../../../external/cms/getOnboarding'

getOnboarding(
  this.props.config.urls.announcementsWorkerUrl,
  this.props.config.env.onboardingDbId,
  this.props.config.env.platform,
  this.props.config.env.editor  // 'figma' | 'figjam' | 'dev' | 'dev_vscode' | ...
)
  .then((announcements) => this.setState({ announcements, status: 'LOADED' }))
  .catch(() => this.setState({ status: 'ERROR' }))
```

`dev` and `dev_vscode` both map to the `Dev` Notion label.

### `checkAnnouncementsVersion(workerUrl, dbId)`

Called in `App.tsx` at startup to decide whether to show announcements. Result is compared with the version stored in `figma.clientStorage` by `checkAnnouncementsStatus`.

```typescript
import checkAnnouncementsVersion from '../external/cms/checkAnnouncementsVersion'

checkAnnouncementsVersion(
  config.urls.announcementsWorkerUrl,
  config.env.announcementsDbId
).then((remoteVersion) => checkAnnouncementsStatus(remoteVersion))
```

| Condition | Outcome |
|---|---|
| Both versions empty | `NO_ANNOUNCEMENTS` |
| Local empty + onboarding unread | `DISPLAY_ONBOARDING_DIALOG` |
| Local empty + onboarding read | `DISPLAY_ANNOUNCEMENTS_DIALOG` |
| Major version changed | `DISPLAY_ANNOUNCEMENTS_DIALOG` |
| Minor version changed | `DISPLAY_ANNOUNCEMENTS_NOTIFICATION` |
| Versions match | `NO_ANNOUNCEMENTS` |

### Environment variables

```env
# .env.local
VITE_NOTION_ANNOUNCEMENTS_ID='your-announcements-database-id'
VITE_NOTION_ONBOARDING_ID='your-onboarding-database-id'
VITE_NOTION_API_KEY='your-notion-integration-token'  # local dev only
VITE_ANNOUNCEMENTS_WORKER_URL='http://localhost:8888' # or deployed worker URL
```

### Worker setup

```bash
unoff add announcement-worker
cd workers/announcement-worker
npm install
wrangler secret put NOTION_API_KEY  # store token in Cloudflare, not in .env
npm run deploy
```

## Best Practices

### 1. Environment Variables

```typescript
// ✅ Use environment variables
const apiUrl = import.meta.env.VITE_API_URL

// ❌ Hardcode sensitive data
const apiUrl = 'https://api.example.com'
```

### 2. Error Handling

```typescript
// ✅ Always handle errors
try {
  await externalService.call()
} catch (error) {
  Sentry.captureException(error)
  console.error('Service failed:', error)
  return fallbackValue
}

// ❌ Ignore errors
await externalService.call()
```

### 3. Type Safety

```typescript
// ✅ Define response types
interface ApiResponse {
  success: boolean
  data?: any
  error?: string
}

const result: ApiResponse = await api.call()

// ❌ Use any
const result: any = await api.call()
```

### 4. Caching

```typescript
// ✅ Cache responses
let cachedLicense: LicenseValidationResult | null = null
let cacheTimestamp = 0

export const validateLicense = async (userId: string) => {
  const now = Date.now()
  const cacheAge = now - cacheTimestamp
  
  // Cache for 5 minutes
  if (cachedLicense && cacheAge < 300000) {
    return cachedLicense
  }
  
  cachedLicense = await fetchLicense(userId)
  cacheTimestamp = now
  
  return cachedLicense
}
```

### 5. Service Initialization

```typescript
// ✅ Initialize once at startup
// In /src/app/index.tsx
import { initSentry } from './external/monitoring'
import { initMixpanel } from './external/tracking/client'

initSentry()
initMixpanel()

// ❌ Initialize in components
class MyComponent extends React.Component {
  componentDidMount() {
    initSentry() // Wrong place!
  }
}
```
