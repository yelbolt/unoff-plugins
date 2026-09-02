# Penpot Plugin Template Architecture

## Overview

This template is a Penpot plugin built with **TypeScript**, **Preact** (aliased as React via `preact/compat`), and **Vite**. The architecture strictly separates Canvas logic (Penpot API) from UI logic (Preact) through a message-based communication system.

## Full Documentation

The architecture below is documented in depth as the **unoff skills** — free, open source, and installed into your project by `unoff ai`:

```bash
unoff ai        # pick your assistants, then install skills, rules and agents
```

They land in the directory each assistant reads (`.claude/skills/unoff-create-plugin/`, `.agents/skills/unoff-create-plugin/`, …) and are organized into five layers:

| Layer | Covers | Skill files |
|-------|--------|-------------|
| **Canvas** | Penpot API operations | `canvas/penpot/canvas-api.md`, `canvas/penpot/data-storage.md` |
| **Bridge** | UI ↔ Canvas communication | `bridge/penpot/communication-pattern.md`, `bridge/penpot/bridge-functions.md` |
| **Config** | Feature flags, credits, build system | `config/global-config.md`, `config/feature-flags.md`, `config/credits-system.md` |
| **UI** | Preact application | `ui/component-library.md`, `ui/component-patterns.md`, `ui/state-management.md`, `ui/types-system.md`, `ui/i18n.md` |
| **Externals** | Integration workflows | `ui/external-services.md`, `externals/payment-systems.md` |

Browse them online at [uno.ylb.lt/docs](https://uno.ylb.lt/docs) — free and open to everyone, no strings attached.

### Specs — what your plugin does

The skills describe **how** this template is built. They know nothing about **what you are building** — that is what specs are for, and it is the part worth investing in:

```bash
unoff add specs     # scaffold a spec: what it does, its rules, the layers it touches
unoff sync specs    # rebuild specs/INDEX.md and point every assistant file at it
```

A spec declares the `layers` it touches, in the same vocabulary as the table above. That is how an assistant goes from _what to build_ to _which skill files to read_ — no guessing. Write the spec first, then let it build.

### AI Tools Configuration

Rules, agents and MCP configuration are **generated per assistant** by the CLI — the template ships none of them, so nothing drifts out of sync:

| Tool | Rules | Agents |
|------|-------|--------|
| **Claude Code** | `CLAUDE.md` | `.claude/agents/` |
| **GitHub Copilot** | `.github/copilot-instructions.md` | `.github/agents/` |
| **ChatGPT / Codex** | `AGENTS.md` | role table in rules |
| **Cursor** | `.cursor/rules/project.mdc` | role table in rules |
| **Windsurf** | `.windsurf/rules/project.md` | role table in rules |

```bash
unoff add rules     # rules + MCP for every configured assistant
unoff add agents    # the five layer specialists + the conformance reviewer
unoff ai status     # what is configured, and what is actually installed
```

Each rules file carries a managed block pointing at `specs/INDEX.md`, refreshed by `unoff sync specs`.

> Everything above is documented for free. Guidance tailored to your own plugin — monitoring, analytics, licensing — is the part you unlock: [see what it takes](https://uno.ylb.lt/start).

---

## Directory Structure

```
Token Lint/
├── .github/                    # GitHub configuration
│   ├── CODEOWNERS             # Code ownership
│   ├── ISSUE_TEMPLATE/        # Issue templates
│   └── workflows/             # CI/CD workflows
├── specs/                      # What your plugin does — unoff add specs
│   ├── INDEX.md               # Generated routing table — unoff sync specs
│   └── *.md                   # One spec per feature, declaring its layers
├── .unoff/skills/              # Skills submodule — unoff add skills (optional)
├── .vscode/                    # VS Code settings
├── workers/                    # Cloudflare Workers (git submodules, optional)
│   ├── announcement-worker/    # unoff add announcement-worker
│   ├── auth-worker/            # unoff add auth-worker
│   └── cors-worker/            # unoff add cors-worker
├── src/
│   ├── bridges/               # Penpot Canvas Layer
│   │   ├── loadUI.ts          # Message Router (central hub)
│   │   ├── checks/            # Validation functions
│   │   └── plans/             # Subscription management
│   ├── app/                   # Preact UI Application
│   │   ├── index.tsx          # Entry point & service initialization
│   │   ├── config/            # Contexts (Config, Theme)
│   │   ├── content/           # Assets & i18n
│   │   ├── external/          # External services
│   │   │   ├── auth/          # Supabase authentication
│   │   │   ├── cms/           # Notion CMS
│   │   │   │   ├── index.ts               # initNotion() + buildHeaders()
│   │   │   │   ├── getAnnouncements.ts    # Fetch announcements by platform
│   │   │   │   ├── getOnboarding.ts       # Fetch onboarding by platform+editor
│   │   │   │   └── checkAnnouncementsVersion.ts # Version check
│   │   │   ├── license/       # License validation
│   │   │   ├── monitoring/    # Sentry
│   │   │   ├── tracking/      # Mixpanel
│   │   │   └── translation/   # Tolgee i18n service
│   │   ├── stores/            # State management (Nanostores atoms)
│   │   │   ├── consent.ts
│   │   │   ├── credits.ts
│   │   │   ├── features.ts
│   │   │   ├── history.ts
│   │   │   └── preferences.ts
│   │   ├── types/             # TypeScript definitions
│   │   │   ├── app.ts
│   │   │   ├── config.ts
│   │   │   ├── events.ts
│   │   │   ├── messages.ts
│   │   │   ├── translations.ts
│   │   │   └── user.ts
│   │   ├── ui/                # Preact components
│   │   │   ├── App.tsx
│   │   │   ├── components/    # Reusable components (HOCs)
│   │   │   ├── contexts/      # Application contexts
│   │   │   ├── modules/       # Feature modules
│   │   │   │   └── modals/    # Modal components
│   │   │   ├── services/      # UI services
│   │   │   ├── stylesheets/   # CSS
│   │   │   └── subcontexts/   # Nested contexts
│   │   └── utils/             # UI utilities
│   │       ├── pluginMessage.ts  # Send messages to Canvas
│   │       └── setContexts.ts
│   ├── utils/                 # Global utilities
│   │   ├── i18n.ts
│   │   └── setData.ts
│   └── global.config.ts       # Global configuration
├── unoff.config.json          # Which assistants this project targets
├── .eslintrc.json             # ESLint configuration
├── .prettierrc.json           # Prettier configuration
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite build configuration
├── package.json               # Dependencies & scripts
└── manifest.json              # Penpot plugin manifest
```

## Communication System

### Message Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         UI Component                            │
│              (PureComponent, src/app/ui/)                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ sendPluginMessage()
                         │ (src/app/utils/pluginMessage.ts)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       loadUI.ts                                 │
│                  (src/bridges/loadUI.ts)                        │
│                                                                 │
│  penpot.ui.onMessage(async (msg: any) => {                   │
│    const path = msg.pluginMessage                               │
│    const actions = {                                            │
│      ACTION_NAME: async () => { ... },                         │
│    }                                                            │
│    actions[path.type]?.()                                       │
│  }                                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Calls bridge functions
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Bridge Functions                             │
│              (src/bridges/checks/, plans/)                      │
│                                                                 │
│  - checkUserConsent()                                           │
│  - createNode()                                                 │
│  - saveToClientStorage()                                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Interacts with
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Penpot API                                 │
│                                                                 │
│  - penpot.createRectangle()                                     │
│  - penpot.localStorage.setItem()                                │
│  - penpot.selection                                             │
└─────────────────────────────────────────────────────────────────┘
                         │
                         │ Response via
                         │ penpot.ui.sendMessage()
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    UI Component                                 │
│         window.addEventListener('platformMessage', ...)         │
└─────────────────────────────────────────────────────────────────┘
```

### Message Flow

#### 1. UI → Canvas

```typescript
// src/app/ui/components/MyComponent.tsx
import { sendPluginMessage } from '../../utils/pluginMessage'

handleAction = () => {
  sendPluginMessage({
    pluginMessage: {
      type: 'CREATE_NODE',
      data: { nodeType: 'RECTANGLE', width: 100, height: 100 }
    }
  })
}
```

#### 2. Canvas Receives and Routes

```typescript
// src/bridges/loadUI.ts
penpot.ui.onMessage(async (msg: any) => {
  const path = msg.pluginMessage  // always unwrap .pluginMessage
  const actions: { [key: string]: () => void } = {
    CREATE_NODE: async () => {
      const node = penpot.createRectangle()
      node.resize(path.data.width, path.data.height)

      // Penpot API operations
      penpot.ui.sendMessage({
        type: 'NODE_CREATED',
        data: { id: node.id, name: node.name }
      })
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

#### 3. UI Receives Response

```typescript
// src/app/ui/components/MyComponent.tsx
componentDidMount = () => {
  window.addEventListener('platformMessage', this.handleMessage)
}

componentWillUnmount = () => {
  window.removeEventListener('platformMessage', this.handleMessage)
}

handleMessage = (event: MessageEvent) => {
  const msg = (event as CustomEvent).detail
  if (msg?.type === 'NODE_CREATED') {
    this.setState({ nodeId: msg.data.id })
  }
}
```

## Key Components

### 1. `loadUI.ts` — Message Router

**Location**: `src/bridges/loadUI.ts`

**Responsibilities**:
- Initializes the plugin UI window
- **Centralized router** for all UI → Canvas messages
- Manages window size persistence
- Loads initial data (user, preferences, etc.)

**Pattern**:
```typescript
const loadUI = async () => {
  penpot.ui.open('Token Lint', globalConfig.urls.uiUrl, { width, height })

  penpot.ui.onMessage(async (msg: any) => {
    const path = msg.pluginMessage
    const actions = {
      LOAD_DATA: async () => { /* ... */ },
      CREATE_NODE: async () => { /* ... */ },
      SAVE_PREFERENCES: async () => { /* ... */ },
    }

    try {
      return actions[path.type]?.()
    } catch {
      return null
    }
  }
}
```

### 2. `pluginMessage.ts` — Message Sender

**Location**: `src/app/utils/pluginMessage.ts`

**Responsibilities**:
- **Centralized service** for sending messages from UI to Canvas
- Abstraction layer over `parent.postMessage()`

```typescript
sendPluginMessage({
  pluginMessage: {
    type: 'ACTION_NAME',
    data: { /* payload */ }
  }
})
```

Always use `sendPluginMessage()` from UI components — never call `parent.postMessage()` directly.

## Directory Organization

### `/src/bridges/` — Canvas Logic

| Directory/File | Description |
|----------------|-------------|
| `loadUI.ts` | Main message router |
| `checks/` | Validation functions (consent, license, credits, trial, editor, announcements, preferences) |
| `plans/` | Subscription management (enableTrial, payProPlan) |

**Rules**:
- Penpot API interaction only
- Async/await functions with try/catch
- No Preact code, no DOM manipulation

### `/src/app/external/cms/` — Notion CMS

The CMS layer uses a module-scope singleton initialized once at startup:

| File | Description |
|------|-------------|
| `index.ts` | `initNotion(apiKey)` + `buildHeaders()` — state only, no re-exports |
| `getAnnouncements.ts` | Fetch announcements filtered by `Platform` |
| `getOnboarding.ts` | Fetch onboarding steps filtered by `Platform` + `Editor` |
| `checkAnnouncementsVersion.ts` | Fetch the latest announcement version string |

```typescript
// index.ts
let notionApiKey: string | null = null
export const initNotion = (apiKey: string) => { notionApiKey = apiKey }
export const buildHeaders = (): HeadersInit =>
  notionApiKey ? { Authorization: notionApiKey } : {}

// index.tsx (app entry)
if (globalConfig.env.isNotionEnabled && notionApiKey !== undefined)
  initNotion(notionApiKey)
```

> ⚠️ `VITE_NOTION_API_KEY` is for local development only. In production the key lives as a Cloudflare Worker secret.

### `/src/app/stores/` — State Management (Nanostores)

State is managed via **Nanostores atoms** (`atom` from `nanostores`), not Zustand. Atoms are prefixed with `$` and subscribed to in components via `@nanostores/preact`.

| File | Description |
|------|-------------|
| `consent.ts` | User consent state |
| `credits.ts` | Credits count atom (`$creditsCount`) |
| `features.ts` | Feature flags state |
| `history.ts` | Action history state |
| `preferences.ts` | User preferences state |

```typescript
import { atom } from 'nanostores'
export const $creditsCount = atom<number>(0)

// In component
import { useStore } from '@nanostores/preact'
const credits = useStore($creditsCount)
```

### `/src/app/` — UI Application

**Rules**:
- **PureComponent class** pattern with HOCs (`WithConfig`, `WithTranslation`)
- Use `sendPluginMessage()` to communicate with Canvas
- Strict TypeScript — no `any`
- Use `@unoff/ui` and `@unoff/utils`
- No direct Penpot API calls, no `parent.postMessage()` directly
- Never recreate components that already exist in `@unoff/ui`

### UI Component Libraries

#### `@unoff/ui`

Pre-built UI components for Penpot plugins. Full API at [ui.unoff.dev](https://ui.unoff.dev/).

**Available components**:
- **Layout**: Bar, Layout, Section, SectionTitle, SimpleItem, List, Card
- **Forms**: Button, Input, Dropdown, FormItem, SimpleSlider
- **Feedback**: Dialog, SemanticMessage, Notification, Consent
- **Navigation**: Tabs, Menu
- **Display**: Icon, Tooltip, Chip, IconChip, Feature

**CSS utilities**: `layouts` (layout classes), `texts` (typography classes)

```typescript
import { Bar, Button, layouts, texts } from '@unoff/ui'
import { doClassnames, FeatureStatus } from '@unoff/utils'

class MyPanel extends React.PureComponent<Props, State> {
  static features = (planStatus, config, service, editor) => ({
    MY_FEATURE: new FeatureStatus({
      features: config.features,
      featureName: 'MY_FEATURE',
      planStatus, currentService: service, currentEditor: editor,
    }),
  })

  render() {
    const features = MyPanel.features(/* ... */)
    return (
      <Button
        type="primary"
        label="Action"
        feature="MY_FEATURE"
        isBlocked={features.MY_FEATURE.isBlocked()}
        action={this.handleAction}
      />
    )
  }
}
```

#### `@unoff/utils`

```typescript
import { doClassnames, FeatureStatus } from '@unoff/utils'

const feature = new FeatureStatus({ features, featureName: 'CREATE_SHAPES', planStatus, currentService: service, currentEditor: editor })
feature.isActive()   // enabled?
feature.isBlocked()  // needs upgrade?
feature.isNew()      // show "new" badge?

const className = doClassnames([layouts['snackbar--medium'], texts['type'], isActive && 'active'])
```

### `/src/utils/` — Global Utilities

| File | Description |
|------|-------------|
| `i18n.ts` | `createI18n()` for Canvas-side translations (ICU format) |
| `setData.ts` | Data management helpers |

## Configuration and Code Quality

### Project Root

| File | Purpose |
|------|---------|
| `.eslintrc.json` | ESLint rules |
| `.prettierrc.json` | Prettier configuration |
| `tsconfig.json` | TypeScript strict mode |
| `vite.config.ts` | Dual Vite build (IIFE Canvas + single-file UI) |
| `unoff.config.json` | Assistants targeted, specs folder, skills path |

Assistant rules and MCP files are not listed here — they are generated by `unoff add rules` for the assistants you selected, and regenerated with `--force`.

### Available Scripts

```json
{
  "start:dev":           "Development build with hot reload",
  "build:prod":          "Production build",
  "typecheck":           "TypeScript type checking",
  "lint":                "ESLint check and auto-fix",
  "format":              "Format with Prettier",
  "start:announcements": "Start announcement worker (port 8888) — added by unoff add announcement-worker",
  "start:token":         "Start auth worker (port 8787) — added by unoff add auth-worker",
  "start:cors":          "Start CORS worker (port 8989) — added by unoff add cors-worker"
}
```

Worker scripts are injected automatically by `unoff add <worker>`.

## Integrated External Services




### Notion
- **Location**: `src/app/external/cms/`
- **Usage**: Announcements and onboarding content
- **Environment variables**: `VITE_ANNOUNCEMENTS_WORKER_URL`, `VITE_NOTION_ANNOUNCEMENTS_ID`, `VITE_NOTION_ONBOARDING_ID`, `VITE_NOTION_API_KEY` (local dev only)
- **Production**: API key stored as a Cloudflare Worker secret (`wrangler secret put NOTION_API_KEY`)

## Best Practices

### Communication
1. Always use `sendPluginMessage()` from UI components
2. Always route messages through `loadUI.ts`
3. Use the `actions` map pattern for handlers
4. Send responses back with `penpot.ui.sendMessage()`

### TypeScript
1. Strict mode enabled — no `any` (use `unknown` if necessary)
2. Prefer `interface` for objects, `type` for unions/intersections
3. Keep types in `src/app/types/`

### Preact/React
1. **PureComponent class** pattern (not functional components)
2. HOCs: `WithConfig` then `WithTranslation` (order matters)
3. Static `features` method for `FeatureStatus` checks
4. One component per file

### State Management
1. Nanostores `atom` for shared state (prefix with `$`)
2. `useStore()` from `@nanostores/preact` in components
3. `penpot.localStorage` for persistent user preferences (synced via bridge)

### Organization
1. Strict Canvas / UI separation — never mix them
2. One file per responsibility
3. Name bridge files with verbs, components with nouns

## Development Workflow

### Adding a New Feature

Start with the spec — it is what turns "add the paywall" into a set of files your assistant knows to read:

1. **Write the spec** (`unoff add specs`) — problem, user flow, rules, acceptance criteria, and the `layers` it touches
2. **Sync it** (`unoff sync specs`) — regenerates `specs/INDEX.md` and points every assistant file at it

Then implement, layer by layer:

3. **Define types** (`src/app/types/`)
4. **Create bridge logic** (`src/bridges/`)
5. **Add action in `loadUI.ts`**
6. **Create UI components** (`src/app/ui/`)
7. **Wire communication** (`sendPluginMessage` + `componentDidMount` listener)
8. **Add to store if needed** (`src/app/stores/`)
9. **Add translations** (`src/app/content/translations/`)

The spec's acceptance criteria are what "done" means — check each one before calling the feature finished.

### Adding a Worker

```bash
# Add a Cloudflare Worker as a git submodule
unoff add announcement-worker

# Install workspace dependencies
npm install

# Start the worker locally
npm run start:announcements
```

### Useful Commands

```bash
# Development
unoff dev           # or: npm run start:dev

# Production build
unoff build         # or: npm run build:prod

# Code quality
unoff check         # lint + typecheck
unoff format        # Prettier

# AI assistants
unoff ai            # pick assistants, install skills + rules + agents + specs
unoff ai status     # what is configured, and what is installed
unoff add specs     # scaffold a spec
unoff sync specs    # rebuild the spec index + assistant pointers
unoff sync skills   # re-link the skills submodule

# Workers
unoff add <worker>      # Add a worker submodule
unoff remove <worker>   # Remove a worker submodule
```

## Resources

- [Unoff documentation](https://uno.ylb.lt/docs) — the skills, layer by layer. Free and open
- [Tailored guidance](https://uno.ylb.lt/start) — a walkthrough on your own plugin (monitoring, analytics, licensing), to unlock
- [Penpot Plugin API](https://help.penpot.app/technical-guide/plugins/)
- [Preact Documentation](https://preactjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [unoff-ui Storybook](https://ui.unoff.dev/)
- [Nanostores](https://github.com/nanostores/nanostores)
- [Tolgee](https://tolgee.io/)

---

**Note**: This document is automatically generated when creating a plugin with `unoff create penpot-plugin`.
