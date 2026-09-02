---
name: component-patterns
description: PureComponent class pattern with WithConfig and WithTranslation HOCs, BaseProps spread, platformMessage event handling, and createPortal for modals/toasts. Always import from preact/compat (or preact for type-only imports) — never import React from 'react' in plugin source files. Use when writing new UI components, composing HOCs, or handling Canvas→UI messages in a component.
---

# Component Patterns

## Overview

See [core.md](../core.md) for the Preact/PureComponent stack facts. This file covers the concrete implementation: class component structure, the `WithConfig`/`WithTranslation` HOCs, `BaseProps`, and `platformMessage` handling.

> **Nuance core.md doesn't cover**: the React → Preact build-level alias exists only for third-party libraries (e.g. `@tolgee/react`). Application code must still import from `preact/compat` (or `preact` for type-only imports) directly — never `import React from 'react'`.

## Class Component Pattern

### Basic Structure

```typescript
import { PureComponent } from 'preact/compat'

interface MyComponentProps {
  // Props definition
}

interface MyComponentState {
  // State definition
}

class MyComponent extends PureComponent<MyComponentProps, MyComponentState> {
  state: MyComponentState = {
    // Initial state
  }

  // Event handlers as arrow functions (auto-bound)
  handleAction = () => {
    this.setState({ /* ... */ })
  }

  render() {
    return <div>{/* JSX */}</div>
  }
}

export default MyComponent
```

### PureComponent vs Component

- **`PureComponent`**: Implements `shouldComponentUpdate` with shallow prop/state comparison. Use for most components.
- **`Component`**: No automatic optimization. Use when you need custom update logic or when the component handles complex state (like `App.tsx`).

```typescript
// ✅ Most components — use PureComponent
class MyService extends PureComponent<Props, State> { ... }
class Feature extends PureComponent<FeatureProps> { ... }

// ✅ Root App component — uses Component (complex state)
class App extends Component<AppProps, AppState> { ... }
```

## Higher-Order Components (HOCs)

### WithConfig

Injects the `config` prop (type `ConfigContextType = Config`) from `ConfigContext`:

```typescript
// /src/app/ui/components/WithConfig.tsx
import { ComponentType, PureComponent } from 'preact/compat'
import { ConfigContext, ConfigContextType } from '../../config/ConfigContext'

export interface WithConfigProps {
  config: ConfigContextType
}

export const WithConfig = <P extends WithConfigProps>(
  WrappedComponent: ComponentType<P>
) => {
  return class WithConfigComponent extends PureComponent<
    Omit<P, keyof WithConfigProps>
  > {
    render() {
      return (
        <ConfigContext.Consumer>
          {(config) => {
            if (!config) throw new Error('Config context is undefined')
            return <WrappedComponent {...(this.props as P)} config={config} />
          }}
        </ConfigContext.Consumer>
      )
    }
  }
}
```

### WithTranslation

Injects the `t` translation function from Tolgee's `useTranslate` hook:

```typescript
// /src/app/ui/components/WithTranslation.tsx
import { useTranslate } from '@tolgee/react'
import type { ComponentType } from 'preact'

export interface WithTranslationProps {
  t: (key: string, params?: Record<string, any>) => string
}

export const WithTranslation = <P extends WithTranslationProps>(
  WrappedComponent: ComponentType<P>
): ComponentType<Omit<P, keyof WithTranslationProps>> => {
  const WithTranslationComponent = (
    props: Omit<P, keyof WithTranslationProps>
  ) => {
    const { t } = useTranslate()
    return <WrappedComponent {...(props as P)} t={t} />
  }
  return WithTranslationComponent
}
```

> Note: `WithTranslation` is a functional wrapper (uses a hook internally) while `WithConfig` is a class component wrapper. This is because Tolgee requires the `useTranslate` hook. `ComponentType` is imported as a type from `preact` (not `preact/compat`) since only the type is needed here.

### HOC Composition

HOCs are composed from inner to outer. The **export** line applies them:

```typescript
// Pattern: export default WithTranslation(WithConfig(MyComponent))

// Execution order:
// 1. WithConfig wraps MyComponent → adds `config` prop
// 2. WithTranslation wraps the result → adds `t` prop
// 3. Final component receives both `config` and `t`

class MyComponent extends PureComponent<MyComponentProps> {
  render() {
    // Both props are available
    const { config, t } = this.props
    return <div>{t('key', { name: config.information.pluginName })}</div>
  }
}

export default WithTranslation(WithConfig(MyComponent))
```

### Props Interface with HOCs

When defining component props, extend HOC interfaces:

```typescript
import { WithConfigProps } from '../components/WithConfig'
import { WithTranslationProps } from '../components/WithTranslation'
import { BaseProps } from '../../types/app'

// Full props include HOC injections
interface MyComponentProps extends WithConfigProps, WithTranslationProps, BaseProps {
  // Component-specific props
  customProp: string
}

// When using the component, you only pass non-HOC props:
// <MyComponent customProp="value" service={...} editor={...} ... />
// config and t are injected by HOCs
```

## BaseProps Pattern

The `BaseProps` type defines the common props passed down from `App.tsx` via spread:

```typescript
// /src/app/types/app.ts
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

In `App.tsx`, state is spread into child components:

```typescript
// App.tsx render()
<MyService
  {...this.props}   // config, t (from HOCs)
  {...this.state}   // All AppState fields (includes BaseProps)
/>
```

Child services/contexts receive everything they need via spread.

## Static Features Pattern

Each component that needs feature gating defines a `static features` method:

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
      planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    USER_CONSENT: new FeatureStatus({
      features: config.features,
      featureName: 'USER_CONSENT',
      planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    SHORTCUTS: new FeatureStatus({
      features: config.features,
      featureName: 'SHORTCUTS',
      planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    // ...more features
  })

  // Declared right after `static features`, right before `constructor`.
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

### Why Static?

- Called without a component instance
- Can be invoked from render without creating `this` binding issues
- Accepts current runtime values as parameters (not stale closures)

### Always Read It Through `this.features`

Never call `ComponentName.features(planStatus, config, service, editor)` directly at a JSX usage site — always add the `private get features()` getter shown above and read `this.features.FEATURE_NAME` instead. One component often checks the same or several feature names in more than one place (`isActive`/`isBlocked`/`isNew` on the same entry, or the same entry in a `Menu` option and in `render()`); repeating the 4-argument call at each site is what the getter exists to eliminate. It also means a call site never needs to know whether the args come from `this.props` or `this.state` (see `App.tsx` above, which reads from state) — that detail lives in exactly one place.

## Preact Event Handling — `e.currentTarget` Not `e.target`

In Preact, `e.target` is typed as `EventTarget | null` (not narrowed to `HTMLInputElement` etc.), unlike React. Always use `e.currentTarget` to access element properties.

```typescript
// ❌ WRONG — e.target is EventTarget | null in Preact
handleChange = (e: JSX.TargetedEvent<HTMLInputElement>) => {
  this.setState({ value: e.target.value }) // TypeScript error
}

// ✅ CORRECT — e.currentTarget is properly typed
handleChange = (e: JSX.TargetedEvent<HTMLInputElement>) => {
  this.setState({ value: e.currentTarget.value })
}
```

This applies to all event handlers: `onChange`, `onBlur`, `onInput`, `onFocus`, etc.

## platformMessage Event Handling

### Subscribing to Messages

Components listen for Canvas → UI messages via the `platformMessage` CustomEvent:

```typescript
class App extends Component<AppProps, AppState> {
  componentDidMount = () => {
    window.addEventListener(
      'platformMessage',
      this.handleMessage as EventListener
    )
    window.addEventListener('resize', this.handleResize)
  }

  componentWillUnmount = () => {
    window.removeEventListener(
      'platformMessage',
      this.handleMessage as EventListener
    )
    window.removeEventListener('resize', this.handleResize)
  }

  handleMessage = (e: CustomEvent<PluginMessageData>) => {
    const path = e.detail

    try {
      const actions: { [action: string]: () => void } = {
        SWITCH_SERVICE: () => this.setState({ service: path.data.service }),
        SET_THEME: () => {
          document.documentElement.setAttribute('data-mode', path.data.theme)
        },
        CHECK_PLAN_STATUS: () =>
          this.setState({ planStatus: path.data.planStatus }),
        POST_MESSAGE: () =>
          this.setState({
            isNotificationDisplayed: true,
            notification: {
              type: path.data.type,
              message: path.data.message,
              timer: path.data.timer ?? 5000,
            },
          }),
        DEFAULT: () => null,
      }

      return actions[path.type ?? 'DEFAULT']?.()
    } catch (error) {
      console.error(error)
    }
  }
}
```

### Sending Messages to Canvas

```typescript
import { sendPluginMessage } from '../utils/pluginMessage'

// sendPluginMessage dispatches a 'pluginMessage' CustomEvent
// The bridge in index.tsx catches it and calls parent.postMessage()
sendPluginMessage(
  {
    pluginMessage: {
      type: 'SET_ITEMS',
      items: [{ key: 'credits_count', value: 42 }],
    },
    pluginId: this.props.config.env.pluginId,
  },
  this.props.config.urls.platformUrl
)
```

## Modal / Portal Pattern

Modals and notifications use `createPortal` to render outside the main component tree:

```typescript
import { createPortal } from 'preact/compat'

// In App.tsx render()
<Feature isActive={this.state.modalContext !== 'EMPTY'}>
  {document.getElementById('modal') &&
    createPortal(
      <Modal
        {...this.props}
        {...this.state}
        rawData={this.state}
        context={this.state.modalContext}
        onClose={() => this.setState({ modalContext: 'EMPTY' })}
      />,
      document.getElementById('modal') ?? document.createElement('app')
    )}
</Feature>

// Toast notifications use a separate portal target
<Feature isActive={this.state.isNotificationDisplayed}>
  {document.getElementById('toast') &&
    createPortal(
      <Modal
        {...this.props}
        {...this.state}
        rawData={this.state}
        context="NOTIFICATION"
        onClose={() => this.setState({ isNotificationDisplayed: false })}
      />,
      document.getElementById('toast') ?? document.createElement('app')
    )}
</Feature>
```

Portal targets are defined in `index.html`:
```html
<div id="app"></div>
<div id="modal"></div>
<div id="toast"></div>
```

## State Lifting via Callbacks

Child components communicate state changes upward via callback props:

```typescript
// App.tsx passes state-updating callbacks
<Shortcuts
  {...this.props}
  {...this.state}
  onReOpenAnnouncements={(e) => this.setState({ ...e })}
  onReOpenAbout={(e) => this.setState({ ...e })}
  onReOpenPreferences={(e) => this.setState({ ...e })}
  onUpdateConsent={(e) => this.setState({ ...e })}
  onUpdateLanguage={(e) => this.setState({ ...e })}
/>

// Child component triggers partial state update:
this.props.onReOpenAbout({ modalContext: 'ABOUT' })
```

## Component File Organization

```
/src/app/ui/
  App.tsx                    # Root component (Component, not PureComponent)
  components/
    Feature.tsx              # Conditional rendering wrapper
    WithConfig.tsx           # Config injection HOC
    WithTranslation.tsx      # Translation injection HOC
  contexts/
    Modal.tsx                # Modal routing component
    MyFirstContext.tsx        # Context-level views
    MySecondContext.tsx
    MyThirdContext.tsx
  modules/
    Icon.tsx                 # Custom icon module
    LangPreferences.tsx      # Language settings
    PlanControls.tsx         # Plan/subscription UI
    Shortcuts.tsx            # Keyboard shortcuts panel
    modals/
      About.tsx              # About dialog
      Announcements.tsx      # Announcements dialog
  services/
    MyService.tsx            # Main service view
  subcontexts/
    MySubcontextA.tsx        # Sub-context views
    MySubcontextB.tsx
    MySubcontextC.tsx
  stylesheets/
    app.css                  # Global styles
```

## Best Practices

### 1. Import from Preact Directly

```typescript
// ✅ Import from preact/compat (runtime) or preact (types)
import { PureComponent, Component, createPortal } from 'preact/compat'
import type { ComponentType } from 'preact'

// ❌ Never import React — even though the alias resolves it at build time
import React from 'react'
import { PureComponent } from 'react'
```

The build-level alias (`react` → `preact/compat`) exists for third-party libraries only. Application code must import from Preact directly.

### 3. Use PureComponent by Default

```typescript
// ✅ PureComponent for automatic shallow comparison
class MyComponent extends PureComponent<Props, State> { ... }

// ❌ Component for simple cases (unnecessary re-renders)
class MyComponent extends Component<Props, State> { ... }
```

### 4. Arrow Functions for Handlers

```typescript
// ✅ Arrow functions are auto-bound
handleClick = () => {
  this.setState({ clicked: true })
}

// ❌ Regular methods need manual binding
handleClick() {
  this.setState({ clicked: true })  // 'this' may be undefined
}
```

### 5. HOC Composition Order

```typescript
// ✅ WithTranslation outermost, WithConfig innermost
export default WithTranslation(WithConfig(MyComponent))

// This ensures config is available when translation function is injected
```

### 6. Spread Props for Child Passing

```typescript
// ✅ Spread both props and state for child components
<MyService {...this.props} {...this.state} />

// ❌ Manually passing every prop
<MyService
  config={this.props.config}
  t={this.props.t}
  service={this.state.service}
  planStatus={this.state.planStatus}
  // ... 15 more props
/>
```

### 7. Use Feature Component for Gating

```typescript
// ✅ Feature component + FeatureStatus
<Feature isActive={this.features.MY_FEATURE.isActive()}>
  <ExpensiveComponent />
</Feature>

// ❌ Raw conditional without Feature
{someCondition && <ExpensiveComponent />}
```

### 8. Clean Up in componentWillUnmount

```typescript
// ✅ Remove all listeners and subscriptions
componentWillUnmount = () => {
  window.removeEventListener('platformMessage', this.handleMessage as EventListener)
  window.removeEventListener('resize', this.handleResize)
  if (this.unsubscribeStore) this.unsubscribeStore()
}
```
