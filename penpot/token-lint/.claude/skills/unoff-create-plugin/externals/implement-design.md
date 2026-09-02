---
name: implement-design
description: Translates design specs (Figma or Penpot) into production-ready code with 1:1 visual fidelity. Use when implementing UI from a design spec, when user mentions "implement design", "generate code", "implement component", provides Figma URLs or has a Penpot selection open, or asks to build components matching design specs. Requires Figma MCP or Penpot MCP server connection depending on platform.
metadata:
  mcp-server: figma, figma-desktop, penpot
---

# Implement Design

Workflow-agnostic rules and component mapping for turning a design spec into code. Load one detail file below for the platform-specific procedure — never both.

## Platform Comparison

| | Figma | Penpot |
|---|---|---|
| MCP approach | Predefined tools (`get_design_context`, `get_metadata`, `get_screenshot`) | Arbitrary code execution against `penpot.selection` |
| Input | URL (`figma.com/design/:fileKey/...?node-id=`) | Selection in Penpot (no URL parsing) |
| Connection | Remote or desktop app | WebSocket to running plugin (`http://localhost:4401/mcp`) |
| Annotations | `data-*-annotations` attributes in output | Not available — rely on visual inspection |
| Asset serving | `localhost` URLs from MCP server | Via plugin code execution |

Both platforms should have an established design system / component library (preferred) before starting.

## Workflow — load one

| File | Load when |
|---|---|
| [design/figma-workflow.md](./design/figma-workflow.md) | Working from a Figma URL or a `figma-desktop` selection |
| [design/penpot-workflow.md](./design/penpot-workflow.md) | Working from a Penpot selection via `@penpot/mcp` |

## `@unoff/ui` Component Mapping

The designs use the external `@unoff/ui` library. On Figma it's connected via embedded documentation in component descriptions (props, variants, accessibility, Storybook links). On Penpot, mapping is manual — match shape names to the library by the same naming convention.

> Full Figma name → npm export → Storybook URL table: [ui/component-mapping.md](../ui/component-mapping.md)

1. Read the component description (Figma) or match the shape name (Penpot) to find the `@unoff/ui` export
2. Configure it using the documented props/variants; consult Storybook (https://ui.unoff.dev) for edge cases
3. Import directly: `import { Button, FormItem, Dropdown, SimpleSlider, MultipleSlider } from '@unoff/ui'`
4. No match in the library → build a custom component composed from `unoff-ui` primitives (e.g. `Button` + `Icon`), styled with its utility classes (`texts`, `layouts`) for consistent typography/spacing

## Implementation Rules

- Place components in the project's design-system directory; follow its naming conventions; avoid inline styles unless truly needed for dynamic values
- **Check `@unoff/ui` first** — reuse over recreation; document any new custom component that has no library match
- Map design tokens to project tokens; avoid hardcoded values
- Add TypeScript types for component props and JSDoc for exported components
- Figma only: annotations (`data-development-annotations`, `data-content-annotations`, `data-interaction-annotations`) are implementation requirements, not comments — see [design/figma-workflow.md](./design/figma-workflow.md)

## Best Practices

- **Reuse over recreation** — check `@unoff/ui` and its embedded/Storybook docs before building a new component; codebase consistency beats exact design replication
- **Design system first** — when in doubt, prefer `unoff-ui` patterns over a literal translation of the spec
- **Incremental validation** — validate against the source design frequently, not only at the end
- **Document deviations** — if you must diverge from the spec (accessibility, technical constraints), say why in a code comment

## Additional Resources

- [unoff-ui Storybook](https://ui.unoff.dev/) — component docs, props, variants, interactive examples
- Platform-specific MCP references are linked from the workflow files above
