---
name: figma-data-storage
description: Patterns for persisting data using Plugin Data (node-level), Shared Plugin Data (cross-plugin), and Client Storage (user preferences) in Figma plugins. Use when storing metadata on nodes, syncing preferences, or implementing data migration.
platform: figma
---

# Data Storage — Figma

## Three Storage Mechanisms

| Mechanism        | Scope                     | Type     | Async | Limit          |
| ---------------- | ------------------------- | -------- | ----- | -------------- |
| Plugin Data      | Per-node, per-plugin      | string   | No    | No official    |
| Shared Plugin Data | Per-node, cross-plugin  | string   | No    | No official    |
| Client Storage   | Per-user, per-device      | any JSON | Yes   | 1 MB/key, 100 keys |

---

## Plugin Data (Node-level)

Use for: node-specific metadata, tracking generated nodes, linking to external IDs.

```typescript
// Write (value must be a string — JSON.stringify for objects)
node.setPluginData('key', 'value')
node.setPluginData('config', JSON.stringify({ enabled: true, version: '2.0' }))

// Read (returns '' if missing, never undefined)
const raw = node.getPluginData('key')
const config = JSON.parse(node.getPluginData('config') || '{}')

// List keys
const keys = node.getPluginDataKeys()

// Delete (set to empty string)
node.setPluginData('key', '')
```

### Common patterns

```typescript
// Mark as generated
export const markAsGenerated = (node: SceneNode, config: unknown) => {
  node.setPluginData('generated', 'true')
  node.setPluginData('generatedAt', Date.now().toString())
  node.setPluginData('config', JSON.stringify(config))
}

export const findGeneratedNodes = (): SceneNode[] =>
  figma.currentPage.findAll(n => n.getPluginData('generated') === 'true')

// Link to external DB
export const linkToDatabase = (node: SceneNode, dbId: string) => {
  node.setPluginData('dbId', dbId)
}

export const findNodeByDbId = (dbId: string): SceneNode | null =>
  figma.currentPage.findOne(n => n.getPluginData('dbId') === dbId)

// Cleanup when deleting a node
export const cleanupNode = (node: SceneNode) => {
  for (const key of node.getPluginDataKeys()) node.setPluginData(key, '')
}
```

---

## Shared Plugin Data

Use for: sharing metadata with other plugins, standardised component docs.

```typescript
const NS = 'com.yourcompany.pluginname'

node.setSharedPluginData(NS, 'key', 'value')
const value = node.getSharedPluginData(NS, 'key')
const keys = node.getSharedPluginDataKeys(NS)
```

---

## Client Storage (User-level)

Use for: auth tokens, preferences, history, cache. All operations are **async**.

```typescript
// Write — any JSON-serializable value
await figma.clientStorage.setAsync('prefs', { theme: 'dark', lang: 'fr-FR' })

// Read — returns undefined if missing
const prefs = await figma.clientStorage.getAsync('prefs')
const value = (await figma.clientStorage.getAsync('key')) ?? defaultValue

// Delete
await figma.clientStorage.deleteAsync('key')

// List all keys
const keys = await figma.clientStorage.keysAsync()
```

### User preferences

```typescript
interface UserPreferences { theme: 'light' | 'dark'; language: string; autoSave: boolean }

export const savePrefs = async (prefs: UserPreferences) =>
  figma.clientStorage.setAsync('prefs', prefs)

export const loadPrefs = async (): Promise<UserPreferences | null> =>
  (await figma.clientStorage.getAsync('prefs')) ?? null

export const updatePref = async <K extends keyof UserPreferences>(
  key: K, value: UserPreferences[K]
) => {
  const prefs = (await loadPrefs()) ?? {} as UserPreferences
  prefs[key] = value
  await savePrefs(prefs)
}
```

### Auth tokens

```typescript
// Save
await figma.clientStorage.setAsync('supabase_access_token', accessToken)
await figma.clientStorage.setAsync('supabase_refresh_token', refreshToken)

// Read (loaded in loadUI.ts LOAD_DATA action)
const accessToken = await figma.clientStorage.getAsync('supabase_access_token')
const refreshToken = await figma.clientStorage.getAsync('supabase_refresh_token')
```

### Recent history

```typescript
export const addToHistory = async (item: Omit<HistoryItem, 'timestamp'>) => {
  const history = (await figma.clientStorage.getAsync('history')) ?? []
  history.unshift({ ...item, timestamp: Date.now() })
  await figma.clientStorage.setAsync('history', history.slice(0, 50))
}

export const getHistory = async (): Promise<HistoryItem[]> =>
  (await figma.clientStorage.getAsync('history')) ?? []
```

### Cache with expiry

```typescript
interface CacheEntry<T> { data: T; timestamp: number; expiresIn: number }

export const setCached = async <T>(key: string, data: T, ttl = 3_600_000) => {
  await figma.clientStorage.setAsync(`cache_${key}`, { data, timestamp: Date.now(), expiresIn: ttl })
}

export const getCached = async <T>(key: string): Promise<T | null> => {
  const entry = await figma.clientStorage.getAsync(`cache_${key}`) as CacheEntry<T> | null
  if (!entry) return null
  if (Date.now() - entry.timestamp > entry.expiresIn) {
    await figma.clientStorage.deleteAsync(`cache_${key}`)
    return null
  }
  return entry.data
}
```

### Data versioning / migration

```typescript
export const saveVersioned = async (key: string, data: unknown) =>
  figma.clientStorage.setAsync(key, { version: '2.0.0', data })

export const loadVersioned = async (key: string): Promise<unknown> => {
  const stored = await figma.clientStorage.getAsync(key) as { version: string; data: unknown } | null
  if (!stored) return null
  if (stored.version === '1.0.0') {
    const migrated = migrateV1toV2(stored.data)
    await saveVersioned(key, migrated)
    return migrated
  }
  return stored.data
}
```

## Best Practices

```typescript
// ✅ Descriptive, namespaced plugin data keys
node.setPluginData('myplugin.export-settings', JSON.stringify(settings))

// ✅ Graceful fallback on missing client storage
const prefs = (await figma.clientStorage.getAsync('prefs')) ?? DEFAULT_PREFS

// ✅ Wrap large writes in try/catch (1 MB limit)
try {
  await figma.clientStorage.setAsync('key', largeData)
} catch {
  figma.notify('Failed to save: data too large', { error: true })
}

// ✅ Batch reads
const [prefs, history] = await Promise.all([
  figma.clientStorage.getAsync('prefs'),
  figma.clientStorage.getAsync('history'),
])
```
