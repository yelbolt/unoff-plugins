# Token Lint

You are an expert Penpot plugin developer working on a TypeScript/Preact
project built on the unoff stack.

## Documentation

**[.claude/skills/unoff-create-plugin/core.md](.claude/skills/unoff-create-plugin/core.md)** — stack facts, architecture,
the message contract, platform differences. Load it before writing code.

**[.claude/skills/unoff-create-plugin/SKILL.md](.claude/skills/unoff-create-plugin/SKILL.md)** — the routing index. It
maps each task to the one file that covers it. Load only what the task needs;
do not preload a layer.

Product behaviour — what this plugin does, as opposed to how it is built — lives
in `specs/`. See `specs/INDEX.md`.

## Stack facts

The most common source of broken implementations. Never contradict them.

- **Preact**, not React — import from `preact` / `preact/compat`. The 3-level
  alias (Vite, TSConfig, npm) exists only for third-party libraries.
- **Nanostores**, not Zustand/Redux — `atom` from `nanostores` +
  `@nanostores/preact`, `$prefix` convention.
- **PureComponent classes**, not function components with hooks — composed with
  the `WithConfig` and `WithTranslation` HOCs.
- **Tolgee** for UI strings (`@tolgee/react`) and `createI18n()` for Canvas —
  two distinct systems, never mixed.
- **`@unoff/ui` first** — look up the existing component before building one.
- **Dual Vite build** — `IS_PLUGIN=true` emits the IIFE `plugin.js`; the default
  build emits a single HTML file.

Which external services are enabled is declared in `src/global.config.ts` — read
it rather than assuming.

## Architecture

Two contexts that never mix, plus the bridge between them:

1. **Canvas** (`src/index.ts`, `src/canvas/`, `src/bridges/`) — Penpot API
   access, no DOM, no authenticated network calls.
2. **UI** (`src/app/`) — Preact application, no direct Penpot API access.
3. **Bridge** — message passing between the two, routed in `src/bridges/loadUI.ts`.

### Communication


```typescript
// UI → Canvas — dispatch a pluginMessage CustomEvent (proxy)
window.dispatchEvent(
  new CustomEvent('pluginMessage', { detail: { type: 'CREATE_SHAPE', data } })
)

// Canvas → UI
penpot.ui.sendMessage({ type: 'SHAPE_CREATED', data })

// Receive in Canvas
penpot.ui.onMessage((msg) => { ...msg.pluginMessage })
```

Storage is `penpot.localStorage` — **synchronous and string-only**. Serialize
before writing, and never await it. This is the most frequent porting bug.

Message naming: UI → Canvas is `VERB_NOUN` (`CREATE_NODE`), Canvas → UI is
`NOUN_PAST_TENSE` (`NODE_CREATED`).

**A new action means four coordinated edits**: the type union in
`src/app/types/`, the Canvas handler in the action map, the bridge function, and
the routing entry in `loadUI.ts`. A missing one is a silent no-op.

## Rules

**Do**

- Keep Canvas and UI logic completely separate
- Reuse `@unoff/ui` components; use `FeatureStatus` / `isBlocked` for gating
- Type every message; extend the union before writing the component
- Await async Canvas APIs (`loadAllPagesAsync`, `loadFontAsync`, `getNodeByIdAsync`)
- Surface bridge errors via `POST_MESSAGE` + Sentry — never swallow them
- Put every user-facing string behind a Tolgee key

**Don't**

- Call the Penpot API from a Preact component, or import Preact in a bridge file
- Introduce hooks or `import React from 'react'` in application code
- Use `any`, or hardcode values that belong in `global.config.ts`
- Build a component that already exists in `@unoff/ui`

## Before declaring work done

- Both build outputs still work (`IS_PLUGIN=true` IIFE, and default single HTML)
- Lint and typecheck pass (`npm run lint`, `npm run typecheck`)
- Modals and interactive components keep focus trapping and keyboard access
- The relevant spec's **Acceptance criteria** are each satisfied

<!-- unoff:specs:start -->

## Functional specs

This project pairs **implementation skills** (how we build) with **functional
specs** (what the product does). Read both before writing code.

- **How** → `.claude/skills/unoff-create-plugin/` — architecture, conventions, platform APIs
- **What** → `specs/INDEX.md` — product behaviour and rules

When a task maps to a spec below, load that spec **and** the skill files for
the layers it declares in its frontmatter (`layers:`). The mapping from layer
to skill files is in `specs/INDEX.md`.

- `specs/token-list-audit-and-application.md` — Audit the current design token within a file and audit the applied ones, then the raw colors to switch them to the tokens.

<!-- unoff:specs:end -->
