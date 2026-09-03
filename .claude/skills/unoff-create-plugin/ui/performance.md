---
name: performance
description: Performance patterns including PureComponent render optimization, Feature component DOM removal, service singleton pattern, constructor-time computations, and build optimizations (viteSingleFile, CSS stripping, IIFE). Use when optimizing render cycles, reducing bundle size, or improving startup time.
---

# Performance Optimization

## Overview

The plugin optimizes performance through several patterns: `PureComponent` for shallow-comparison render avoidance, conditional service initialization, the `Feature` component for DOM removal (not hiding), sequential async chains to avoid race conditions, Vite's single-file inlining for zero network requests at runtime, and platform-specific CSS stripping. This document catalogs all performance patterns present in the template.

## When to Use

- Understanding why certain architectural decisions were made
- Adding new components and ensuring they don't cause unnecessary re-renders
- Optimizing heavy operations
- Debugging performance issues
- Working with external service initialization

## Render Optimization

### PureComponent

Nearly all components extend `PureComponent` instead of `Component`:

```typescript
export default class MySubcontextA extends PureComponent<
  MySubcontextAProps,
  MySubcontextAState
> { ... }
```

`PureComponent` implements `shouldComponentUpdate()` with a shallow comparison of props and state. This means:
- If props/state references haven't changed, the component skips rendering
- Particularly effective with the `BaseProps` spread pattern where unchanged state slices keep the same references

**One exception**: `App.tsx` extends `Component` (not `PureComponent`) because it's the root component that must re-render on all state changes.

### Feature Component — DOM Removal

The `Feature` component renders `null` when inactive, completely removing children from the DOM:

```tsx
<Feature isActive={condition}>
  <ExpensiveComponent {...this.props} />
</Feature>
```

This is cheaper than `display: none` because:
- No DOM nodes are created
- No event listeners are attached
- No child lifecycle methods run
- Child components don't exist in the component tree

### forceUpdate for Language Changes

When the translation function `t` changes (language switch), components must re-render their translated content. The codebase uses `forceUpdate()` selectively:

```typescript
// MyFirstContext.tsx
componentDidUpdate(previousProps: Readonly<MyFirstContextProps>): void {
  if (previousProps.t !== this.props.t) {
    this.contexts = setContexts(
      ['MY_FIRST_CONTEXT_SUBCONTEXT_A', ...],
      this.props.planStatus,
      this.props.config.features,
      this.props.editor,
      this.props.service,
      this.props.t
    )
    this.forceUpdate()
  }
}
```

This only fires when `t` reference changes (language switch), not on every render.

## State Management Performance

### Nanostores — Minimal Reactivity

Nanostores atoms are lightweight compared to full state management libraries:

```typescript
// 4 bytes of state
export const $creditsCount = atom<number>(0)
```

Subscription pattern with cleanup:

```typescript
componentDidMount = () => {
  this.subscribeCredits = $creditsCount.subscribe((value) => {
    this.setState({ creditsCount: adjustedValue })
  })
}

componentWillUnmount = () => {
  if (this.subscribeCredits) this.subscribeCredits()
}
```

### First-Subscription Skip

The `App` component skips the first credit count subscription to avoid a redundant re-render on mount:

```typescript
private isFirstCreditCountSubscription = true

this.subscribeCreditCount = $creditsCount.subscribe((value) => {
  if (this.isFirstCreditCountSubscription) {
    this.isFirstCreditCountSubscription = false
    return  // Skip initial value emission
  }
  // ...setState only on subsequent changes
})
```

### Dual Update Pattern

When Nanostores updates need to persist to Figma Client Storage, both happen in the same subscription:

```typescript
this.subscribeCreditCount = $creditsCount.subscribe((value) => {
  // ...skip first
  this.setState({ creditsCount: adjustedValue })

  sendPluginMessage({
    pluginMessage: {
      type: 'SET_ITEMS',
      items: [{ key: 'credits_count', value: adjustedValue }],
    },
    pluginId: this.props.config.env.pluginId,
  }, this.props.config.urls.platformUrl)
})
```

Single subscription → setState + persist. No extra watchers or middleware.

## Build-Time Optimization

### Single-File Output (viteSingleFile)

All UI assets are inlined into one HTML file:

```
dist/index.html  ← contains all JS + CSS inlined
dist/plugin.js   ← IIFE Canvas bundle
```

Benefits:
- **Zero network requests** — the UI loads from a single embedded HTML string
- **No asset loading latency** — CSS, JS, images (≤small size) are inlined
- **No CORS issues** — everything is same-origin within the iframe

### Platform CSS Stripping

The `excludeUnwantedCssPlugin` removes CSS for non-target platforms at build time:

```typescript
// Strips penpot-colors, sketch-colors, etc. when building for Figma
const excludePattern =
  /figma-colors|penpot-colors|penpot-types|sketch-colors|sketch-types\.css$/
```

This prevents shipping unused CSS for Penpot/Sketch/Framer, reducing bundle size.

### IIFE Canvas Build

The Canvas code is built as IIFE (Immediately Invoked Function Expression):

```typescript
lib: {
  entry: './src/index.ts',
  name: 'FigmaPlugin',
  fileName: () => 'plugin.js',
  formats: ['iife'],
}
```

IIFE avoids module system overhead in Figma's sandbox. The entire Canvas code is a single self-executing function.

### Tree Shaking

With `build.target: 'es2015'` and ESModule source code:
- Vite/Rollup eliminates unused exports
- Dead code from unoff-ui/unoff-utils is stripped if not imported

### Source Map Management

```typescript
sourcemap: true,                          // Always generate
filesToDeleteAfterUpload: '**/*.map',     // Delete after Sentry upload
```

Source maps are generated for debugging but never shipped to users in production.

## Service Initialization Performance

### Conditional Initialization

Each external service is only initialized when enabled:

```typescript
// Only init Mixpanel if enabled and token exists
if (globalConfig.env.isMixpanelEnabled && mixpanelToken !== undefined) {
  mixpanel.init(mixpanelToken, { /* config */ })
  initMixpanel(mixpanel)
}

// Only init Sentry if enabled, not dev, and DSN exists
if (globalConfig.env.isSentryEnabled && !globalConfig.env.isDev && sentryDsn !== undefined) {
  Sentry.init({ /* config */ })
  initSentry(Sentry)
}

// Only init Supabase if enabled and key exists
if (globalConfig.env.isSupabaseEnabled && supabaseAnonKey !== undefined)
  initSupabase(globalConfig.urls.databaseUrl, supabaseAnonKey)
```

In development, Sentry is replaced with a lightweight dev logger (no SDK overhead):

```typescript
const devLogger = {
  captureException: (error: Error) => console.error(error),
  captureMessage: (message: string) => console.info(message),
}
```

### Singleton Pattern

All services use module-level singletons to avoid re-initialization:

```typescript
// Only created once
let supabaseInstance: SupabaseClient | null = null

export const initSupabase = (url: string, key: string) => {
  if (!supabaseInstance) supabaseInstance = createClient(url, key)
  return supabaseInstance
}

export const getSupabase = () => supabaseInstance
```

### Sentry Sampling

```typescript
Sentry.init({
  tracesSampleRate: 1.0,               // Trace all transactions
  replaysSessionSampleRate: 0,          // Don't record normal sessions
  replaysOnErrorSampleRate: 1.0,        // Record replay only on error
})
```

Session replay only activates on errors — no recording overhead during normal usage.

## Canvas-Side Performance

### Sequential Checks with Chaining

The `LOAD_DATA` handler chains promise-based checks sequentially:

```typescript
checkUserConsent(path.data.userConsent)
  .then(() => checkEditor())
  .then(() => checkTrialStatus())
  .then(() => checkCredits())
  .then(() => checkUserLicense())
  .then(() => checkUserPreferences())
```

Each check reads from `figma.clientStorage` and posts a message. Sequential chaining:
- Avoids flooding the UI with simultaneous messages
- Each step can depend on prior state
- Predictable initialization order

### Client Storage Batch Writes

The `SET_ITEMS` handler processes multiple items in a loop:

```typescript
SET_ITEMS: () => {
  path.items.forEach(async (item: { key: string; value: unknown }) => {
    figma.clientStorage.setAsync(item.key, item.value)
  })
}
```

### documentAccess: "dynamic-page"

```json
// manifest.json
"documentAccess": "dynamic-page"
```

The plugin only accesses the current page, not the entire document. This prevents loading all pages' node data into memory.

## UI Rendering Performance

### Constructor-Time Computations

Expensive computations are done in the constructor, not in `render()`:

```typescript
constructor(props: MyFirstContextProps) {
  super(props)
  // Context list computed once in constructor
  this.contexts = setContexts(
    ['MY_FIRST_CONTEXT_SUBCONTEXT_A', ...],
    props.planStatus, props.config.features, props.editor, props.service, props.t
  )
  // Theme read once
  this.theme = document.documentElement.getAttribute('data-theme')
}
```

### Static Features Pattern

Feature status checks are declared as a static method, computed at call sites rather than stored in state:

```typescript
static features = (planStatus, config, service, editor) => ({
  MY_FEATURE: new FeatureStatus({ ... }),
})

// Single access point, declared right before the constructor.
// JSX reads `this.features.X` — never calls the static method inline.
private get features() {
  return MyComponent.features(
    this.props.planStatus,
    this.props.config,
    this.props.service,
    this.props.editor
  )
}
```

Called only in JSX where needed, through `this.features` — not recomputed on every render of the full component, and not duplicated across every usage site in the component.

### Loading State

The `App` component shows a spinner until `LOAD_DATA` completes:

```tsx
if (this.state.isLoaded)
  return <main className="ui">{ /* full UI */ }</main>
else
  return (
    <main className="ui">
      <div className={layouts.centered}>
        <Icon type="PICTO" iconName="spinner" />
      </div>
    </main>
  )
```

This prevents rendering the full component tree before data is available, avoiding flashes of incomplete content and wasted render cycles.

## Responsive Resize Performance

### Mouse Event Optimization

The resize grip uses direct `window.onmousemove` assignment instead of `addEventListener`:

```typescript
onHold = (e: MouseEvent) => {
  window.onmousemove = (e) => this.onResize(e, shiftX, shiftY)
  window.onmouseup = this.onRelease
}

onRelease = () => (window.onmousemove = null)
```

This ensures only one mousemove handler is active at a time and is automatically cleaned up.

## Summary Table

| Pattern | Location | Impact |
|---|---|---|
| PureComponent | All components except App | Prevents unnecessary re-renders |
| Feature component | Throughout UI | Removes inactive DOM entirely |
| viteSingleFile | Build config | Zero network requests at runtime |
| CSS platform stripping | Vite plugin | Smaller bundle for each platform |
| IIFE Canvas build | Build config | No module system overhead |
| Conditional service init | index.tsx | No SDK overhead for disabled services |
| Service singletons | external/ | One instance per service |
| Sentry replay on error only | index.tsx | No recording during normal use |
| Sequential LOAD_DATA chain | loadUI.ts | Predictable init, no message flooding |
| dynamic-page access | manifest.json | Only current page loaded |
| Constructor computations | All contexts | Heavy work outside render() |
| First-subscription skip | App.tsx | Avoids redundant initial re-render |
| Loading spinner gate | App.tsx | No rendering before data ready |

## Best Practices

✅ Extend `PureComponent` for all non-root components  
✅ Use the `Feature` component to remove (not hide) inactive UI  
✅ Initialize services conditionally with config flags  
✅ Do expensive computations in constructors, not render()  
✅ Clean up subscriptions and event listeners in `componentWillUnmount`  
✅ Use sequential promise chains for ordered initialization  

## What to Avoid

❌ Don't extend `Component` unless you need to bypass PureComponent's shallow comparison  
❌ Don't compute feature status in `render()` — use the static features pattern + `this.features` getter  
❌ Don't add event listeners without removing them on unmount  
❌ Don't use `display: none` to hide content — use `Feature` to remove from DOM  
❌ Don't init services without checking their config flag first  
❌ Don't use `replaysSessionSampleRate > 0` — it adds significant overhead  
