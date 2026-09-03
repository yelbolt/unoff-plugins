---
name: penpot-design-workflow
description: Penpot spec-to-code workflow using @penpot/mcp code execution against penpot.selection — no predefined inspection tools, no annotations, no get_screenshot. Use when implementing UI from a Penpot selection.
platform: penpot
metadata:
  mcp-server: penpot
---

# Penpot Design Workflow

Entry point: [implement-design.md](../implement-design.md) for workflow-agnostic rules and `@unoff/ui` mapping.

## Prerequisites

- Penpot MCP server running: `npx -y @penpot/mcp@latest`
- Plugin connected via WebSocket (plugin must be open in Penpot on port 4402)
- MCP HTTP endpoint: `http://localhost:4401/mcp` — for Claude Code: `claude mcp add penpot -t http http://localhost:4401/mcp`
- User has the target frame/component **selected** in Penpot

## How It Works

The Penpot MCP has no predefined inspection tools — no `get_design_context` equivalent. Instead, the LLM writes and executes arbitrary Penpot Plugin API code against `penpot.selection`, and gets the result back. Full Plugin API access, but you must know the API.

## Step 1 — Confirm selection

Ask the user to select the frame or component in Penpot before starting. The MCP server reads from `penpot.selection`.

## Step 2 — Inspect the design with code

```typescript
// Get selected shapes with their properties
penpot.selection.map(shape => ({
  id: shape.id,
  name: shape.name,
  type: shape.type,
  x: shape.x,
  y: shape.y,
  width: shape.width,
  height: shape.height,
  fills: shape.fills,
  strokes: shape.strokes,
  borderRadius: shape.borderRadius,
}))
```

```typescript
// Inspect a board's (frame's) flex layout
const board = penpot.selection[0]  // Board type
const flex = board.getFlexLayout?.()
// { dir, horizontalSizing, verticalSizing, columnGap, rowGap, ... }
```

```typescript
// Read text node properties
const text = penpot.selection.find(s => s.type === 'text')
// text.fontFamily, text.fontSize (string), text.fontWeight (string), text.fills
```

## Step 3 — Screenshot for visual reference

There is no built-in `get_screenshot` tool. Use any screenshot capability available from the MCP, or ask the user for a screenshot of the selected area.

## Step 4 — Translate to `@unoff/ui`

Apply the same component mapping rules as Figma (see [implement-design.md](../implement-design.md)). The Penpot `fills` format uses HEX strings + opacity — convert to the project's color system.

Key Penpot → code translations:

- `shape.fills = [{ fillColor: '#FF0000', fillOpacity: 1 }]` — solid fill
- `shape.borderRadius` — corner radius (single value)
- `board.addFlexLayout()` → auto-layout (flex direction, gap, padding)
- `text.fontSize` is a **string** (e.g. `'14'`) — parse to number if needed
- `text.fontWeight` is a **string** (e.g. `'500'`)

## Step 5 — Validate

There are no annotations to cross-check, unlike Figma. Compare the implemented UI against a screenshot or live preview, relying on visual comparison and the shape property values captured in Step 2.

## Additional Resources

- [Penpot MCP Server](https://github.com/penpot/penpot/tree/develop/mcp) — setup, configuration, transport types
- [Penpot Plugin API](https://help.penpot.app/technical-guide/plugins/) — reference for code executed via the MCP
