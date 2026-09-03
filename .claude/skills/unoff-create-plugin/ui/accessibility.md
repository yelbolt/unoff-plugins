---
name: accessibility
description: Accessibility patterns for the plugin UI including focus trapping with the inert attribute, portal layering (#app/#modal/#toast), keyboard navigation, and ARIA. Use when building modal dialogs, toasts, interactive components, or reviewing a11y compliance.
---

# Accessibility Patterns

## Overview

The plugin runs inside Figma's iframe, which imposes constraints on accessibility. The codebase uses a combination of the `inert` HTML attribute for modal focus trapping, `@unoff/ui` components that follow Figma's native UI patterns (which handle basic ARIA internally), keyboard-driven event handling, and the `Feature` component for conditional rendering. This document covers the accessibility patterns present in the template and guidance for maintaining them.

## When to Use

- Building new UI components
- Adding modal dialogs
- Implementing keyboard interactions
- Ensuring screen reader compatibility within Figma's iframe
- Understanding the constraints of plugin accessibility

## Figma Plugin Accessibility Constraints

Figma plugins run inside a sandboxed `<iframe>`. This means:

1. **No access to the parent Figma UI** — you cannot control Figma's focus or ARIA tree
2. **Limited keyboard events** — some key combinations are intercepted by Figma
3. **No native dialog element** — use `createPortal` to `#modal` div instead
4. **User-select disabled** — `user-select: none` is set on `#app` to match Figma's behavior
5. **Screen readers** — Limited effectiveness since plugins are iframed; focus on keyboard navigability

## Modal Focus Management

### The `inert` Attribute

The primary accessibility mechanism for modals is the HTML `inert` attribute on the main content:

```tsx
// App.tsx render()
<main
  className="ui"
  inert={this.state.modalContext !== 'EMPTY' || this.state.mustUserConsent}
>
  {/* Main content becomes non-interactive when modal/consent is open */}
</main>
```

When `inert` is set:
- All content in `<main>` becomes non-focusable and non-interactive
- Screen readers skip inert content
- Click events are ignored
- Tab navigation skips inert elements

This is the **native HTML approach** to focus trapping — no need for manual focus trap libraries.

### Portal Layering

Modals and toasts render outside `<main>` via `createPortal`, so they remain interactive when main content is inert:

```html
<!-- index.html -->
<div id="app"></div>   <!-- main content (gets inert) -->
<div id="modal"></div> <!-- modals render here (z-index: 2) -->
<div id="toast"></div> <!-- notifications render here (z-index: 3) -->
```

```tsx
// App.tsx
{createPortal(
  <Modal
    context={this.state.modalContext}
    onClose={() => this.setState({ modalContext: 'EMPTY' })}
    // ...
  />,
  document.getElementById('modal') ?? document.createElement('app')
)}
```

### Modal Close Patterns

All modals support closing via:

1. **Close button** — `onClose` callback passed as prop
2. **Dialog component** — unoff-ui's `Dialog` component provides built-in close behavior
3. **Consent dismissal** — `Consent` component has `canBeClosed` + `closeLabel` props

```tsx
<Consent
  canBeClosed
  closeLabel={this.props.t('user.cookies.close')}
  onClose={() => this.setState({ mustUserConsent: false })}
  // ...
/>
```

## Component Accessibility

### unoff-ui Components

The `@unoff/ui` component library provides accessible primitives that follow Figma's design conventions:

| Component | Accessibility Features |
|---|---|
| `Button` | Clickable, supports `type="icon"` with icon name as implicit label |
| `Input` | Label association, placeholder text |
| `Dropdown` | Keyboard navigable select behavior |
| `Menu` | Menu role behavior with item selection |
| `Tabs` | Tab list navigation with `active` indicator |
| `Dialog` | Modal dialog pattern with title and actions |
| `Consent` | Structured consent form with toggle controls |
| `SemanticMessage` | Alert-style message with actions |

### Feature Component (Conditional Rendering)

The `Feature` component cleanly removes inactive content from the DOM — it doesn't just hide it visually:

```tsx
<Feature isActive={someCondition}>
  <ExpensiveComponent />
</Feature>
```

When `isActive` is `false`, children are not rendered at all. This means:
- Screen readers don't encounter hidden content
- Tab navigation skips removed elements
- No confusing visually-hidden but focusable elements

### Tabs Navigation

Tabs use event delegation via `data-feature` attribute:

```tsx
navHandler = (e: Event) =>
  this.setState({
    context: (e.currentTarget as HTMLElement).dataset.feature as Context,
  })

<Tabs
  tabs={this.contexts}
  active={this.state.context ?? ''}
  action={this.navHandler}
/>
```

The unoff-ui `Tabs` component handles the tab list pattern. The `active` prop marks the currently selected tab.

## Keyboard Interactions

### Window Resize via Mouse

The plugin supports drag-to-resize via the grip in the bottom corner. This uses `mousedown`/`mousemove`/`mouseup` events:

```typescript
// Shortcuts.tsx
onHold = (e: MouseEvent) => {
  window.onmousemove = (e) => this.onResize(e, shiftX, shiftY)
  window.onmouseup = this.onRelease
}
```

Double-click resets to default size:

```typescript
onDoubleClick = () => {
  sendPluginMessage({
    pluginMessage: {
      type: 'RESIZE_UI',
      data: {
        width: this.props.config.limits.minWidth,
        height: this.props.config.limits.minHeight,
      },
    },
  }, '*')
}
```

### External Link Handling

Links open in the system browser via `OPEN_IN_BROWSER` message, which calls `figma.openExternal()` on the Canvas side or `window.open()` on the UI side:

```typescript
const openInBrowser = () => {
  window.open(path.data.url, !path.data.isNewTab ? '_self' : '_blank')?.focus()
}
```

## Internationalization as Accessibility

The i18n system directly supports accessibility by:

1. **Browser language detection** — Suggests switching to the user's browser language:

```tsx
<Feature
  isActive={
    this.features.USER_LANGUAGE_SUGGESTION.isActive() &&
    this.state.isSuggestedLanguageDisplayed &&
    this.state.suggestedLanguage !== null
  }
>
  <SemanticMessage
    type="INFO"
    message={this.getSuggestedLanguageMessage()}
    actionsSlot={
      <>
        <Button
          type="secondary"
          label={this.getSuggestedLanguageCta()}
          action={this.acceptSuggestedLanguageHandler}
        />
        <Button
          type="icon"
          icon="close"
          action={this.onDismissLanguageBannerHandler}
        />
      </>
    }
    isAnchored
  />
</Feature>
```

2. **Translated UI** — All visible text uses `t('key')` for screen reader compatibility
3. **ICU message format** — Proper pluralization in all supported languages

## User Consent Accessibility

The consent dialog blocks interaction with the main UI and provides clear actions:

```tsx
<Consent
  welcomeMessage={t('user.cookies.welcome', { pluginName: ... })}
  vendorsMessage={t('user.cookies.vendors')}
  privacyPolicy={{
    label: t('user.cookies.privacyPolicy'),
    action: () => { /* open URL */ },
  }}
  consentActions={{
    consent: { label: t('user.cookies.consent'), action: handler },
    deny: { label: t('user.cookies.deny'), action: handler },
    save: { label: t('user.cookies.save'), action: handler },
  }}
  canBeClosed
  closeLabel={t('user.cookies.close')}
  onClose={() => this.setState({ mustUserConsent: false })}
/>
```

Three clear action paths: consent all, deny all, or customize and save.

## Notification Accessibility

Toast notifications use the `SemanticMessage` component with severity types:

```typescript
export interface NotificationMessage {
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
  message: string
  timer?: number
}
```

- Rendered via portal into `#toast` (z-index: 3, above everything)
- Auto-dismiss with configurable timer
- Different visual treatment per severity type

## Responsive Accessibility

The `documentWidth` breakpoint at 460px adapts layouts for narrow plugin windows:

```typescript
// Column layout on narrow, row on wide
this.props.documentWidth <= 460 ? 'column' : 'row'

// Adjust padding
if (this.props.documentWidth > 460) padding = 'var(--size-null)'

// Full height on narrow
isFullHeight={this.props.documentWidth <= 460}
```

This ensures content remains usable regardless of plugin window size.

## Best Practices

✅ Use `inert` on `<main>` when modals are open — native focus trapping  
✅ Render modals via `createPortal` into `#modal` or `#toast`  
✅ Use `Feature` component to remove (not hide) inactive content  
✅ Use unoff-ui components — they follow Figma's UI conventions  
✅ All user-facing text must use `t('key')` — never hardcode strings  
✅ Provide all three consent actions (consent/deny/save) for user choice  
✅ Support both narrow (≤460px) and wide (>460px) plugin layouts  

## What to Avoid

❌ Don't use `display: none` or `visibility: hidden` to conditionally hide interactive elements  
❌ Don't use custom focus trap implementations — `inert` is the standard approach  
❌ Don't intercept keyboard shortcuts that Figma uses (Cmd+Z, etc.)  
❌ Don't rely on hover-only interactions — plugin UI may be used with keyboard  
❌ Don't hardcode text strings — use the i18n system for screen reader compatibility  
❌ Don't add `tabindex="-1"` unnecessarily — let `inert` handle focus management  
