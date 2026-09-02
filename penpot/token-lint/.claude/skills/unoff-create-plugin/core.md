# Unoff Core

The facts every layer depends on. **This file is the single source of truth for
everything below** — no other skill file, agent, or rules file may restate these
tables. They link here instead.

Load this once per task, before any layer file.

## Stack facts

Never contradict these. They are the most common source of broken implementations.

- **Preact**, not React — import from `preact` / `preact/compat`. The 3-level
  alias (Vite, TSConfig, npm) exists only for third-party libraries.
- **Nanostores**, not Zustand/Redux — `atom` from `nanostores` +
  `@nanostores/preact`, `$prefix` convention.
- **PureComponent classes**, not function components with hooks — composed with
  the `WithConfig` and `WithTranslation` HOCs.
- **Tolgee** for UI strings (`@tolgee/react`) and `createI18n()` for Canvas —
  two distinct systems, never mixed.
- **`@unoff/ui` first** — look up the existing export before building a component.
- **Dual Vite build** — `IS_PLUGIN=true` emits the IIFE `plugin.js`; the default
  build emits a single HTML file. `excludeUnwantedCssPlugin` strips the unused
  platform's CSS — do not defeat it with a static import.
- **Config is central** — new values go through `src/global.config.ts` and are
  consumed via `ConfigContext`. Never read `import.meta.env` from a component.

## Architecture

Two contexts that never mix, plus the bridge between them.

```
src/
├── index.ts              # Canvas entry — action map, bridge dispatch
├── global.config.ts      # Central config
├── bridges/
│   └── loadUI.ts         # Message router
├── app/                  # UI — Preact, no direct platform API access
│   ├── index.tsx         # Providers, bootstrap
│   ├── components/
│   ├── stores/           # Nanostore atoms
│   ├── services/         # External service singletons
│   └── types/
└── canvas/               # Canvas API helpers — no DOM, no authenticated fetch
```

**Canvas** → `src/index.ts` + `src/canvas/` + `src/bridges/`
**UI** → `src/app/`
**Shared** → `src/global.config.ts` + `src/app/types/`

## The message contract

Naming: UI → Canvas is `VERB_NOUN` (`CREATE_NODE`); Canvas → UI is
`NOUN_PAST_TENSE` (`NODE_CREATED`).

**A new action means four coordinated edits.** A missing one is a silent no-op:

1. the action/event union member in `src/app/types/`
2. the Canvas handler registered in the action map (`src/index.ts`)
3. the bridge function in `src/bridges/`
4. the routing entry in `loadUI.ts`

A `type` value is a shared contract — never rename it on a single side.

## Platform differences

| Concern           | Figma                                   | Penpot                                                  |
| ----------------- | --------------------------------------- | ------------------------------------------------------- |
| Open UI           | `figma.showUI(__html__, { … })`         | `penpot.ui.open(title, url, { … })`                     |
| Canvas → UI       | `figma.ui.postMessage({ type, data })`  | `penpot.ui.sendMessage({ type, data })`                 |
| UI → Canvas       | `parent.postMessage({ pluginMessage })` | dispatch `pluginMessage` CustomEvent (proxy)            |
| Receive in Canvas | `figma.ui.onmessage = (msg) => …`       | `penpot.ui.onMessage((msg) => …)` + `msg.pluginMessage` |
| Receive in UI     | `event.data.pluginMessage`              | `(event as CustomEvent).detail` on `platformMessage`    |
| Storage           | `figma.clientStorage` — async, typed    | `penpot.localStorage` — **sync, string-only**           |
| Resize            | `figma.ui.resize(w, h)`                 | Not supported — fixed at open time                      |
| Open external URL | `figma.openExternal(url)`               | re-send to UI, handle via `OPEN_IN_BROWSER`             |
| Theme             | CSS vars via `themeColors: true`        | `penpot.theme` + `SET_THEME` message                    |
| Current user      | `figma.currentUser?.photoUrl`           | `penpot.currentUser.avatarUrl`                          |

**Penpot storage is synchronous and string-only.** Always serialize; never await
it. This is the single most frequent porting bug.

The UI layer is shared across platforms. Where behaviour must differ, branch on
config — never fork the component.

## Non-negotiables

- Await async Canvas APIs (`loadAllPagesAsync`, `loadFontAsync`, `getNodeByIdAsync`).
- No DOM, `window`, or authenticated `fetch` in Canvas code — route through the UI.
- Surface bridge errors via `POST_MESSAGE` + Sentry — never swallow them.
- Every user-facing string is a Tolgee key, added when the text is added.
- Gated UI uses `FeatureStatus` / `isBlocked` — never a hand-rolled plan check.
- Secrets never reach the Canvas bundle.
