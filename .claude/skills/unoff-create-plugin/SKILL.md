---
name: unoff-create-plugin
description: "Master index for the unoff plugin skill library. Use when building, debugging, or extending a Figma or Penpot plugin with React UI, Canvas bridge, @unoff/ui components, Supabase, Tolgee, Sentry, Mixpanel, Vite build, TypeScript, credits, feature flags, payments, or design implementation. Covers all layers: Canvas, Bridge, UI, Config, and Externals. Platform-specific skills are in bridge/figma/, bridge/penpot/, canvas/figma/, canvas/penpot/. UI, Config, and Externals are shared across platforms."
---

# Unoff Plugin Skills

Routing index. Load [core.md](./core.md) first, then only the rows matching your
task. Entry files route on to their own detail files — do not preload a whole
layer.

## Always first

| File                   | Contains                                                                       |
| ---------------------- | ------------------------------------------------------------------------------ |
| [core.md](./core.md)   | Stack facts, architecture, the 4-point message contract, platform differences   |

`core.md` is the single source of truth for those. No other file restates them.

## Canvas — platform-specific

| File                                                                             | Load when                                                    |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [canvas/figma/canvas-api.md](./canvas/figma/canvas-api.md)                       | `figma.*` — nodes, styles, variables, selection, viewport    |
| [canvas/figma/data-storage.md](./canvas/figma/data-storage.md)                   | Plugin Data, Shared Plugin Data, user prefs on Figma         |
| [canvas/figma/document-generation.md](./canvas/figma/document-generation.md)     | `Tag` / `Paragraph` / `Signature` output on Figma            |
| [canvas/penpot/canvas-api.md](./canvas/penpot/canvas-api.md)                     | `penpot.*` — boards, shapes, flex layout, fills, viewport    |
| [canvas/penpot/data-storage.md](./canvas/penpot/data-storage.md)                 | `penpot.localStorage` — the only Penpot storage              |
| [canvas/penpot/document-generation.md](./canvas/penpot/document-generation.md)   | `Tag` / `Paragraph` / `Signature` output on Penpot           |

## Bridge — platform-specific

| File                                                                                | Load when                                          |
| ----------------------------------------------------------------------------------- | -------------------------------------------------- |
| [bridge/figma/bridge-functions.md](./bridge/figma/bridge-functions.md)              | Writing a Figma bridge function                    |
| [bridge/figma/communication-pattern.md](./bridge/figma/communication-pattern.md)    | Wiring an action, debugging `onmessage` on Figma   |
| [bridge/penpot/bridge-functions.md](./bridge/penpot/bridge-functions.md)            | Writing a Penpot bridge function                   |
| [bridge/penpot/communication-pattern.md](./bridge/penpot/communication-pattern.md)  | Wiring an action, debugging `onMessage` on Penpot  |

## UI — shared

| File                                                     | Load when                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------- |
| [ui/component-library.md](./ui/component-library.md)     | Choosing an `@unoff/ui` component — **routes to detail files** |
| [ui/component-mapping.md](./ui/component-mapping.md)     | Design spec → exact npm export                                |
| [ui/component-patterns.md](./ui/component-patterns.md)   | Writing a component, HOCs, Canvas→UI handling                 |
| [ui/types-system.md](./ui/types-system.md)               | New types, `BaseProps`, unions, contexts, modals, events      |
| [ui/state-management.md](./ui/state-management.md)       | Nanostore atoms, user prefs, Canvas↔UI sync                   |
| [ui/css-theming.md](./ui/css-theming.md)                 | Styling, light/dark, z-index                                  |
| [ui/i18n.md](./ui/i18n.md)                               | Translations, new languages, language persistence             |
| [ui/error-handling.md](./ui/error-handling.md)           | Error surfacing, Sentry, `POST_MESSAGE`                       |
| [ui/accessibility.md](./ui/accessibility.md)             | Modals, toasts, focus trapping, portals                       |
| [ui/performance.md](./ui/performance.md)                 | Render cycles, bundle size, startup time                      |
| [ui/app-bootstrap.md](./ui/app-bootstrap.md)             | Startup order, adding a service to bootstrap                  |
| [ui/external-services.md](./ui/external-services.md)     | Supabase, Sentry, Mixpanel, Tolgee, Notion CMS Worker         |

## Config — shared

| File                                                     | Load when                                                  |
| -------------------------------------------------------- | ---------------------------------------------------------- |
| [config/global-config.md](./config/global-config.md)     | New config value, `ConfigContext`, env var wiring          |
| [config/feature-flags.md](./config/feature-flags.md)     | Gating by plan tier, editor, or service; test override     |
| [config/credits-system.md](./config/credits-system.md)   | Usage limits, credit gates, `isReached → isBlocked`        |
| [config/vite-build.md](./config/vite-build.md)           | Vite plugins, env vars, platform CSS exclusion             |
| [config/code-quality.md](./config/code-quality.md)       | Lint rules, Vitest, CI/CD gates                            |

## Externals — shared

| File                                                             | Load when                                                          |
| ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| [externals/implement-design.md](./externals/implement-design.md) | Building UI from a design spec — **routes to detail files**        |
| [externals/payment-systems.md](./externals/payment-systems.md)   | Choosing a payment model (Option A Figma-only, Option B universal) |
