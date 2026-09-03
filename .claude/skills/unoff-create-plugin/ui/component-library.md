---
name: component-library
description: Entry point for @unoff/ui — installation, Core Imports, and the FeatureStatus/isBlocked permission pattern, plus a routing table to per-family component detail files (actions, forms, layout, feedback, css-classes). Use when building UI, choosing the right component, or understanding permission gating.
---

# UI Component Library (@unoff/ui)

## Overview

The plugin uses `@unoff/ui` as its primary UI component library — pre-built, styled, accessible components designed for Figma/Penpot plugins.

**Companion library**: `@unoff/utils` provides utility functions and TypeScript types (`doClassnames`, `FeatureStatus`).

**Local source**: The full library source (components, types, styles) is available locally in `node_modules/@unoff/ui/`. Consult the `.d.ts` type definitions there to verify prop names, types, and signatures when this reference or Storybook is insufficient.

## Installation

```bash
npm install @unoff/ui @unoff/utils
```

## Core Imports

```typescript
// Utilities
import { doClassnames, FeatureStatus } from '@unoff/utils'

// Components
import {
  ActionsList,
  Bar,
  Button,
  Card,
  Chip,
  Consent,
  ConsentConfiguration,
  Dialog,
  Dropdown,
  Feature,
  FormItem,
  Icon,
  IconChip,
  Input,
  Layout,
  List,
  Menu,
  Notification,
  Section,
  SectionTitle,
  SegmentedControl,
  SemanticMessage,
  SimpleItem,
  SimpleSlider,
  SortableList,
  Tabs,
  Tooltip,
  layouts,
  texts,
} from '@unoff/ui'
```

## Component Reference — Routing Table

The per-component prop reference (65% of this skill's content) lives in grouped detail files under `ui/components/`. Load the file matching what you're building — each answers "which component and how" for its family in one read.

| File | Components | Load when |
| --- | --- | --- |
| [components/actions.md](./components/actions.md) | `Button`, `Menu`, `ActionsList`, `Tabs`, `SimpleSlider`, `SegmentedControl` | Building buttons, menus, tab navigation, or sliders |
| [components/forms.md](./components/forms.md) | `Input`, `Dropdown`, `FormItem`, `Consent`, + a full composed example | Building forms, inputs, dropdowns, or consent dialogs |
| [components/layout.md](./components/layout.md) | `Bar`, `Feature`, `Layout`, `Section`, `SectionTitle`, `SimpleItem`, `Card`, `List`, `SortableList` | Building page structure, lists, or layout containers |
| [components/feedback.md](./components/feedback.md) | `Icon`, `Tooltip`, `Dialog`, `Chip`, `IconChip`, `SemanticMessage`, `Notification` | Building modals, toasts, tooltips, or status messages |
| [components/css-classes.md](./components/css-classes.md) | `layouts`, `texts` CSS modules | Styling with unoff-ui's CSS modules instead of custom CSS |

To go the other direction — from a Figma component name to its npm export — use [component-mapping.md](./component-mapping.md) instead; it is the canonical Figma ↔ npm ↔ Storybook lookup table.

## FeatureStatus — Permission Management

`FeatureStatus` manages feature access based on user subscription level, editor type, and service context. This is the only sanctioned way to gate UI — never hand-roll a plan check (see core.md's non-negotiables).

### Implementation Pattern

```typescript
import { FeatureStatus } from '@unoff/utils'
import type { PlanStatus, ConfigContextType, Service, Editor } from '../types'

class MyComponent extends PureComponent {
  // Define features as a static method
  static features = (
    planStatus: PlanStatus,
    config: ConfigContextType,
    service: Service,
    editor: Editor
  ) => ({
    EXPORT_PNG: new FeatureStatus({
      features: config.features,
      featureName: 'EXPORT_PNG',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    BATCH_EXPORT: new FeatureStatus({
      features: config.features,
      featureName: 'BATCH_EXPORT',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
  })

  // Private getter — declared right after `static features`, right before
  // `constructor`. Every call site reads `this.features.X`; never call
  // `MyComponent.features(...)` again elsewhere in the component.
  private get features() {
    return MyComponent.features(
      this.props.planStatus,
      this.props.config,
      this.props.service,
      this.props.editor
    )
  }

  render() {
    return (
      <div>
        {this.features.EXPORT_PNG.isActive() && <Button label="Export" />}
      </div>
    )
  }
}
```

### FeatureStatus Methods

```typescript
const feature = new FeatureStatus({ ... })

feature.isActive(): boolean               // enabled for user's plan
feature.isBlocked(): boolean               // user needs upgrade
feature.isReached(currentCount: number): boolean  // usage limit reached
feature.isNew(): boolean                   // has "new" badge
```

## Gotchas & Pitfalls

> **CRITICAL**: These are real issues encountered during development. AI agents MUST follow these rules to avoid broken implementations.

### 1. Component Names May Differ from Expectations

| ❌ Expected Name | ✅ Actual Name |
|---|---|
| `Slider` | `SimpleSlider` |
| `ListItem` | `SimpleItem` |
| `Modal` | `Dialog` |
| `OptionsList` / `DropdownList` | `ActionsList` |

### 1b. Menu `type` Values Are `"ICON"` and `"PRIMARY"`, Not `"PRIMARY"` and `"SECONDARY"`

```typescript
// ❌ WRONG
<Menu type="SECONDARY" />

// ✅ CORRECT
<Menu type="ICON" />    // icon-only trigger (default)
<Menu type="PRIMARY" /> // labeled button trigger
```

### 2. Section — No `children`, Use `body` and `title` Props

`Section` does **NOT** accept JSX children. See [components/layout.md](./components/layout.md#section) for the correct `body` and `title` prop pattern.

### 3. SimpleSlider — Non-Standard `onChange` Signature

`SimpleSlider.onChange` is `(feature: string, state: string, value: number) => void`, **NOT** a standard event handler. See [components/actions.md](./components/actions.md#simpleslider).

### 4. Dropdown — Option `action` Is a Closure, Not a Value Handler

Dropdown option `action` callbacks are `() => void` closures. They do NOT receive the selected value as an argument — each option must capture its own value in the closure.

```typescript
// ❌ WRONG — action does not receive the value
action: (value) => this.setState({ color: value })

// ✅ CORRECT — closure captures value
action: () => this.setState({ color: 'red' })
```

Also: `Dropdown` does **NOT** have a `parentClassName` prop.

### 5. Preact `TargetedEvent` — Use `e.currentTarget`, Not `e.target`

In Preact, `e.target` is typed as `EventTarget | null` (not narrowed to the element). Always use `e.currentTarget`. Applies to ALL event handlers: `onChange`, `onBlur`, `onInput`, `onValid`, etc.

```typescript
// ❌ WRONG
onChange={(e) => this.setState({ name: e.target.value })}

// ✅ CORRECT
onChange={(e) => this.setState({ name: e.currentTarget.value })}
```

### 6. Button — `action`, Not `onClick`

The click handler for `Button` is the `action` prop, not `onClick`. `isLoading`, `isBlocked`, `isNew` are boolean props (not state variants).

### 7. Always Verify Props Against Type Definitions

Before using any `unoff-ui` component, check the actual `.d.ts` type definitions or the [Storybook](https://ui.unoff.dev/) to verify prop names and types.

## Best Practices

```typescript
// ✅ Use FeatureStatus for feature checks — never manually check plan status.
// Read it through the `this.features` getter, not a repeated static call.
<Button isBlocked={this.features.MY_FEATURE.isBlocked()} />

// ✅ Include the `feature` prop for tracking/analytics
<Button feature="EXPORT_PNG" label="Export" />

// ✅ Always implement onUnblock for blocked buttons — give an upgrade path
<Button isBlocked onUnblock={() => sendPluginMessage({ pluginMessage: { type: 'GET_PRO' } }, '*')} />

// ✅ Use helper tooltips to guide users
<Input helper={{ label: 'Maximum 64 characters', pin: 'TOP' }} />

// ✅ Surface loading state on async actions
<Button isLoading={this.state.isLoading} label="Save" />
```

Theming and accessibility are handled by the library automatically (light/dark, keyboard nav, ARIA, focus management) — no per-component configuration needed. See [css-theming.md](./css-theming.md) and [accessibility.md](./accessibility.md) for the surrounding app-level patterns.

## Related Skills

- **[component-mapping.md](./component-mapping.md)** — Complete table mapping every Figma library component to its `@unoff/ui` export and Storybook story URL
- **[implement-design.md](../externals/implement-design.md)** — End-to-end workflow for translating a Figma spec document into production code
