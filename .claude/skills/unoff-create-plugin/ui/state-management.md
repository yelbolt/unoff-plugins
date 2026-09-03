---
name: state-management
description: State management using Nanostores atoms ($prefix, subscribe, dual update), PureComponent class state, and Canvas storage sync (figma.clientStorage on Figma, penpot.localStorage on Penpot). Use when adding shared state, managing user preferences across sessions, or syncing state between Canvas and UI.
---

# State Management

## Overview

The plugin uses multiple state management approaches:

1. **React Component State** - Local UI state
2. **React Context** - Shared state across components
3. **Zustand Stores** - Global application state
4. **Figma Client Storage** - Persistent user preferences

## React Component State

### When to Use

- Component-specific UI state
- Form inputs
- Temporary UI states (loading, errors)
- Local toggles and flags

### Class Components

```typescript
interface State {
  isLoading: boolean
  value: string
  error: string | null
}

class MyComponent extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      isLoading: false,
      value: '',
      error: null
    }
  }
  
  handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ value: e.target.value })
  }
  
  handleSubmit = async () => {
    this.setState({ isLoading: true, error: null })
    
    try {
      await submitData(this.state.value)
      this.setState({ isLoading: false })
    } catch (error) {
      this.setState({
        isLoading: false,
        error: error.message
      })
    }
  }
  
  render() {
    return (
      <div>
        <input
          value={this.state.value}
          onChange={this.handleChange}
        />
        <button onClick={this.handleSubmit}>
          {this.state.isLoading ? 'Loading...' : 'Submit'}
        </button>
        {this.state.error && <div>{this.state.error}</div>}
      </div>
    )
  }
}
```

### Functional Components with Hooks

```typescript
function MyComponent() {
  const [isLoading, setIsLoading] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      await submitData(value)
      setIsLoading(false)
    } catch (error) {
      setError(error.message)
      setIsLoading(false)
    }
  }
  
  return (
    <div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button onClick={handleSubmit}>
        {isLoading ? 'Loading...' : 'Submit'}
      </button>
      {error && <div>{error}</div>}
    </div>
  )
}
```

## React Context

### When to Use

- Shared state across multiple components
- Theme configuration
- User authentication state
- Current language/locale
- Global UI state (modals, overlays)

### Context Structure

```
/src/app/config/
  ConfigContext.tsx      # Plugin configuration
  ThemeContext.tsx       # Theme state
  
/src/app/ui/contexts/
  Modal.tsx              # Modal system
  MyFirstContext.tsx     # Custom context 1
  MySecondContext.tsx    # Custom context 2
```

### Creating a Context

```typescript
// /src/app/ui/contexts/UserContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react'

interface User {
  id: string
  email: string
  plan: 'free' | 'pro'
}

interface UserContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    // Load user on mount
    loadUser()
  }, [])
  
  const loadUser = async () => {
    setIsLoading(true)
    try {
      const userData = await getCurrentUser()
      setUser(userData)
    } catch (error) {
      console.error('Failed to load user:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const userData = await signIn(email, password)
      setUser(userData)
      return true
    } catch (error) {
      console.error('Login failed:', error)
      return false
    }
  }
  
  const logout = () => {
    setUser(null)
    signOut()
  }
  
  return (
    <UserContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </UserContext.Provider>
  )
}

// Custom hook for easy access
export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within UserProvider')
  }
  return context
}
```

### Using Context

```typescript
// Wrap app with provider
import { UserProvider } from './contexts/UserContext'

function App() {
  return (
    <UserProvider>
      <MainApp />
    </UserProvider>
  )
}

// Use in components
import { useUser } from '../contexts/UserContext'

function ProfileComponent() {
  const { user, isLoading, logout } = useUser()
  
  if (isLoading) return <div>Loading...</div>
  if (!user) return <div>Not logged in</div>
  
  return (
    <div>
      <p>Email: {user.email}</p>
      <p>Plan: {user.plan}</p>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

### Modal Context Example

```typescript
// /src/app/ui/contexts/Modal.tsx

import React, { createContext, useContext, useState } from 'react'

type ModalType = 'about' | 'settings' | 'export' | null

interface ModalContextType {
  currentModal: ModalType
  openModal: (modal: ModalType) => void
  closeModal: () => void
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentModal, setCurrentModal] = useState<ModalType>(null)
  
  const openModal = (modal: ModalType) => {
    setCurrentModal(modal)
  }
  
  const closeModal = () => {
    setCurrentModal(null)
  }
  
  return (
    <ModalContext.Provider value={{ currentModal, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  )
}

export const useModal = () => {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within ModalProvider')
  }
  return context
}
```

## Zustand Stores

### When to Use

- Global application state
- Complex state logic
- State shared across unrelated components
- State that needs to persist

### Installation

```bash
npm install zustand
```

### Creating a Store

```typescript
// /src/app/stores/preferences.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PreferencesState {
  theme: 'light' | 'dark'
  language: string
  autoSave: boolean
  recentColors: string[]
  
  // Actions
  setTheme: (theme: 'light' | 'dark') => void
  setLanguage: (language: string) => void
  setAutoSave: (enabled: boolean) => void
  addRecentColor: (color: string) => void
  clearRecentColors: () => void
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      language: 'en-US',
      autoSave: true,
      recentColors: [],
      
      setTheme: (theme) => set({ theme }),
      
      setLanguage: (language) => set({ language }),
      
      setAutoSave: (autoSave) => set({ autoSave }),
      
      addRecentColor: (color) => {
        const colors = get().recentColors
        const updated = [color, ...colors.filter(c => c !== color)].slice(0, 10)
        set({ recentColors: updated })
      },
      
      clearRecentColors: () => set({ recentColors: [] })
    }),
    {
      name: 'preferences-storage' // LocalStorage key
    }
  )
)
```

### Using a Store

```typescript
import { usePreferences } from '../stores/preferences'

function SettingsComponent() {
  // Subscribe to specific values
  const theme = usePreferences(state => state.theme)
  const language = usePreferences(state => state.language)
  const setTheme = usePreferences(state => state.setTheme)
  const setLanguage = usePreferences(state => state.setLanguage)
  
  return (
    <div>
      <select value={theme} onChange={(e) => setTheme(e.target.value as any)}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
      
      <select value={language} onChange={(e) => setLanguage(e.target.value)}>
        <option value="en-US">English</option>
        <option value="fr-FR">Français</option>
      </select>
    </div>
  )
}

// Subscribe to entire store
function StatusBar() {
  const prefs = usePreferences()
  
  return (
    <div>
      Theme: {prefs.theme} | Lang: {prefs.language}
    </div>
  )
}
```

### Store Examples

#### Features Store

```typescript
// /src/app/stores/features.ts

import { create } from 'zustand'

interface FeatureFlags {
  betaFeatures: boolean
  experimentalExport: boolean
  advancedMode: boolean
}

interface FeaturesState {
  flags: FeatureFlags
  setFlag: (key: keyof FeatureFlags, value: boolean) => void
  isFeatureEnabled: (key: keyof FeatureFlags) => boolean
}

export const useFeatures = create<FeaturesState>((set, get) => ({
  flags: {
    betaFeatures: false,
    experimentalExport: false,
    advancedMode: false
  },
  
  setFlag: (key, value) => {
    set(state => ({
      flags: { ...state.flags, [key]: value }
    }))
  },
  
  isFeatureEnabled: (key) => {
    return get().flags[key]
  }
}))
```

#### Credits Store

```typescript
// /src/app/stores/credits.ts

import { create } from 'zustand'

interface CreditsState {
  credits: number
  isLoading: boolean
  
  setCredits: (credits: number) => void
  deductCredits: (amount: number) => boolean
  addCredits: (amount: number) => void
  loadCredits: () => Promise<void>
}

export const useCredits = create<CreditsState>((set, get) => ({
  credits: 0,
  isLoading: false,
  
  setCredits: (credits) => set({ credits }),
  
  deductCredits: (amount) => {
    const current = get().credits
    if (current >= amount) {
      set({ credits: current - amount })
      return true
    }
    return false
  },
  
  addCredits: (amount) => {
    set(state => ({ credits: state.credits + amount }))
  },
  
  loadCredits: async () => {
    set({ isLoading: true })
    try {
      const credits = await fetchUserCredits()
      set({ credits, isLoading: false })
    } catch (error) {
      console.error('Failed to load credits:', error)
      set({ isLoading: false })
    }
  }
}))
```

#### Consent Store

```typescript
// /src/app/stores/consent.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ConsentState {
  analytics: boolean
  marketing: boolean
  lastUpdated: number | null
  
  setConsent: (analytics: boolean, marketing: boolean) => void
  hasConsented: () => boolean
}

export const useConsent = create<ConsentState>()(
  persist(
    (set, get) => ({
      analytics: false,
      marketing: false,
      lastUpdated: null,
      
      setConsent: (analytics, marketing) => {
        set({
          analytics,
          marketing,
          lastUpdated: Date.now()
        })
      },
      
      hasConsented: () => {
        return get().lastUpdated !== null
      }
    }),
    {
      name: 'consent-storage'
    }
  )
)
```

## Sync with Canvas Storage

The UI side is **identical across platforms**. The sync mechanism always uses `sendPluginMessage` and listens on `platformMessage`. The platform difference is only on the Canvas side: `figma.clientStorage` (Figma) vs `penpot.localStorage` (Penpot) — see [bridge/figma/bridge-functions.md](../bridge/figma/bridge-functions.md) and [bridge/penpot/bridge-functions.md](../bridge/penpot/bridge-functions.md).

### Syncing Zustand with Canvas Storage

```typescript
// /src/app/stores/preferences.ts

import { create } from 'zustand'
import { sendPluginMessage } from '../utils/pluginMessage'

interface PreferencesState {
  theme: 'light' | 'dark'
  language: string
  
  setTheme: (theme: 'light' | 'dark') => void
  loadFromCanvas: () => void
}

export const usePreferences = create<PreferencesState>((set) => ({
  theme: 'dark',
  language: 'en-US',
  
  setTheme: (theme) => {
    set({ theme })
    
    // Sync to Canvas storage (platform-agnostic from UI side)
    sendPluginMessage({
      pluginMessage: {
        type: 'SAVE_PREFERENCES',
        data: { theme }
      }
    })
  },
  
  loadFromCanvas: () => {
    sendPluginMessage({
      pluginMessage: { type: 'LOAD_PREFERENCES' }
    })
  }
}))

// Listen for response from Canvas (via platformMessage proxy)
window.addEventListener('platformMessage', (event) => {
  const msg = (event as CustomEvent).detail
  
  if (msg?.type === 'PREFERENCES_LOADED') {
    usePreferences.setState(msg.data)
  }
})
```

## Best Practices

### 1. Choose the Right State Management

```typescript
// ✅ Local component state for UI-only state
const [isOpen, setIsOpen] = useState(false)

// ✅ Context for shared theme/config
const theme = useTheme()

// ✅ Zustand for global app state
const user = useUser()

// ✅ Figma storage for persistent preferences
sendPluginMessage({ pluginMessage: { type: 'SAVE_PREF' } })
```

### 2. Minimize Re-renders

```typescript
// ✅ Subscribe to specific values
const theme = usePreferences(state => state.theme)

// ❌ Subscribe to entire store
const prefs = usePreferences()
const theme = prefs.theme // Re-renders on any change!
```

### 3. Keep State Normalized

```typescript
// ✅ Flat, normalized structure
interface State {
  nodesById: { [id: string]: Node }
  selectedNodeIds: string[]
}

// ❌ Nested, denormalized
interface State {
  nodes: Array<{
    id: string
    children: Array<{ ... }>
  }>
}
```

### 4. Use Middleware

```typescript
// ✅ Persist important state
import { persist } from 'zustand/middleware'

export const useStore = create(
  persist(
    (set) => ({ ... }),
    { name: 'my-storage' }
  )
)
```

### 5. Type Safety

```typescript
// ✅ Strong typing
interface State {
  count: number
  increment: () => void
}

export const useCounter = create<State>((set) => ({ ... }))

// ❌ No types
export const useCounter = create((set) => ({ ... }))
```

## Undo/Redo History with Nanostores

### When to Use

Use this pattern when a view manages a list (or any mutable state) where the user must be able to undo and redo changes. It uses **nanostores** (`atom`, `computed`) instead of Zustand so that class components can subscribe manually.

### Store Structure

```typescript
// /src/app/stores/history.ts

import { atom, computed } from 'nanostores'

interface ItemsHistoryState {
  past: string[][]
  present: string[]
  future: string[][]
}

export const $itemsHistory = atom<ItemsHistoryState>({
  past: [],
  present: [],
  future: [],
})

// Read-only derived atoms
export const $canUndo = computed($itemsHistory, (h) => h.past.length > 0)
export const $canRedo = computed($itemsHistory, (h) => h.future.length > 0)

// Actions
export const pushItems = (newPresent: string[]): void => {
  const { past, present } = $itemsHistory.get()
  $itemsHistory.set({
    past: [...past, present],
    present: newPresent,
    future: [],               // any new action clears the future
  })
}

export const undoItems = (): void => {
  const { past, present, future } = $itemsHistory.get()
  if (past.length === 0) return
  $itemsHistory.set({
    past: past.slice(0, -1),
    present: past[past.length - 1],
    future: [present, ...future],
  })
}

export const redoItems = (): void => {
  const { past, present, future } = $itemsHistory.get()
  if (future.length === 0) return
  $itemsHistory.set({
    past: [...past, present],
    present: future[0],
    future: future.slice(1),
  })
}
```

The pattern is **past / present / future**:
- `pushItems` saves current `present` to `past` and clears `future`
- `undoItems` pops from `past`, pushes current to `future`
- `redoItems` shifts from `future`, pushes current to `past`

### Subscribing in a Class Component

Nanostores returns an **unsubscribe** function from `.subscribe()`. Store it and call it in `componentWillUnmount`.

```typescript
import {
  $canRedo,
  $canUndo,
  $itemsHistory,
  pushItems,
  redoItems,
  undoItems,
} from '../../stores/history'

interface State {
  items: string[]
  canUndo: boolean
  canRedo: boolean
}

class MyComponent extends PureComponent<Props, State> {
  private subscribeItemsHistory: (() => void) | null = null
  private subscribeCanUndo: (() => void) | null = null
  private subscribeCanRedo: (() => void) | null = null

  constructor(props: Props) {
    super(props)
    this.state = { items: [], canUndo: false, canRedo: false }
  }

  componentDidMount = () => {
    this.subscribeItemsHistory = $itemsHistory.subscribe((value) =>
      this.setState({ items: [...value.present] })
    )
    this.subscribeCanUndo = $canUndo.subscribe((value) =>
      this.setState({ canUndo: value })
    )
    this.subscribeCanRedo = $canRedo.subscribe((value) =>
      this.setState({ canRedo: value })
    )
  }

  componentWillUnmount = () => {
    if (this.subscribeItemsHistory) this.subscribeItemsHistory()
    if (this.subscribeCanUndo) this.subscribeCanUndo()
    if (this.subscribeCanRedo) this.subscribeCanRedo()
  }

  // Mutations always go through pushItems — never mutate $itemsHistory directly
  handleAddItem = () => {
    pushItems([...this.state.items, 'new item'])
  }

  handleDeleteItem = (index: number) => () => {
    pushItems(this.state.items.filter((_, i) => i !== index))
  }
}
```

### Exposing Undo/Redo in the UI

Pair the store with two icon buttons in a `Bar`. Pass the imported action functions directly as `action` — they are stable references.

```typescript
import { Bar, Button } from '@unoff/ui'
import { undoItems, redoItems } from '../../stores/history'

<Bar
  leftPartSlot={
    <div className={layouts['snackbar--tight']}>
      <Button
        type="icon"
        icon="undo"
        isDisabled={!canUndo}
        action={undoItems}
      />
      <Button
        type="icon"
        icon="redo"
        isDisabled={!canRedo}
        action={redoItems}
      />
    </div>
  }
  border={['BOTTOM']}
/>
```

### Adapting to Other Data Types

Replace `string[]` / `string[][]` with your own type. The rest of the pattern stays identical.

```typescript
interface Item { id: string; label: string }

interface HistoryState {
  past: Item[][]
  present: Item[]
  future: Item[][]
}

export const $itemsHistory = atom<HistoryState>({ past: [], present: [], future: [] })
```

## State Flow Diagram

```
User Action
    ↓
Component Event Handler
    ↓
Update Local State ← → Update Context
    ↓                       ↓
Update Zustand Store   sendPluginMessage()
    ↓                       ↓
Persist to localStorage   Canvas Bridge
                             ↓
                Canvas storage
                   (figma.clientStorage / penpot.localStorage)
                             ↓
                        sendMessage back
                             ↓
                        Update UI State
```
