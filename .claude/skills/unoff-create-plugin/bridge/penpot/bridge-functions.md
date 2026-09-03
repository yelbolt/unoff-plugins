---
name: penpot-bridge-functions
description: Pure functions for Penpot Canvas operations in the bridge layer. Use when creating bridge functions in src/bridges/, implementing canvas operations called from loadUI.ts, or understanding the action map pattern on Penpot.
platform: penpot
---

# Bridge Functions (Penpot)

## Overview

Bridge functions are **pure functions** that interact with the Penpot API (`penpot.*`). They are called from the message router (`loadUI.ts`). A new action needs three more coordinated edits beyond the function itself — see [core.md](../../core.md) for the full four-point contract and the Figma/Penpot platform-differences table (storage, current user, resize, etc.).

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
  shapes/                   # Shape manipulation (create your own)
    createRectangle.ts
    createFrame.ts
  data/                     # Data operations
    savePreferences.ts
    loadPreferences.ts
```

## Storage: penpot.localStorage (synchronous, string-only)

```typescript
// Write — always stringify objects/booleans/numbers
penpot.localStorage.setItem('key', 'string_value')
penpot.localStorage.setItem('count', String(42))
penpot.localStorage.setItem('prefs', JSON.stringify({ theme: 'dark' }))

// Read — always returns string | null
const raw = penpot.localStorage.getItem('key')         // string | null
const count = Number(penpot.localStorage.getItem('count') ?? '0')
const prefs = JSON.parse(penpot.localStorage.getItem('prefs') ?? 'null')

// Delete — set to empty string (no removeItem)
penpot.localStorage.setItem('key', '')
```

Storage is **per-plugin, per-user**. It persists across plugin runs.

## Bridge Function Template

```typescript
// /src/bridges/shapes/createRectangle.ts

export interface CreateRectangleConfig {
  x: number
  y: number
  width: number
  height: number
  name?: string
}

export const createRectangle = (
  config: CreateRectangleConfig
): { id: string; name: string } => {
  if (config.width <= 0 || config.height <= 0)
    throw new Error('Width and height must be positive')

  const rect = penpot.createRectangle()
  rect.x = config.x
  rect.y = config.y
  rect.width = config.width
  rect.height = config.height
  if (config.name) rect.name = config.name

  return { id: rect.id, name: rect.name }
}
```

## Common Bridge Patterns

### Shape Creation

```typescript
export const createFrame = (config: CreateFrameConfig): { id: string; name: string } => {
  const frame = penpot.createFrame()
  frame.name = config.name
  frame.width = config.width
  frame.height = config.height
  if (config.x !== undefined) frame.x = config.x
  if (config.y !== undefined) frame.y = config.y
  return { id: frame.id, name: frame.name }
}
```

### Selection

```typescript
export const getSelection = (): SelectionInfo => ({
  count: penpot.selection.length,
  shapes: penpot.selection.map(s => ({ id: s.id, name: s.name, type: s.type })),
})
```

### Data Storage (Preferences)

```typescript
export const savePreferences = (prefs: UserPreferences): boolean => {
  try {
    penpot.localStorage.setItem('preferences', JSON.stringify(prefs))
    return true
  } catch {
    return false
  }
}

export const loadPreferences = (): UserPreferences | null => {
  try {
    const raw = penpot.localStorage.getItem('preferences')
    return raw ? (JSON.parse(raw) as UserPreferences) : null
  } catch {
    return null
  }
}
```

### Token Storage (Auth)

```typescript
// Saving tokens
penpot.localStorage.setItem('supabase_access_token', accessToken)
penpot.localStorage.setItem('supabase_refresh_token', refreshToken)

// Reading tokens
const accessToken = penpot.localStorage.getItem('supabase_access_token') ?? undefined
const refreshToken = penpot.localStorage.getItem('supabase_refresh_token') ?? undefined
```

### Validation Checks

```typescript
export const checkUserConsent = (userConsent: unknown): Promise<void> => {
  // Read from localStorage (synchronous)
  const raw = penpot.localStorage.getItem('user_consent')
  const stored = raw ? JSON.parse(raw) : null
  // ...validation logic
  return Promise.resolve()
}

export const checkUserLicense = (): Promise<void> => {
  const raw = penpot.localStorage.getItem('license')
  const license = raw ? JSON.parse(raw) : null
  // ...validation logic
  return Promise.resolve()
}
```

### Iterating Over Multiple Items

```typescript
// SET_ITEMS — canvas side
SET_ITEMS: () => {
  path.items.forEach((item: { key: string; value: unknown }) => {
    if (typeof item.value === 'object')
      penpot.localStorage.setItem(item.key, JSON.stringify(item.value))
    else if (typeof item.value === 'boolean' || typeof item.value === 'number')
      penpot.localStorage.setItem(item.key, item.value.toString())
    else
      penpot.localStorage.setItem(item.key, item.value as string)
  })
},

// GET_ITEMS — canvas side
GET_ITEMS: async () =>
  path.items.map(async (item: string) => {
    const value = penpot.localStorage.getItem(item)
    if (value)
      penpot.ui.sendMessage({
        type: `GET_ITEM_${item.toUpperCase()}`,
        data: { value },
      })
  }),

// DELETE_ITEMS — canvas side (no removeItem — set to empty string)
DELETE_ITEMS: () =>
  path.items.forEach((item: string) => penpot.localStorage.setItem(item, '')),
```

## Integration with loadUI.ts

```typescript
import { createRectangle } from './shapes/createRectangle'
import { getSelection } from './selection/getSelection'
import { savePreferences, loadPreferences } from './data'

penpot.ui.onMessage(async (msg: any) => {
  const path = msg.pluginMessage

  const actions: { [key: string]: () => void } = {
    CREATE_RECTANGLE: () => {
      const result = createRectangle(path.data)
      penpot.ui.sendMessage({ type: 'RECTANGLE_CREATED', data: result })
    },
    GET_SELECTION: () => {
      penpot.ui.sendMessage({ type: 'SELECTION_LOADED', data: getSelection() })
    },
    SAVE_PREFERENCES: () => {
      const success = savePreferences(path.data)
      penpot.ui.sendMessage({ type: 'PREFERENCES_SAVED', data: { success } })
    },
    LOAD_PREFERENCES: () => {
      penpot.ui.sendMessage({ type: 'PREFERENCES_LOADED', data: loadPreferences() })
    },
    DEFAULT: () => null,
  }

  try {
    return actions[path.type]?.()
  } catch {
    return actions['DEFAULT']?.()
  }
})
```

## Best Practices

```typescript
// ✅ Always parse localStorage values before use
const raw = penpot.localStorage.getItem('count')
const count = raw !== null ? Number(raw) : 0

// ✅ Validate before processing
export const resizeShape = (shapeId: string, width: number, height: number) => {
  if (width <= 0 || height <= 0) throw new Error('Dimensions must be positive')
  const shape = penpot.currentPage?.getShapeById(shapeId)
  if (!shape) throw new Error(`Shape ${shapeId} not found`)
  shape.width = width
  shape.height = height
}

// ✅ Return useful structured data
export const createCard = (): { id: string; name: string } => {
  const frame = penpot.createFrame()
  frame.name = 'Card'
  return { id: frame.id, name: frame.name }
}
```

## Testing Bridge Functions

```typescript
const mockPenpot = {
  createRectangle: () => ({ id: 'test-id', name: 'Rectangle', x: 0, y: 0, width: 0, height: 0 }),
  localStorage: {
    store: {} as Record<string, string>,
    getItem(key: string) { return this.store[key] ?? null },
    setItem(key: string, value: string) { this.store[key] = value },
  },
}

describe('savePreferences', () => {
  it('serializes and stores preferences', () => {
    global.penpot = mockPenpot
    const prefs = { theme: 'dark', language: 'fr-FR', autoSave: true }
    expect(savePreferences(prefs)).toBe(true)
    expect(JSON.parse(mockPenpot.localStorage.getItem('preferences')!)).toEqual(prefs)
  })
})
```
