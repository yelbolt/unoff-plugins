---
name: feature-flags
description: Runtime feature flag system using featuresScheme, FeatureStatus checks, and doSpecificMode() overrides. availabilityForEditors is Figma-specific (FigJam, Dev Mode, etc.) — on Penpot use availabilityForServices only. Use when adding new features, gating by plan tier, restricting to specific editors (Figma) or services, or overriding feature state for testing.
---

# Feature Flags System

## Overview

The plugin uses a comprehensive feature flag system built on the `Feature` type from `@unoff/utils` and the `FeatureStatus` class. This system controls:

- **Visibility**: Whether a feature is rendered at all
- **Pro gating**: Whether a feature requires a paid plan
- **New badges**: Whether a feature shows a "new" indicator
- **Editor availability**: Which Figma editors (Figma, FigJam, Dev Mode, etc.) support the feature
- **Service scoping**: Which plugin services a feature belongs to

## Architecture

```
featuresScheme (static definitions)
    ↓
doSpecificMode() (apply overrides)
    ↓
globalConfig.features (runtime array)
    ↓
FeatureStatus (per-component checks)
    ↓
Feature wrapper / isActive() / isBlocked() / isNew()
```

## Feature Type

From `@unoff/utils`:

```typescript
interface Feature<S extends string> {
  name: string
  description: string
  isActive: boolean
  isPro: boolean
  isNew: boolean
  type: 'SERVICE' | 'CONTEXT' | 'DIVISION' | 'ACTION'
  availabilityForServices: Array<S>
  proForServices: Array<S>
  availabilityForEditors: Array<Editor>
  limit?: number  // Optional usage limit (set via limitsMapping)
}
```

### Feature Types

| Type | Purpose | Examples |
|------|---------|---------|
| `SERVICE` | Top-level plugin service | `MY_SERVICE` |
| `CONTEXT` | Tab/view within a service | `MY_FIRST_CONTEXT`, `MY_SECOND_CONTEXT` |
| `DIVISION` | UI section or module | `SHORTCUTS`, `USER`, `USER_CONSENT`, `NOTIFICATIONS` |
| `ACTION` | Specific user action | `PRO_PLAN`, `USER_LICENSE`, `HELP_DOCUMENTATION`, `RESIZE_UI` |

## featuresScheme

All features are defined in `/src/app/stores/features.ts` as a flat array:

```typescript
import { Feature } from '@unoff/utils'

export const featuresScheme: Array<Feature<'MY_SERVICE'>> = [
  // Services
  {
    name: 'MY_SERVICE',
    description: 'Service description here',
    isActive: true,
    isPro: false,
    isNew: false,
    type: 'SERVICE',
    availabilityForServices: ['MY_SERVICE'],
    proForServices: ['MY_SERVICE'],
    availabilityForEditors: [
      'figma', 'figjam', 'dev', 'dev_vscode',
      'penpot', 'sketch', 'framer', 'buzz',
    ],
  },

  // Contexts (tabs)
  {
    name: 'MY_FIRST_CONTEXT',
    description: 'First context description here',
    isActive: true,
    isPro: false,
    isNew: false,
    type: 'CONTEXT',
    availabilityForServices: ['MY_SERVICE'],
    proForServices: ['MY_SERVICE'],
    availabilityForEditors: [
      'figma', 'figjam', 'dev', 'dev_vscode',
      'penpot', 'sketch', 'framer', 'buzz',
    ],
  },

  // Subcontexts
  {
    name: 'MY_FIRST_CONTEXT_SUBCONTEXT_A',
    description: 'Subcontext A description here',
    isActive: true,
    isPro: false,
    isNew: false,
    type: 'CONTEXT',
    // ...
  },

  // Divisions (UI sections)
  {
    name: 'SHORTCUTS',
    description: 'Quick useful links',
    isActive: true,
    isPro: false,
    isNew: false,
    type: 'DIVISION',
    // ...
  },

  // Actions
  {
    name: 'PRO_PLAN',
    description: 'Pro plan subscription',
    isActive: true,
    isPro: false,
    isNew: false,
    type: 'ACTION',
    // ...
  },
]
```

### Complete Feature List (Template)

| Name | Type | Description |
|------|------|-------------|
| `MY_SERVICE` | SERVICE | Main plugin service |
| `MY_FIRST_CONTEXT` | CONTEXT | First tab |
| `MY_SECOND_CONTEXT` | CONTEXT | Second tab |
| `MY_THIRD_CONTEXT` | CONTEXT | Third tab |
| `MY_FIRST_CONTEXT_SUBCONTEXT_A` | CONTEXT | Sub-tab A |
| `MY_FIRST_CONTEXT_SUBCONTEXT_B` | CONTEXT | Sub-tab B |
| `MY_FIRST_CONTEXT_SUBCONTEXT_C` | CONTEXT | Sub-tab C |
| `SHORTCUTS` | DIVISION | Quick links section |
| `USER` | DIVISION | User menu |
| `USER_CONSENT` | DIVISION | Cookie/consent module |
| `USER_PREFERENCES` | CONTEXT | User preferences (subset of editors) |
| `USER_LICENSE` | ACTION | License management |
| `USER_LICENSE_JUMP` | ACTION | License redirect |
| `USER_LANGUAGE` | DIVISION | Language settings |
| `USER_LANGUAGE_EN_US` | DIVISION | English option |
| `USER_LANGUAGE_FR_FR` | DIVISION | French option |
| `USER_LANGUAGE_SUGGESTION` | DIVISION | Language suggestion banner |
| `HELP_ANNOUNCEMENTS` | ACTION | Release notes |
| `HELP_ONBOARDING` | DIVISION | Onboarding flow |
| `HELP_DOCUMENTATION` | ACTION | Documentation link |
| `HELP_EMAIL` | ACTION | Email support |
| `HELP_CHAT` | ACTION | Chat support |
| `INVOLVE_REPOSITORY` | ACTION | Source repository |
| `INVOLVE_FEEDBACK` | ACTION | NPS/feedback form |
| `INVOLVE_ISSUES` | ACTION | Bug reports |
| `INVOLVE_COMMUNITY` | ACTION | Community discussions |
| `INVOLVE_REQUESTS` | ACTION | Feature requests |
| `MORE_ABOUT` | ACTION | About info |
| `MORE_NETWORK` | ACTION | Social networks (disabled by default) |
| `MORE_AUTHOR` | ACTION | Author page |
| `RESIZE_UI` | ACTION | Window resize |
| `PRO_PLAN` | ACTION | Pro plan subscription |
| `NOTIFICATIONS` | DIVISION | User notifications |
| `AUTHENTICATION` | DIVISION | Auth module |

## doSpecificMode()

This function creates the runtime feature array by applying overrides to the base `featuresScheme`:

```typescript
export const doSpecificMode = (
  unactiveFeature: Array<string>,   // Features to deactivate
  proFeature?: Array<string>,       // Features to mark as pro
  newFeature?: Array<string>        // Features to mark as new
) => {
  const features = featuresScheme.map((feature) => ({ ...feature })) // Clone
  const unactiveFeatures = new Set(unactiveFeature)
  const proFeatures = new Set(proFeature)
  const newFeatures = new Set(newFeature)

  return features.map((feature) => {
    if (unactiveFeatures.has(feature.name)) feature.isActive = false
    if (proFeatures.has(feature.name)) feature.isPro = true
    if (newFeatures.has(feature.name)) feature.isNew = true
    return feature
  })
}
```

### Usage in globalConfig

```typescript
// /src/global.config.ts
features: doSpecificMode(
  [
    // Deactivated features (empty = all active)
  ],
  [
    // Pro features
    'MY_FIRST_CONTEXT_SUBCONTEXT_B',
  ],
  [
    // New features
    'MY_FIRST_CONTEXT_SUBCONTEXT_C',
  ]
),
```

This means:
- All features in `featuresScheme` start with their default `isActive` values
- `MY_FIRST_CONTEXT_SUBCONTEXT_B` gets `isPro: true` → requires paid plan
- `MY_FIRST_CONTEXT_SUBCONTEXT_C` gets `isNew: true` → shows "new" badge

## FeatureStatus (Runtime Checks)

`FeatureStatus` from `@unoff/utils` evaluates a feature against the current runtime context:

```typescript
import { FeatureStatus } from '@unoff/utils'

const status = new FeatureStatus({
  features: config.features,        // The full feature array
  featureName: 'MY_FIRST_CONTEXT',  // Feature to check
  planStatus: planStatus,            // 'PAID' | 'UNPAID' | 'NOT_SUPPORTED'
  currentService: service,           // 'MY_SERVICE'
  currentEditor: editor,             // 'figma' | 'figjam' | 'dev' | ...
})
```

### Methods

```typescript
// Is the feature available for the current editor, service, and plan?
status.isActive(): boolean

// Is the feature blocked by plan status? (isPro && planStatus === 'UNPAID')
status.isBlocked(): boolean

// Is the feature new?
status.isNew(): boolean

// Has the feature's usage limit been reached?
status.isReached(currentCount: number): boolean
```

### Decision Logic

```
isActive():
  feature.isActive === true
  AND currentEditor is in feature.availabilityForEditors
  AND currentService is in feature.availabilityForServices
  AND (feature.isPro === false OR planStatus === 'PAID')

isBlocked():
  feature.isPro === true
  AND planStatus !== 'PAID'
  AND currentService is in feature.proForServices

isNew():
  feature.isNew === true

isReached(count):
  feature.limit is defined
  AND count >= feature.limit
```

## Static Features Pattern

Components define a `static features` method mapping feature names to `FeatureStatus` instances:

```typescript
class App extends Component<AppProps, AppState> {
  static features = (
    planStatus: PlanStatus,
    config: ConfigContextType,
    service: Service,
    editor: Editor
  ) => ({
    MY_SERVICE: new FeatureStatus({
      features: config.features,
      featureName: 'MY_SERVICE',
      planStatus, currentService: service, currentEditor: editor,
    }),
    // ...one entry per feature name checked in this component, same shape
    USER_CONSENT: new FeatureStatus({
      features: config.features,
      featureName: 'USER_CONSENT',
      planStatus, currentService: service, currentEditor: editor,
    }),
  })

  // Private getter — single access point, declared right after `static features`
  // and before the constructor. Never call `App.features(...)` a second time
  // in the same component; always go through `this.features`.
  private get features() {
    return App.features(
      this.state.planStatus,
      this.props.config,
      this.state.service,
      this.state.editor
    )
  }

  render() {
    return (
      <Feature
        isActive={
          this.features.MY_SERVICE.isActive() && this.state.service === 'MY_SERVICE'
        }
      >
        <MyService {...this.props} {...this.state} />
      </Feature>
    )
  }
}
```

### Always Go Through the `features` Getter

Every component with a `static features` method must also declare a `private get features()` getter, placed right after `static features` and right before `constructor`. Every call site in the component uses `this.features.X` — never `ComponentName.features(planStatus, config, service, editor).X` repeated inline.

```typescript
// ✅ Single source of truth for the call args, called as `this.features`
private get features() {
  return MyComponent.features(
    this.props.planStatus,
    this.props.config,
    this.props.service,
    this.props.editor
  )
}

<Feature isActive={this.features.MY_FEATURE.isActive()}>

// ❌ Repeating the full static call at every usage site
<Feature
  isActive={MyComponent.features(
    this.props.planStatus,
    this.props.config,
    this.props.service,
    this.props.editor
  ).MY_FEATURE.isActive()}
>
```

Why: a component often checks the same feature (or several features) in more than one place — `isActive`, `isBlocked`, `isNew` on the same entry, or the same entry reused in a `Menu` option and in `render()`. Repeating the 4-argument static call at each site is verbose and, more importantly, means a future signature change (e.g. adding a 5th parameter) requires touching every call site instead of one getter. If a component's static features arguments come from `this.state` instead of `this.props` (as in `App.tsx`), the getter is the only place that needs to know that.

## setContexts() — Tab/Context Filtering

`/src/app/utils/setContexts.ts` builds the visible tab list by evaluating `FeatureStatus` for each context:

```typescript
import { FeatureStatus } from '@unoff/utils'

export const setContexts = (
  contextList: Array<Context>,
  planStatus: PlanStatus,
  features: Array<Feature<'MY_SERVICE'>>,
  editor: Editor,
  service: Service,
  locales: (key: string, params?: Record<string, any>) => string
) => {
  const featuresList = {
    MY_FIRST_CONTEXT: new FeatureStatus({
      features, featureName: 'MY_FIRST_CONTEXT',
      planStatus, currentService: service, currentEditor: editor,
    }),
    MY_SECOND_CONTEXT: new FeatureStatus({
      features, featureName: 'MY_SECOND_CONTEXT',
      planStatus, currentService: service, currentEditor: editor,
    }),
    // ...for each context
  }

  const contexts = [
    {
      label: locales('myService.contexts.firstContext'),
      id: 'MY_FIRST_CONTEXT' as Context,
      isUpdated: false,
      isNew: featuresList.MY_FIRST_CONTEXT.isNew(),
      isActive: featuresList.MY_FIRST_CONTEXT.isActive(),
    },
    // ...
  ]

  // Filter: only contexts in the whitelist AND active
  const filteredContexts = contexts.filter((context) => {
    return contextList.includes(context.id) && context.isActive
  })

  // Preserve order from contextList
  return filteredContexts.sort((a, b) => {
    return contextList.indexOf(a.id) - contextList.indexOf(b.id)
  })
}
```

## Editor Availability

Features can be restricted to specific editors via `availabilityForEditors`:

```typescript
// Available everywhere
availabilityForEditors: [
  'figma', 'figjam', 'dev', 'dev_vscode',
  'penpot', 'sketch', 'framer', 'buzz',
],

// Only in full editors (not Dev Mode)
availabilityForEditors: ['figma', 'penpot', 'sketch', 'framer', 'buzz'],

// Only in Figma editors
availabilityForEditors: ['figma', 'figjam', 'dev', 'dev_vscode', 'buzz'],
```

Editor type is detected at runtime via `checkEditor()` bridge function and stored in component state.

## Adding a New Feature

1. **Define in featuresScheme** (`/src/app/stores/features.ts`):
   ```typescript
   {
     name: 'MY_NEW_FEATURE',
     description: 'What this feature does',
     isActive: true,
     isPro: false,
     isNew: true,
     type: 'ACTION',  // or SERVICE, CONTEXT, DIVISION
     availabilityForServices: ['MY_SERVICE'],
     proForServices: ['MY_SERVICE'],
     availabilityForEditors: ['figma', 'figjam', 'dev', 'dev_vscode', ...],
   },
   ```

2. **Optionally override in globalConfig** (`/src/global.config.ts`):
   ```typescript
   features: doSpecificMode(
     [],                          // Deactivated
     ['MY_NEW_FEATURE'],          // Mark as pro if needed
     ['MY_NEW_FEATURE'],          // Mark as new if needed
   ),
   ```

3. **Add to static features in the component**:
   ```typescript
   static features = (planStatus, config, service, editor) => ({
     // ...existing
     MY_NEW_FEATURE: new FeatureStatus({
       features: config.features,
       featureName: 'MY_NEW_FEATURE',
       planStatus, currentService: service, currentEditor: editor,
     }),
   })
   ```

4. **Use via the `this.features` getter** (no other changes needed to the getter itself — it already forwards every entry):
   ```typescript
   <Feature isActive={this.features.MY_NEW_FEATURE.isActive()}>
     <MyNewFeatureComponent />
   </Feature>

   <Button
     isBlocked={this.features.MY_NEW_FEATURE.isBlocked()}
     isNew={this.features.MY_NEW_FEATURE.isNew()}
     onUnblock={() => sendPluginMessage({ pluginMessage: { type: 'GET_PRO' } }, '*')}
   />
   ```

5. **If it's a CONTEXT, add to setContexts**:
   ```typescript
   // In setContexts.ts, add to featuresList and contexts array
   ```

## Best Practices

### 1. Use Static Features Pattern + the `features` Getter

```typescript
// ✅ Static method with runtime parameters, exposed via a private getter
static features = (planStatus, config, service, editor) => ({
  MY_FEATURE: new FeatureStatus({ ... }),
})

private get features() {
  return MyComponent.features(
    this.props.planStatus,
    this.props.config,
    this.props.service,
    this.props.editor
  )
}

// ❌ Creating FeatureStatus in render directly
render() {
  const status = new FeatureStatus({ ... }) // Creates new object every render
}

// ❌ Repeating the static call inline at every usage site instead of `this.features`
render() {
  return <Feature isActive={MyComponent.features(this.props.planStatus, this.props.config, this.props.service, this.props.editor).MY_FEATURE.isActive()} />
}
```

### 2. Check isActive Before Rendering

```typescript
// ✅ Feature wrapper prevents rendering
<Feature isActive={this.features.MY_FEATURE.isActive()}>
  <ExpensiveComponent />
</Feature>

// ❌ Rendering then hiding with CSS
<div style={{ display: this.features.MY_FEATURE.isActive() ? 'block' : 'none' }}>
  <ExpensiveComponent />
</div>
```

### 3. Always Implement onUnblock

```typescript
// ✅ Provide upgrade path for blocked features
<Button
  isBlocked={this.features.MY_FEATURE.isBlocked()}
  onUnblock={() => {
    sendPluginMessage({ pluginMessage: { type: 'GET_PRO' } }, '*')
  }}
/>
```

### 4. Set Editor Availability Thoughtfully

```typescript
// ✅ Restrict features that don't make sense in Dev Mode
availabilityForEditors: ['figma', 'penpot', 'sketch', 'framer', 'buzz'],

// ❌ Making everything available everywhere without considering the context
availabilityForEditors: ['figma', 'figjam', 'dev', 'dev_vscode', ...],
```
