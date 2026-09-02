---
name: penpot-document-generation
description: Composing structured Penpot documents using the Tag, Paragraph, and Signature canvas components from unoff-template-penpot. Use when generating plugin output boards with text blocks, labels, and plugin branding on the Penpot canvas.
platform: penpot
---

# Document Generation — Penpot Canvas

## Overview

Three primitive components in `src/canvas/` compose structured canvas output:

| Component   | File           | Purpose                                       |
| ----------- | -------------- | --------------------------------------------- |
| `Tag`       | `Tag.ts`       | Pill-shaped label — inline metadata or status |
| `Paragraph` | `Paragraph.ts` | Text block                                    |
| `Signature` | `Signature.ts` | Plugin branding footer (tagline + logotype)   |

All three emit Penpot `Board`s and **must run in Canvas context only**.

**Key differences from Figma:**
- No `await figma.loadFontAsync()` needed — just instantiate directly
- `penpot.createBoard()` instead of `figma.createFrame()`
- Fills use HEX strings + opacity (not RGB 0–1 objects)
- `board.borderRadius` instead of `frame.cornerRadius`
- Layout via `board.addFlexLayout()` → `flex` object
- `penpot.viewport.zoomIntoView()` instead of `figma.viewport.scrollAndZoomIntoView()`

---

## Shared Styles

```typescript
import { darkColor, bodyFontFamily, propertyFontFamily } from './styles'
// darkColor          = '#00212B'   (dark teal, HEX)
// bodyFontFamily     = 'Lexend'
// propertyFontFamily = 'Martian Mono'
```

No font loading step required.

---

## Tag

Pill-shaped label for status badges and metadata.

### Constructor

```typescript
new Tag({
  name: string             // Penpot node name
  content: string          // Text inside the pill
  fontSize?: number        // Default: 8
  fontFamily?: FontFamily  // Default: 'Martian Mono'
  backgroundColor?: { rgb: { r; g; b }; alpha: number }  // Default: white 50%
                           // r/g/b are 0–1 — converted internally via chroma-js
  url?: string | null      // Penpot does not render hyperlinks, but kept for API parity
})
```

### Variants

```typescript
// Basic pill
parent.appendChild(new Tag({ name: '_status', content: 'Active' }).makeNodeTag())

// Pill + colored dot indicator  (gl = [r, g, b, a], values 0–1)
parent.appendChild(new Tag({ name: '_status', content: 'Online' }).makeNodeTagwithIndicator([0, 0.8, 0.4, 1]))

// Compact version (tighter padding)
parent.appendChild(new Tag({ name: '_status', content: 'Online' }).makeNodeTagwithIndicator([0, 0.8, 0.4, 1], true))

// Pill + circular avatar image
// imageData comes from penpot.uploadMediaUrl() or similar
parent.appendChild(new Tag({ name: '_user', content: 'Alice' }).makeNodeTagWithAvatar(imageData))
```

---

## Paragraph

Text block inside a frosted-glass board.

### Constructor

```typescript
new Paragraph({
  name: string            // Penpot node name
  content: string         // Text content
  type: 'FILL' | 'FIXED' // Layout mode
  width?: number          // Required when type === 'FIXED'
  fontSize?: number       // Default: 12
  fontFamily?: FontFamily // Default: 'Lexend'
})
```

### Layout modes

| Mode    | Behaviour                                                                    |
| ------- | ---------------------------------------------------------------------------- |
| `FILL`  | `child.layoutChild.horizontalSizing = 'fill'` — stretches to parent width   |
| `FIXED` | `board.resize(width, 100)` — explicit fixed width                            |

```typescript
// FILL — inside vertical flex board
parent.appendChild(new Paragraph({ name: '_body', content: 'Text here.', type: 'FILL' }).node)

// FIXED — explicit width
parent.appendChild(new Paragraph({ name: '_note', content: 'Note.', type: 'FIXED', width: 320 }).node)
```

> Note: Penpot's Paragraph does **not** auto-link URLs (unlike the Figma version).

---

## Signature

Full-width branding footer. Two columns: tagline + plugin link | logotype SVG.

```typescript
parent.appendChild(new Signature().node)
```

The SVG logotype is embedded via `penpot.createShapeFromSvg()` and resized to 165×57px. Replace the tagline and URL in `Signature.ts` → `makeNodeInfo()` before shipping.

---

## Composing a Document Board

```typescript
import Paragraph from './Paragraph'
import Signature from './Signature'
import Tag from './Tag'

export const createDocument = (data: { title: string; body: string; status: string }) => {
  // No font loading needed — just create directly

  // 1. Outer container (vertical flex board)
  const doc = penpot.createBoard()
  doc.name = 'Document'
  doc.borderRadius = 16
  doc.fills = [{ fillColor: '#FFFFFF', fillOpacity: 1 }]
  doc.horizontalSizing = 'fix'
  doc.verticalSizing = 'auto'
  doc.resize(480, 100)

  const flex = doc.addFlexLayout()
  flex.dir = 'column'
  flex.verticalSizing = 'auto'
  flex.horizontalPadding = flex.verticalPadding = 16
  flex.rowGap = 8

  // 2. Tag row (horizontal flex board)
  const tagRow = penpot.createBoard()
  tagRow.name = '_tags'
  tagRow.fills = []
  tagRow.horizontalSizing = 'auto'
  tagRow.verticalSizing = 'auto'

  const tagRowFlex = tagRow.addFlexLayout()
  tagRowFlex.dir = 'row'
  tagRowFlex.horizontalSizing = 'auto'
  tagRowFlex.verticalSizing = 'auto'
  tagRowFlex.columnGap = 4

  tagRow.appendChild(
    new Tag({ name: '_status', content: data.status }).makeNodeTagwithIndicator([0, 0.7, 0.4, 1])
  )
  if (tagRow.layoutChild) tagRow.layoutChild.horizontalSizing = 'fill'
  doc.appendChild(tagRow)

  // 3. Title paragraph
  const title = new Paragraph({ name: '_title', content: data.title, type: 'FILL', fontSize: 16 })
  doc.appendChild(title.node)

  // 4. Body paragraph
  const body = new Paragraph({ name: '_body', content: data.body, type: 'FILL' })
  doc.appendChild(body.node)

  // 5. Signature footer
  doc.appendChild(new Signature().node)

  // 6. Place and focus
  penpot.currentPage?.appendChild(doc)
  penpot.viewport.zoomIntoView([doc])

  return doc
}
```

---

## Tag Row Pattern

```typescript
const tagRow = penpot.createBoard()
tagRow.name = '_meta'
tagRow.fills = []
tagRow.horizontalSizing = 'auto'
tagRow.verticalSizing = 'auto'

const flex = tagRow.addFlexLayout()
flex.dir = 'row'
flex.horizontalSizing = 'auto'
flex.columnGap = 4

tagRow.appendChild(new Tag({ name: '_v', content: 'v1.0.0' }).makeNodeTag())
tagRow.appendChild(new Tag({ name: '_author', content: 'Alice' }).makeNodeTag())

if (tagRow.layoutChild) tagRow.layoutChild.horizontalSizing = 'fill'
parent.appendChild(tagRow)
```

---

## Component API Summary

### `Tag`

| Method                                      | Returns | Notes                              |
| ------------------------------------------- | ------- | ---------------------------------- |
| `makeNodeTag()`                             | `Board` | Basic pill                         |
| `makeNodeTagwithIndicator(gl, isCompact?)`  | `Board` | Pill + dot; `gl` = `[r,g,b,a]`    |
| `makeNodeTagWithAvatar(imageData?)`         | `Board` | Pill + avatar ellipse              |

### `Paragraph`

| Property | Type    | Notes                          |
| -------- | ------- | ------------------------------ |
| `.node`  | `Board` | Outer wrapper — append this    |

### `Signature`

| Property | Type    | Notes                          |
| -------- | ------- | ------------------------------ |
| `.node`  | `Board` | Full-width footer — append this|

---

## Best Practices

```typescript
// ✅ No font loading step needed
// ✅ Append .node for Paragraph / Signature
// ✅ Append the return value of makeNodeTag() etc. for Tag
// ✅ Use penpot.currentPage?.appendChild() (guard against null)
// ✅ Always zoomIntoView after generating content
penpot.currentPage?.appendChild(doc)
penpot.viewport.zoomIntoView([doc])

// ✅ Make children fill parent width when inside vertical flex
if (child.layoutChild) child.layoutChild.horizontalSizing = 'fill'

// ❌ Never import canvas components in the React UI layer
// ❌ Don't use cornerRadius — use borderRadius
// ❌ Don't pass RGB objects to fills — use HEX strings
```

---

## Figma vs Penpot Quick Reference

| Concept                | Figma                                        | Penpot                                        |
| ---------------------- | -------------------------------------------- | --------------------------------------------- |
| Frame / Board          | `figma.createFrame()`                        | `penpot.createBoard()`                        |
| Font loading           | `await figma.loadFontAsync(...)`             | Not needed                                    |
| Auto-layout            | `frame.layoutMode = 'VERTICAL'`             | `board.addFlexLayout()` → `flex.dir = 'column'` |
| Padding                | `frame.paddingTop/paddingLeft...`            | `flex.verticalPadding`, `flex.horizontalPadding` |
| Gap                    | `frame.itemSpacing`                          | `flex.rowGap` / `flex.columnGap`              |
| Child sizing           | `child.layoutGrow = 1`                       | `child.layoutChild.horizontalSizing = 'fill'` |
| Corner radius          | `frame.cornerRadius`                         | `board.borderRadius`                          |
| Solid fill             | `[{ type: 'SOLID', color: { r, g, b } }]`   | `[{ fillColor: '#HEX', fillOpacity: a }]`     |
| Append to page         | `figma.currentPage.appendChild(node)`        | `penpot.currentPage?.appendChild(shape)`      |
| Scroll into view       | `figma.viewport.scrollAndZoomIntoView([n])`  | `penpot.viewport.zoomIntoView([shape])`       |
