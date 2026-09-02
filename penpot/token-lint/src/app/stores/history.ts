import { atom, computed } from 'nanostores'

// --- Types ---

interface ItemsHistoryState {
  past: string[][]
  present: string[]
  future: string[][]
}

// --- Atoms ---

export const $itemsHistory = atom<ItemsHistoryState>({
  past: [],
  present: [],
  future: [],
})

// --- Computed (read-only, derived) ---

export const $canUndo = computed($itemsHistory, (h) => h.past.length > 0)
export const $canRedo = computed($itemsHistory, (h) => h.future.length > 0)

// --- Actions ---

export const pushItems = (newPresent: string[]): void => {
  const { past, present } = $itemsHistory.get()
  $itemsHistory.set({
    past: [...past, present],
    present: newPresent,
    future: [],
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
