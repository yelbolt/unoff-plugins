---
name: penpot-data-storage
description: Patterns for persisting data in Penpot plugins using penpot.localStorage (the only available storage mechanism). Use when storing auth tokens, preferences, or any plugin state in Penpot.
platform: penpot
---

# Data Storage — Penpot

## Storage Mechanisms

| Mechanism           | Scope              | Type    | Async | Notes                        |
| ------------------- | ------------------ | ------- | ----- | ---------------------------- |
| `penpot.localStorage` | Per-user, per-plugin | string | No | Synchronous, string-only     |

Penpot **does not** have:
- Per-node plugin data (no `setPluginData`)
- Shared plugin data (no `setSharedPluginData`)
- A separate client storage API

All persistent state goes through `penpot.localStorage`. See [core.md](../../core.md) for why it must always be synchronous and string-only — the rule that trips up most ports.

---

## penpot.localStorage

```typescript
// Write — value must be a string
penpot.localStorage.setItem('key', 'value')
penpot.localStorage.setItem('count', String(42))
penpot.localStorage.setItem('prefs', JSON.stringify({ theme: 'dark' }))

// Read — returns string | null
const raw = penpot.localStorage.getItem('key')          // null if missing
const count = Number(penpot.localStorage.getItem('count') ?? '0')
const prefs = JSON.parse(penpot.localStorage.getItem('prefs') ?? 'null')

// Delete — no removeItem, set to empty string
penpot.localStorage.setItem('key', '')
```

---

## User Preferences

```typescript
interface UserPreferences { theme: 'light' | 'dark'; language: string; autoSave: boolean }

export const savePrefs = (prefs: UserPreferences): void => {
  penpot.localStorage.setItem('prefs', JSON.stringify(prefs))
}

export const loadPrefs = (): UserPreferences | null => {
  const raw = penpot.localStorage.getItem('prefs')
  return raw ? (JSON.parse(raw) as UserPreferences) : null
}

export const updatePref = <K extends keyof UserPreferences>(
  key: K,
  value: UserPreferences[K]
) => {
  const prefs = loadPrefs() ?? {} as UserPreferences
  prefs[key] = value
  savePrefs(prefs)
}
```

---

## Auth Tokens

```typescript
// Save (called in loadUI.ts after successful login)
penpot.localStorage.setItem('supabase_access_token', accessToken)
penpot.localStorage.setItem('supabase_refresh_token', refreshToken)

// Read (in LOAD_DATA action of loadUI.ts)
const accessToken = penpot.localStorage.getItem('supabase_access_token') ?? undefined
const refreshToken = penpot.localStorage.getItem('supabase_refresh_token') ?? undefined

// Clear on sign-out
penpot.localStorage.setItem('supabase_access_token', '')
penpot.localStorage.setItem('supabase_refresh_token', '')
```

---

## Multi-Item Operations (SET_ITEMS / GET_ITEMS)

These patterns match what `loadUI.ts` expects from the UI bridge messages.

```typescript
// SET_ITEMS
path.items.forEach((item: { key: string; value: unknown }) => {
  if (typeof item.value === 'object')
    penpot.localStorage.setItem(item.key, JSON.stringify(item.value))
  else if (typeof item.value === 'boolean' || typeof item.value === 'number')
    penpot.localStorage.setItem(item.key, item.value.toString())
  else
    penpot.localStorage.setItem(item.key, item.value as string)
})

// GET_ITEMS
path.items.forEach((item: string) => {
  const value = penpot.localStorage.getItem(item)
  if (value)
    penpot.ui.sendMessage({
      type: `GET_ITEM_${item.toUpperCase()}`,
      data: { value },
    })
})

// DELETE_ITEMS (set to empty string — no removeItem)
path.items.forEach((item: string) => penpot.localStorage.setItem(item, ''))
```

---

## Recent History

```typescript
interface HistoryItem { id: string; timestamp: number; action: string }

export const addToHistory = (item: Omit<HistoryItem, 'timestamp'>) => {
  const raw = penpot.localStorage.getItem('history')
  const history: HistoryItem[] = raw ? JSON.parse(raw) : []
  history.unshift({ ...item, timestamp: Date.now() })
  penpot.localStorage.setItem('history', JSON.stringify(history.slice(0, 50)))
}

export const getHistory = (): HistoryItem[] => {
  const raw = penpot.localStorage.getItem('history')
  return raw ? JSON.parse(raw) : []
}

export const clearHistory = () => penpot.localStorage.setItem('history', '')
```

---

## Data Versioning / Migration

```typescript
export const saveVersioned = (key: string, data: unknown) => {
  penpot.localStorage.setItem(key, JSON.stringify({ version: '2.0.0', data }))
}

export const loadVersioned = (key: string): unknown => {
  const raw = penpot.localStorage.getItem(key)
  if (!raw) return null
  const stored = JSON.parse(raw) as { version: string; data: unknown }
  if (stored.version === '1.0.0') {
    const migrated = migrateV1toV2(stored.data)
    saveVersioned(key, migrated)
    return migrated
  }
  return stored.data
}
```

---

## Best Practices

```typescript
// ✅ Always parse — localStorage only stores strings
const prefs = JSON.parse(penpot.localStorage.getItem('prefs') ?? 'null')

// ✅ Provide a default when the key might be missing
const lang = penpot.localStorage.getItem('user_language') ?? 'en-US'

// ✅ Namespace keys to avoid collisions
penpot.localStorage.setItem('myplugin.export-settings', JSON.stringify(s))

// ✅ Serialize booleans and numbers explicitly
penpot.localStorage.setItem('count', String(42))
penpot.localStorage.setItem('enabled', 'true')
const enabled = penpot.localStorage.getItem('enabled') === 'true'
const count = Number(penpot.localStorage.getItem('count') ?? '0')

// ✅ Delete = set to empty string (no removeItem)
penpot.localStorage.setItem('key', '')
```

---

## Storage Gaps vs Figma

The user-level storage comparison (`figma.clientStorage` vs `penpot.localStorage`) is in [core.md](../../core.md). What core.md doesn't cover — Penpot has no per-node or cross-plugin equivalents at all:

| Feature                   | Figma                                   | Penpot                          |
| -------------------------- | ---------------------------------------- | -------------------------------- |
| Node-level metadata       | `node.setPluginData(key, value)`        | Not available                   |
| Cross-plugin shared data  | `node.setSharedPluginData(ns, k, v)`    | Not available                   |
| Deleting a key            | `figma.clientStorage.deleteAsync(key)`  | `setItem(key, '')`              |
| Storing objects           | Pass directly (serialized internally)   | Must `JSON.stringify` manually  |
