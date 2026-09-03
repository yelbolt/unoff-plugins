---
name: css-theming
description: Theme system via data-theme and data-mode attributes, CSS custom properties, unoff-ui CSS modules (layouts, texts), and responsive layout via documentWidth breakpoints. Window resize (RESIZE_UI + figma.ui.resize) is Figma-only — Penpot uses a fixed size set at open time. Use when styling components, handling light/dark mode, managing z-index layers, or working with the resize grip.
---

# CSS Architecture & Theming

## Overview

The plugin uses a multi-platform theming system driven by `data-theme` and `data-mode` HTML attributes. Styles come from three sources: `@unoff/ui` CSS modules (layouts, texts, component styles), custom `app.css` for app-level layout, and CSS custom properties provided by the design system. The `ThemeContext` manages theme state and attribute synchronization.

## When to Use

- Styling new components
- Supporting multiple platforms (Figma, Penpot, Sketch, Framer)
- Understanding the theme/mode system
- Working with CSS custom properties
- Responsive layout patterns

## Theme System

### ThemeContext

```typescript
// config/ThemeContext.tsx
export type Theme = 'figma' | 'penpot' | 'sketch' | 'framer'
export type Mode =
  | 'figma-light'
  | 'figma-dark'
  | 'figjam'
  | 'penpot-light'
  | 'penpot-dark'
  | 'sketch-light'
  | 'sketch-dark'
  | 'framer-light'
  | 'framer-dark'
```

The `ThemeProvider` sets two HTML attributes on `<html>`:

```typescript
export const ThemeProvider = ({ theme, mode, children }: ThemeProviderProps) => {
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-mode', mode)
  }, [theme, mode])

  return (
    <ThemeContext.Provider value={{ theme, mode }}>
      {children}
    </ThemeContext.Provider>
  )
}
```

### Theme Flow

```
Canvas detects editorType
  → sends SET_THEME message with colorMode
  → App.tsx handleMessage sets data-mode attribute
  → globalConfig.env.ui determines data-theme
  → ThemeProvider syncs both to <html> on mount
  → CSS selectors :root[data-theme] and :root[data-mode] activate
```

### data-theme vs data-mode

| Attribute | Values | Purpose |
|---|---|---|
| `data-theme` | `figma`, `penpot`, `sketch`, `framer` | Platform identity — controls the UI variant |
| `data-mode` | `figma-light`, `figma-dark`, `figjam`, etc. | Color mode — controls light/dark colors |

Components can read the theme directly:

```typescript
// In constructor or componentDidMount
this.theme = document.documentElement.getAttribute('data-theme')
```

Or via the hook:

```typescript
const { theme, mode } = useTheme()
```

## CSS Sources

### 1. unoff-ui CSS Modules

The primary styling comes from `@unoff/ui` which exports CSS module objects:

```typescript
import { layouts, texts } from '@unoff/ui'
```

#### Layout Classes

```typescript
layouts.centered       // Flexbox centered content
layouts['snackbar']    // Horizontal bar layout
layouts['snackbar--tight']  // Tight spacing variant
```

#### Text Classes

```typescript
texts.type                  // Base text style
texts['type--secondary']    // Secondary (muted) text
texts['type--truncated']    // Ellipsis overflow
```

#### Using doClassnames

The `doClassnames` utility from `@unoff/utils` combines class names conditionally:

```typescript
import { doClassnames } from '@unoff/utils'

className={doClassnames([
  texts.type,
  texts['type--secondary'],
  texts['type--truncated'],
  layouts['snackbar--tight'],
])}
```

This is similar to `classnames()` — it joins an array of strings, filtering out falsy values.

### 2. App-Level CSS (app.css)

Custom styles in `src/app/ui/stylesheets/app.css`:

```css
/* Root layout */
html, body {
  margin: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* Disable text selection in plugin UI */
div#app {
  width: 100%;
  height: 100%;
  user-select: none;
  -webkit-user-select: none;
}

/* Z-index layers */
div#ui    { z-index: 1; }
div#modal { z-index: 2; }
div#toast { z-index: 3; }

/* Main layout */
main {
  display: flex;
  flex-direction: column;
  height: inherit;
}

/* Context sections */
section.context {
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}
```

### 3. Platform-Scoped Background Colors

```css
:root[data-theme='figma'] #app {
  background-color: var(--figma-color-bg);
}
:root[data-theme='penpot'] #app {
  background-color: var(--penpot-color-background-primary);
}
:root[data-theme='sketch'] #app {
  background-color: var(--sketch-color-background-primary);
}
:root[data-theme='framer'] #app {
  background-color: var(--framer-color-bg);
}
```

Each platform provides its own CSS custom properties. The `data-theme` scoping ensures only the correct platform's styles apply.

### 4. Custom CSS Plugin (excludeUnwantedCssPlugin)

The Vite build automatically strips CSS from other platforms:

```typescript
// vite.config.ts
const excludePattern =
  /figma-colors|penpot-colors|penpot-types|sketch-colors|sketch-types\.css$/
```

When building a Figma plugin, CSS for Penpot, Sketch, etc. is replaced with empty modules. This keeps the bundle minimal.

## CSS Custom Properties

The design system provides sizing and color tokens as CSS variables:

### Sizing Tokens

```css
var(--size-null)           /* 0px */
var(--size-pos-xxxsmall)   /* 2px */
var(--size-pos-xxsmall)    /* 4px */
var(--size-pos-xsmall)     /* 8px */
var(--size-pos-small)      /* 12px */
var(--size-pos-medium)     /* 16px */
var(--size-pos-large)      /* 24px */
var(--size-pos-xlarge)     /* 32px */
```

### Border Tokens

```css
var(--border-radius-full)  /* Fully rounded */
```

### Platform Color Tokens

Figma provides its own tokens (e.g. `--figma-color-bg`, `--figma-color-text`). These are injected by the Figma runtime and match the user's Figma theme.

## Platform-Conditional Rendering

Components adapt their rendering based on the current theme/platform:

```typescript
// MyService.tsx / MyFirstContext.tsx render()
switch (this.theme) {
  case 'figma':
    isFlex = false
    padding = 'var(--size-null) var(--size-pos-xsmall)'
    break
  case 'penpot':
    isFlex = true
    padding = 'var(--size-null) var(--size-pos-xsmall)'
    break
  case 'sketch':
    isFlex = false
    break
  case 'framer':
    isFlex = true
    break
}
```

This pattern is used in `MyService`, `MyFirstContext`, `Shortcuts`, and other components to adjust layout parameters (flex vs fixed tabs, padding, border radius) per platform.

## Responsive Layout

### documentWidth Pattern

The `App` component tracks the viewport width and passes it through `BaseProps`:

```typescript
// App.tsx
handleResize = () => {
  this.setState({
    documentWidth: document.documentElement.clientWidth,
  })
}

componentDidMount = async () => {
  window.addEventListener('resize', this.handleResize)
}
```

Components use `documentWidth` for responsive breakpoints:

```typescript
// MyFirstContext.tsx - wider layout at 460px+
if (this.props.documentWidth > 460) padding = 'var(--size-null)'

// Pricing.tsx - column vs row layout
this.props.documentWidth <= 460 ? 'column' : 'row'

// Preferences.tsx - full height on narrow screens
isFullHeight={this.props.documentWidth <= 460}
```

### Plugin Window Resizing

> **Figma only** — Penpot does not support dynamic window resize. The window size is fixed at `penpot.ui.open()` time via `globalConfig.limits`. The `RESIZE_UI` message type and the `Shortcuts` drag grip should be disabled or removed when building for Penpot.

The plugin supports user-driven window resize via a drag grip in the bottom-right corner:

```typescript
// Shortcuts.tsx
onHold = (e: MouseEvent) => {
  window.onmousemove = (e) => this.onResize(e, shiftX, shiftY)
  window.onmouseup = this.onRelease
}

onResize = (e: MouseEvent, shiftX: number, shiftY: number) => {
  // Calculate new size with min constraints from config.limits
  if (scaleX > this.props.config.limits.minWidth) windowSize.w = scaleX
  else windowSize.w = this.props.config.limits.minWidth

  sendPluginMessage({
    pluginMessage: {
      type: 'RESIZE_UI',
      data: { width: windowSize.w, height: windowSize.h },
    },
  }, '*')
}
```

The Canvas side processes `RESIZE_UI` (Figma only):

```typescript
// loadUI.ts (Figma)
RESIZE_UI: async () => {
  await figma.clientStorage.setAsync('plugin_window_width', path.data.width)
  await figma.clientStorage.setAsync('plugin_window_height', path.data.height)
  figma.ui.resize(path.data.width, path.data.height)
}
```

Size limits come from `globalConfig.limits`:
- `minWidth` / `minHeight` — Minimum resize dimensions
- `width` / `height` — Default dimensions (used as fixed size on Penpot)

## Z-Index Architecture

```
Layer 3 — #toast   (notification banners)
Layer 2 — #modal   (dialogs, consent, announcements)
Layer 1 — #ui      (main application)
```

Portals render into `#modal` and `#toast` divs defined in `index.html`:

```html
<div id="app"></div>
<div id="modal"></div>
<div id="toast"></div>
```

The `inert` attribute on `<main>` disables interaction when modals are open:

```tsx
<main inert={this.state.modalContext !== 'EMPTY' || this.state.mustUserConsent}>
```

## Styling Conventions

### Import Order

CSS imports follow the ESLint `import/order` rule — CSS files go last:

```typescript
import React from 'react'
import { PureComponent } from 'preact/compat'
import { Button, layouts, texts } from '@unoff/ui'
import { doClassnames } from '@unoff/utils'
import './stylesheets/app.css'  // CSS last
```

### Inline Styles for Dynamic Values

When values depend on runtime state (theme, documentWidth), use inline `style`:

```tsx
<div style={{ padding: padding }}>
```

### CSS Classes for Static Styles

Use CSS modules from unoff-ui or custom CSS for static styles:

```tsx
<section className="context">
<div className={doClassnames([texts.type, texts['type--secondary']])}>
```

### Prettier CSS Ordering

The `.prettierrc.json` includes `prettier-plugin-css-order` which automatically sorts CSS properties in a consistent order.

## Best Practices

✅ Use `data-theme` selectors for platform-specific styling  
✅ Use unoff-ui's `layouts` and `texts` CSS modules — don't reinvent  
✅ Use `doClassnames()` for conditional class composition  
✅ Use CSS custom properties (`var(--size-*)`) for spacing  
✅ Track `documentWidth` via `BaseProps` for responsive breakpoints  
✅ Use the `inert` attribute to disable interaction behind modals  

## What to Avoid

❌ Don't hardcode colors — use platform CSS variables (`--figma-color-*`)  
❌ Don't use `px` for spacing — use CSS custom property tokens  
❌ Don't create platform-specific CSS files — use `data-theme` scoping  
❌ Don't set `z-index` arbitrarily — follow the 3-layer architecture (ui/modal/toast)  
❌ Don't use `display: none` for feature gating — use the `Feature` component  
❌ Don't forget `-webkit-user-select: none` for Safari/WebKit in Figma's iframe  
