---
name: figma-communication-pattern
description: Message-passing architecture between the UI (React) and Canvas (Figma API) layers via parent.postMessage and figma.ui.postMessage. Use when wiring new actions, debugging UI-Canvas communication, or understanding the onmessage routing pattern on Figma.
platform: figma
---

# Communication Pattern: UI ↔ Canvas (Figma)

## Overview

Figma plugins have a **two-context architecture**:
- **UI Context**: Runs in an iframe, has access to React, DOM, external APIs
- **Canvas Context**: Has access to Figma Plugin API (`figma.*`)

These contexts communicate through **message passing**. See [core.md](../../core.md) for the four-point contract every new action must satisfy.

## Architecture Diagram

```
UI (iframe, /src/app/) → parent.postMessage → Canvas (/src/bridges/)
Canvas: figma.ui.onmessage = async (msg) => actions[msg.type]?.()
Canvas → figma.ui.postMessage → UI: window.addEventListener('message', ...)
```

See the numbered steps below for the actual code at each hop.

## Message Flow

### 1. UI → Canvas

**Sending from UI** (`/src/app/utils/pluginMessage.ts`):

```typescript
export const sendPluginMessage = (
  payload: { pluginMessage: { type: string; data?: any } },
  targetOrigin: string = '*'
) => {
  parent.postMessage(payload, targetOrigin)
}
```

**Usage in component**:

```typescript
sendPluginMessage({ pluginMessage: { type: 'CREATE_NODE', data: { ... } } })
```

### 2. Canvas Message Router

**File**: `/src/bridges/loadUI.ts`

```typescript
figma.ui.onmessage = async (msg) => {
  const actions: { [key: string]: () => void | Promise<void> } = {
    CREATE_NODE: async () => {
      const result = await createNode(msg.data)
      figma.ui.postMessage({ type: 'NODE_CREATED', data: result })
    },
    OPEN_IN_BROWSER: () => figma.openExternal(msg.data.url),
    DEFAULT: () => null,
  }
  try {
    return actions[msg.type]?.()
  } catch {
    return actions['DEFAULT']?.()
  }
}
```

### 3. Canvas → UI

**Sending from Canvas**:

```typescript
figma.ui.postMessage({ type: 'NODE_CREATED', data: { id: node.id } })
```

**Receiving in UI component**:

```typescript
useEffect(() => {
  const handler = (event: MessageEvent) => {
    const msg = event.data.pluginMessage
    if (!msg) return
    if (msg.type === 'NODE_CREATED') setStatus('success')
  }
  window.addEventListener('message', handler)
  return () => window.removeEventListener('message', handler)
}, [])
```

## Canvas-only listeners

```typescript
// Triggered by Figma events, not by UI messages
figma.on('selectionchange', () => {
  figma.ui.postMessage({
    type: 'SELECTION_CHANGED',
    data: { count: figma.currentPage.selection.length },
  })
})
```

## Resize

```typescript
// Canvas side
RESIZE_UI: async () => {
  await figma.clientStorage.setAsync('plugin_window_width', msg.data.width)
  await figma.clientStorage.setAsync('plugin_window_height', msg.data.height)
  figma.ui.resize(msg.data.width, msg.data.height)
},
```

## Message Type Conventions

Naming follows [core.md](../../core.md): `CREATE_RECTANGLE` (UI → Canvas) / `RECTANGLE_CREATED` (Canvas → UI).

## Message Structure

```typescript
// Request (UI → Canvas)
{ type: string; data?: any }

// Response (Canvas → UI)
{ type: string; data?: any; error?: string }
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
  | { type: 'ERROR'; data: { error: string; originalType?: string } }
```

## Error Handling

```typescript
// Canvas
CREATE_NODE: async () => {
  try {
    const node = await createNode(msg.data)
    figma.ui.postMessage({ type: 'NODE_CREATED', data: { id: node.id } })
  } catch (error) {
    figma.ui.postMessage({ type: 'ERROR', data: { originalType: msg.type, error: error.message } })
    figma.notify(error.message, { error: true })
  }
}
```

## Debugging

```typescript
figma.ui.onmessage = async (msg) => {
  console.log('📨 Received:', msg.type, msg.data)
  // ...
  console.log('✅ Processed:', msg.type)
}
```
