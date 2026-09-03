---
name: figma-bridge-functions
description: Pure functions for Figma Canvas operations in the bridge layer. Use when creating bridge functions in src/bridges/, implementing canvas operations called from loadUI.ts, or understanding the action map pattern on Figma.
platform: figma
---

# Bridge Functions (Figma)

## Overview

Bridge functions are **pure functions** that interact with the Figma API (`figma.*`). They are called from the message router (`loadUI.ts`) and perform specific Canvas operations. A new action needs three more coordinated edits beyond the function itself — see [core.md](../../core.md) for the full four-point contract.

## Principles

1. **Single Responsibility**: Each bridge function does one thing
2. **Pure Functions**: No side effects, predictable outputs
3. **Type Safety**: Strong TypeScript typing
4. **Async-Aware**: Properly handle async Figma operations (`figma.clientStorage` is always async)

## File Organization

```
/src/bridges/
  loadUI.ts                 # Message router (entry point)
  checks/                   # Validation functions
    checkUserConsent.ts
    checkUserLicense.ts
    checkCredits.ts
  plans/                    # Subscription management
    enableTrial.ts
    payProPlan.ts
  nodes/                    # Node manipulation (create your own)
    createRectangle.ts
    createFrame.ts
  styles/                   # Style operations
    createColorStyle.ts
    applyTextStyle.ts
  data/                     # Data operations
    savePreferences.ts
    loadPreferences.ts
    saveNodeData.ts
```

## Storage: clientStorage (async)

```typescript
// Write
await figma.clientStorage.setAsync('key', value)         // any serializable value
await figma.clientStorage.setAsync('plugin_window_width', 320)

// Read
const value = await figma.clientStorage.getAsync('key')  // returns undefined if missing
const width = await figma.clientStorage.getAsync('plugin_window_width') ?? 320
```

Storage is **per-plugin, per-user, per-device**. It persists across plugin runs.

## Bridge Function Template

```typescript
// /src/bridges/nodes/createRectangle.ts

export interface CreateRectangleConfig {
  x: number
  y: number
  width: number
  height: number
  color: RGB
  cornerRadius?: number
  name?: string
}

export const createRectangle = async (
  config: CreateRectangleConfig
): Promise<{ id: string; name: string }> => {
  if (config.width <= 0 || config.height <= 0)
    throw new Error('Width and height must be positive')

  const rect = figma.createRectangle()
  rect.x = config.x
  rect.y = config.y
  rect.resize(config.width, config.height)
  rect.fills = [{ type: 'SOLID', color: config.color }]

  if (config.cornerRadius) rect.cornerRadius = config.cornerRadius
  if (config.name) rect.name = config.name

  figma.currentPage.appendChild(rect)
  return { id: rect.id, name: rect.name }
}
```

## Common Bridge Patterns

### Node Creation

```typescript
export const createFrame = async (config: CreateFrameConfig): Promise<FrameNode> => {
  const frame = figma.createFrame()
  frame.name = config.name
  frame.resize(config.width, config.height)

  if (config.layoutMode) {
    frame.layoutMode = config.layoutMode
    frame.primaryAxisSizingMode = 'AUTO'
    frame.counterAxisSizingMode = 'AUTO'
    if (config.padding) {
      frame.paddingLeft = frame.paddingRight =
        frame.paddingTop = frame.paddingBottom = config.padding
    }
    if (config.gap) frame.itemSpacing = config.gap
  }

  figma.currentPage.appendChild(frame)
  return frame
}
```

### Selection

```typescript
export const getSelection = (): SelectionInfo => ({
  count: figma.currentPage.selection.length,
  nodes: figma.currentPage.selection.map(n => ({ id: n.id, name: n.name, type: n.type })),
})

export const updateSelection = (nodeIds: string[]): boolean => {
  const nodes = nodeIds
    .map(id => figma.getNodeById(id) as SceneNode)
    .filter(Boolean)
  if (!nodes.length) return false
  figma.currentPage.selection = nodes
  figma.viewport.scrollAndZoomIntoView(nodes)
  return true
}
```

### Data Storage (Preferences)

```typescript
export const savePreferences = async (prefs: UserPreferences): Promise<boolean> => {
  try {
    await figma.clientStorage.setAsync('preferences', prefs)
    return true
  } catch {
    return false
  }
}

export const loadPreferences = async (): Promise<UserPreferences | null> => {
  try {
    return (await figma.clientStorage.getAsync('preferences')) ?? null
  } catch {
    return null
  }
}
```

### Node Plugin Data

```typescript
export const saveNodeData = (nodeId: string, key: string, value: unknown): boolean => {
  const node = figma.getNodeById(nodeId)
  if (!node) return false
  node.setPluginData(key, typeof value === 'string' ? value : JSON.stringify(value))
  return true
}
```

### Validation Checks

```typescript
export const checkUserConsent = async (): Promise<ConsentStatus | null> => {
  const consent = await figma.clientStorage.getAsync('consent')
  return consent ?? null
}

export const checkUserLicense = async (): Promise<LicenseStatus> => {
  const license = await figma.clientStorage.getAsync('license')
  if (!license || (license.expiresAt && license.expiresAt < Date.now()))
    return { isValid: false, tier: 'free' }
  return { isValid: true, tier: license.tier, expiresAt: license.expiresAt }
}
```

### Style Operations

```typescript
export const createColorStyle = (config: ColorStyleConfig): { id: string; name: string } => {
  const style = figma.createPaintStyle()
  style.name = config.name
  style.paints = [{ type: 'SOLID', color: config.color }]
  if (config.description) style.description = config.description
  return { id: style.id, name: style.name }
}
```

## Integration with loadUI.ts

The action map entry and the `figma.ui.postMessage` response are two of the four points in the message contract (see [core.md](../../core.md)):

```typescript
import { createRectangle } from './nodes/createRectangle'
import { getSelection } from './selection/getSelection'
import { savePreferences, loadPreferences } from './data'

figma.ui.onmessage = async (msg) => {
  const actions: { [key: string]: () => void | Promise<void> } = {
    CREATE_RECTANGLE: async () => {
      const result = await createRectangle(msg.data)
      figma.ui.postMessage({ type: 'RECTANGLE_CREATED', data: result })
    },
    GET_SELECTION: () => {
      figma.ui.postMessage({ type: 'SELECTION_LOADED', data: getSelection() })
    },
    SAVE_PREFERENCES: async () => {
      const success = await savePreferences(msg.data)
      figma.ui.postMessage({ type: 'PREFERENCES_SAVED', data: { success } })
    },
    LOAD_PREFERENCES: async () => {
      figma.ui.postMessage({ type: 'PREFERENCES_LOADED', data: await loadPreferences() })
    },
  }
  try {
    return actions[msg.type]?.()
  } catch {
    return actions['DEFAULT']?.()
  }
}
```

## Best Practices

```typescript
// ✅ Strong typing
export interface Config { name: string; size: number }
export const createNode = (config: Config): SceneNode => { ... }

// ✅ Validate before processing
export const resizeNode = (nodeId: string, width: number, height: number) => {
  if (width <= 0 || height <= 0) throw new Error('Dimensions must be positive')
  const node = figma.getNodeById(nodeId)
  if (!node) throw new Error(`Node ${nodeId} not found`)
  if (!('resize' in node)) throw new Error(`Node ${nodeId} cannot be resized`)
  node.resize(width, height)
}

// ✅ Return useful structured data
export const createCard = async (): Promise<{ id: string; childIds: string[] }> => {
  const card = figma.createFrame()
  const title = figma.createText()
  card.appendChild(title)
  return { id: card.id, childIds: [title.id] }
}
```

## Testing Bridge Functions

```typescript
const mockFigma = {
  createRectangle: () => ({
    id: 'test-id', name: 'Rectangle', x: 0, y: 0,
    resize: jest.fn(), fills: [],
  }),
  currentPage: { appendChild: jest.fn() },
}

describe('createRectangle', () => {
  it('creates rectangle with correct properties', async () => {
    global.figma = mockFigma
    const result = await createRectangle({ x: 0, y: 0, width: 100, height: 50, color: { r: 1, g: 0, b: 0 } })
    expect(result.id).toBe('test-id')
  })
})
```
