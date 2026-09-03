---
name: figma-design-workflow
description: Step-by-step Figma spec-to-code workflow — node ID extraction, get_metadata/get_screenshot/get_design_context, the three annotation categories, and 1:1 visual parity validation. Use when implementing UI from a Figma URL or figma-desktop selection.
platform: figma
metadata:
  mcp-server: figma, figma-desktop
---

# Figma Design Workflow

Entry point: [implement-design.md](../implement-design.md) for workflow-agnostic rules and `@unoff/ui` mapping.

## Prerequisites

- Figma MCP server connected and accessible
- User provides a Figma URL: `https://figma.com/design/:fileKey/:fileName?node-id=1-2`
- **OR** with `figma-desktop`: node selected in the desktop app (no URL required)

## What Is a Spec Document?

A dedicated Figma page (or top-level frame) describing a feature's UI. It contains:

- **The visual layout** — the design composition
- **Component instances from the Figma library** — linked to `@unoff/ui` via embedded documentation (description, props, Storybook link)
- **Annotations** — metadata on specific layers carrying implementation instructions not visible in the static design

**Node IDs are not stable.** Spec documents may be duplicated across files or branches, and duplication assigns new IDs to every node. Never hardcode or cache a node ID from a previous session — always parse the URL provided by the user and re-fetch context each time.

## Annotations

Annotations are the primary channel for implementation detail that cannot be shown visually. They appear in `get_design_context` output as `data-*-annotations` HTML attributes. There are three categories — always check for all three.

### 1. Development (`data-development-annotations`)

Technical implementation specs — **how** a feature should be built.

- `"Spec: Average score given by every readability score"` — what a computed value represents
- `"Spec: Line height at each stop, (using %), converted to px in the preview"` — a calculation detail
- `"Spec: If enabled, round values (using px only)"` — conditional behavior

### 2. Content (`data-content-annotations`)

Content **not visible** in the static design — hidden options, dropdown menus, contextual choices, cross-references.

- `"Options:\n\n1. Sync with local variables\n2. Sync with local styles"` — dropdown/menu options absent from the static UI
- `"Idem: https://www.figma.com/design/..."` — cross-reference to another node with identical behavior

Content annotations often reveal **hidden UI states** (dropdowns, dialogs, expandable sections) that must be implemented even though they're absent from the screenshot.

### 3. Interaction (`data-interaction-annotations`)

User interaction behavior.

- `"Specs: The stops are indexed to their respective value. If moved, the ratio becomes 'Custom'..."` — a slider's dynamic behavior and its side effects on other components

### Processing annotations

1. Read every `data-*-annotations` attribute in the `get_design_context` output
2. Categorize each (development / content / interaction)
3. Implement the described behavior — annotations are instructions, not suggestions
4. Never render annotation text in the UI — it's metadata for the developer
5. Follow cross-references — a content annotation with a Figma link means fetch that node's design context too

## Step-by-step Workflow

Uses `get_metadata`, `get_screenshot`, `get_design_context`. Follow in order.

### Step 1 — Get the node ID

**From a URL:** `https://figma.com/design/:fileKey/:fileName?node-id=1-2` → file key is the segment after `/design/`; node ID is the `node-id` query value (e.g. `42-15`). With `figma-desktop`, `fileKey` is not needed — the server uses the currently open file.

**From selection (`figma-desktop` only, no URL given):** tools automatically use the currently selected node. The remote MCP server has no selection access — it requires a URL.

### Step 2 — Get the spec document structure

1. `get_metadata(fileKey, nodeId)` for the hierarchical node map
2. Identify main sections (e.g. `Bar`, `Scale`, `Details`, `Actions`) and their child node IDs
3. `get_screenshot(fileKey, nodeId)` for a full visual overview

### Step 3 — Fetch design context per section

```
get_design_context(fileKey=":fileKey", nodeId=":sectionNodeId")
```

Returns layout (Auto Layout, constraints, sizing), typography, color/design tokens, **component instances with embedded documentation**, **annotations**, and spacing.

Per section: read every component description, extract and catalog every annotation, and follow any cross-references found.

If the response is truncated, use Step 2's metadata to find smaller subsections and fetch children individually.

### Step 4 — Download assets

- If the MCP server returns a `localhost` source for an image/SVG, use it directly
- Do not import new icon packages or create placeholders when a `localhost` source exists — assets are served through the MCP server's assets endpoint

### Step 5 — Translate to project conventions

- Treat the MCP output (typically React + Tailwind) as a representation of design/behavior, not final code style
- Use the component documentation from `get_design_context` to configure each `@unoff/ui` component correctly
- Replace Tailwind utility classes with `unoff-ui` utilities (`texts`, `layouts`) or project design tokens
- Reuse existing `unoff-ui` components; respect existing routing/state/data-fetch patterns
- When unsure of an API, follow the Storybook link from the component description or visit https://ui.unoff.dev/

### Step 6 — Implement annotation-driven behavior

1. Development annotations → computed values, conditional logic, data transformations
2. Content annotations → hidden content (dropdown options, menu items, dialog content)
3. Interaction annotations → state changes on drag/interaction, side effects between components

Every annotation MUST be implemented — they are not optional. When a content annotation lists options, those are the literal items to render.

### Step 7 — Achieve 1:1 visual parity

Prioritize Figma fidelity. Avoid hardcoded values — use design tokens from Figma where available. When design-system tokens conflict with Figma specs, prefer design-system tokens but adjust spacing/sizing minimally to match. Follow WCAG requirements.

### Step 8 — Validate

- [ ] Layout matches (spacing, alignment, sizing)
- [ ] Typography and colors match exactly
- [ ] All `@unoff/ui` components are imported, not recreated
- [ ] Component props match the `get_design_context` documentation
- [ ] All development / content / interaction annotations are implemented
- [ ] Interactive states work (hover, active, disabled)
- [ ] Responsive behavior follows Figma constraints
- [ ] Assets render correctly; accessibility standards met

## Examples

### Implementing a feature from a spec document

User: "Implement this feature: `https://figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/MyPlugin?node-id=3353-235509`"

1. Parse fileKey=`RDBmy7x5HfkZHpafVqHNWQ`, nodeId=`3353-235509` → convert `-` to `:` → `3353:235509`
2. `get_metadata` then `get_screenshot` for structure and visual reference
3. For each section from metadata, `get_design_context` to fetch components + annotations
4. Read component descriptions to configure `@unoff/ui` imports (`Button`, `FormItem`, `Dropdown`, `SimpleSlider`, `MultipleSlider`, ...)
5. Extract and implement all annotations (computed values, hidden options, reactive behavior)
6. Validate against the screenshot and the Step 8 checklist

### Handling a cross-reference

User: "Build this panel: `https://figma.com/design/pR8mNv5KqXzGwY2JtCfL4D/Dashboard?node-id=10-5`"

1. Fetch metadata, screenshot, and design context for the panel
2. Find `data-content-annotations="Idem: https://www.figma.com/design/pR8mNv5KqXzGwY2JtCfL4D/Dashboard?node-id=20-8"`
3. Fetch the referenced node's design context — "Idem" means identical behavior
4. Implement both the visual design and the cross-referenced behavior; validate against both nodes

## Common Issues

| Issue | Cause | Solution |
|---|---|---|
| Output truncated | Design too complex / deeply nested | `get_metadata` for structure, then fetch sections individually |
| Design doesn't match after implementation | Visual discrepancy | Compare side-by-side with the Step 2 screenshot; check spacing/color/typography in the context data |
| Missing hidden UI (dropdowns, menus, dialogs) | Content annotations not processed | Search for `data-content-annotations` — these list the required hidden elements |
| Component props are wrong | Configured from appearance, not docs | Re-read the component description from `get_design_context`; follow the Storybook link |
| Reactive behavior missing | Interaction annotations not processed | Search for `data-interaction-annotations` |
| Assets not loading | MCP assets endpoint unreachable, or URL modified | Use the `localhost` asset URLs directly, unmodified |
| Design tokens differ from Figma | Project tokens diverge from Figma values | Prefer project tokens for consistency; adjust spacing/sizing to preserve visual fidelity |
| Cross-referenced spec is in a different file | Content annotation links to another file | Parse `fileKey` from the reference URL; it may need separate metadata fetching |

## Additional Resources

- [Figma MCP Server Documentation](https://developers.figma.com/docs/figma-mcp-server/)
- [Figma MCP Server Tools and Prompts](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)
- [Figma Variables and Design Tokens](https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma)
