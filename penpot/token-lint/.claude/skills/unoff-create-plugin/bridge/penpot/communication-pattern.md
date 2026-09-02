---
name: penpot-communication-pattern
description: Message-passing architecture between the UI (React) and Canvas (Penpot API) layers via penpot.ui.onMessage and penpot.ui.sendMessage. Use when wiring new actions, debugging UI-Canvas communication, or understanding the onMessage routing pattern on Penpot.
platform: penpot
---

# Communication Pattern: UI ↔ Canvas (Penpot)

## Overview

Penpot plugins share the same **two-context architecture** as Figma:
- **UI Context**: Runs in an iframe, has access to React, DOM, external APIs
- **Canvas Context**: Has access to Penpot Plugin API (`penpot.*`)

See [core.md](../../core.md) for the full Figma/Penpot platform-differences table (message functions, storage, resize, theme). The two mechanics unique to Penpot's wiring — the `msg.pluginMessage` unwrap and the dual-event UI proxy — are detailed below, since core.md states only the rule, not the shape.

## Architecture Diagram

```
UI (iframe) → dispatch 'pluginMessage' CustomEvent → proxy → parent.postMessage
Canvas: penpot.ui.onMessage((msg) => { path = msg.pluginMessage; actions[path.type]?.() })
Canvas → penpot.ui.sendMessage → proxy re-dispatches as 'platformMessage' CustomEvent → UI
```

See the numbered steps below for the actual code at each hop, and the proxy code right after.

## UI Bootstrap Proxy (src/app/index.tsx)

The proxy is already wired in the template. Do not touch it unless you understand the full flow.

```typescript
// Canvas → UI: incoming messages are wrapped into a CustomEvent
window.addEventListener('message', (event: MessageEvent) => {
  const pluginEvent = new CustomEvent('platformMessage', {
    detail: event.data.pluginMessage,
  })
  window.dispatchEvent(pluginEvent)
})

// UI → Canvas: outgoing messages go via a CustomEvent that the proxy forwards
window.addEventListener('pluginMessage', ((event: MessageEvent) => {
  if (event instanceof CustomEvent && window.parent !== window) {
    const { message, targetOrigin } = event.detail
    parent.postMessage(message, targetOrigin)
  }
}) as EventListener)
```

## Message Flow

### 1. UI → Canvas

**Sending from UI** (dispatch a `pluginMessage` CustomEvent, the proxy handles forwarding):

```typescript
// /src/app/utils/pluginMessage.ts
export const sendPluginMessage = (
  payload: { pluginMessage: { type: string; data?: any } },
  targetOrigin: string = '*'
) => {
  const event = new CustomEvent('pluginMessage', {
    detail: { message: payload, targetOrigin },
  })
  window.dispatchEvent(event)
}
```

**Usage in component**:

```typescript
sendPluginMessage({ pluginMessage: { type: 'CREATE_NODE', data: { ... } } })
```

### 2. Canvas Message Router

**File**: `/src/bridges/loadUI.ts`

```typescript
penpot.ui.onMessage(async (msg: any) => {
  const path = msg.pluginMessage  // always unwrap .pluginMessage

  const actions: { [key: string]: () => void } = {
    CREATE_NODE: async () => {
      const result = await createNode(path.data)
      penpot.ui.sendMessage({ type: 'NODE_CREATED', data: result })
    },
    // OPEN_IN_BROWSER: forward back to UI — Penpot has no native openExternal
    OPEN_IN_BROWSER: () =>
      penpot.ui.sendMessage({
        type: 'OPEN_IN_BROWSER',
        data: { url: path.data.url, isNewTab: true },
      }),
    DEFAULT: () => null,
  }

  try {
    return actions[path.type]?.()
  } catch {
    return actions['DEFAULT']?.()
  }
})
```

### 3. Canvas → UI

**Sending from Canvas**:

```typescript
penpot.ui.sendMessage({ type: 'NODE_CREATED', data: { id: node.id } })
```

**Receiving in UI component** (listen on `platformMessage`, not `message`):

```typescript
useEffect(() => {
  const handler = (event: Event) => {
    const msg = (event as CustomEvent).detail
    if (!msg) return
    if (msg.type === 'NODE_CREATED') setStatus('success')
  }
  window.addEventListener('platformMessage', handler)
  return () => window.removeEventListener('platformMessage', handler)
}, [])
```

## Canvas-only listeners

```typescript
penpot.on('themechange', () => {
  penpot.ui.sendMessage({
    type: 'SET_THEME',
    data: { theme: penpot.theme === 'light' ? 'penpot-light' : 'penpot-dark' },
  })
})
```

## Resize

Penpot does not support dynamic resize. The window size is set once at open time in `loadUI.ts`:

```typescript
penpot.ui.open(title, globalConfig.urls.uiUrl, {
  width: globalConfig.limits.width,
  height: globalConfig.limits.height,
})
```

If you need to support different sizes, expose them in `globalConfig.limits` and restart the plugin.

## Message Type Conventions

Naming follows [core.md](../../core.md): `CREATE_RECTANGLE` (UI → Canvas) / `RECTANGLE_CREATED` (Canvas → UI).

## Message Structure

```typescript
// Request (UI → Canvas) — wrapped by sendPluginMessage
{ pluginMessage: { type: string; data?: any } }

// On Canvas side, always unwrap:
const path = msg.pluginMessage
// path.type, path.data, path.items, ...

// Response (Canvas → UI) — sent via penpot.ui.sendMessage
{ type: string; data?: any }
// Received in UI as (event as CustomEvent).detail
```

## TypeScript Types

```typescript
// /src/app/types/messages.ts
export type UIMessage =
  | { type: 'CREATE_RECTANGLE'; data: RectangleConfig }
  | { type: 'LOAD_PREFERENCES' }

export type CanvasMessage =
  | { type: 'RECTANGLE_CREATED'; data: { id: string; name: string } }
  | { type: 'PREFERENCES_LOADED'; data: UserPreferences }
  | { type: 'OPEN_IN_BROWSER'; data: { url: string; isNewTab: boolean } }
  | { type: 'ERROR'; data: { error: string; originalType?: string } }
```

## Error Handling

```typescript
// Canvas
CREATE_NODE: async () => {
  try {
    const result = await createNode(path.data)
    penpot.ui.sendMessage({ type: 'NODE_CREATED', data: result })
  } catch (error) {
    penpot.ui.sendMessage({
      type: 'ERROR',
      data: { originalType: path.type, error: error.message },
    })
  }
}
```

## Debugging

```typescript
penpot.ui.onMessage(async (msg: any) => {
  const path = msg.pluginMessage
  console.log('📨 Received:', path.type, path.data)
  // ...
  console.log('✅ Processed:', path.type)
})
```
