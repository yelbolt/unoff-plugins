---
name: figma-document-generation
description: Composing structured Figma documents using the Tag, Paragraph, and Signature canvas components from unoff-template-figma. Use when generating plugin output frames with text blocks, labels, and plugin branding on the Figma canvas.
platform: figma
---

# Document Generation — Figma Canvas

## Overview

Three primitive components in `src/canvas/` compose structured canvas output:

| Component   | File           | Purpose                                       |
| ----------- | -------------- | --------------------------------------------- |
| `Tag`       | `Tag.ts`       | Pill-shaped label — inline metadata or status |
| `Paragraph` | `Paragraph.ts` | Text block with optional URL auto-linking     |
| `Signature` | `Signature.ts` | Plugin branding footer (tagline + logotype)   |

All three emit Figma `FrameNode`s and **must run in Canvas context only**.

---

## Shared Styles

```typescript
import { darkColor, bodyFontFamily, propertyFontFamily } from './styles'
// darkColor          = { r: 0, g: 0.129, b: 0.168 }
// bodyFontFamily     = 'Lexend'
// propertyFontFamily = 'Martian Mono'
```

### Font Loading (Required)

Load both fonts **before** instantiating any component:

```typescript
await Promise.all([
  figma.loadFontAsync({ family: 'Lexend', style: 'Medium' }),
  figma.loadFontAsync({ family: 'Martian Mono', style: 'Medium' }),
])
```

---

## Tag

Pill-shaped label for status badges and metadata.

### Constructor

```typescript
new Tag({
  name: string             // Figma node name
  content: string          // Text inside the pill
  fontSize?: number        // Default: 8
  fontFamily?: FontFamily  // Default: 'Martian Mono'
  backgroundColor?: { rgb: { r; g; b }; alpha: number }  // Default: white 50%
  url?: string | null      // Makes the pill a hyperlink
})
```

### Variants

```typescript
// Basic pill
parent.appendChild(new Tag({ name: '_status', content: 'Active' }).makeNodeTag())

// Pill + colored dot indicator  (gl = [r, g, b, a])
parent.appendChild(new Tag({ name: '_status', content: 'Online' }).makeNodeTagwithIndicator([0, 0.8, 0.4, 1]))

// Compact version (tighter padding)
parent.appendChild(new Tag({ name: '_status', content: 'Online' }).makeNodeTagwithIndicator([0, 0.8, 0.4, 1], true))

// Pill + circular avatar image
const image = figma.createImage(bytes)
parent.appendChild(new Tag({ name: '_user', content: 'Alice' }).makeNodeTagWithAvatar(image))

// Clickable hyperlink pill
parent.appendChild(
  new Tag({ name: '_link', content: 'Visit site', url: 'https://example.com' }).makeNodeTag()
)
```

---

## Paragraph

Frosted-glass text block, supports URL auto-linking.

### Constructor

```typescript
new Paragraph({
  name: string            // Figma node name
  content: string         // Text (URLs auto-linked)
  type: 'FILL' | 'FIXED' // Layout mode
  width?: number          // Required when type === 'FIXED'
  fontSize?: number       // Default: 12
  fontFamily?: FontFamily // Default: 'Lexend'
})
```

### Layout modes

| Mode    | Behaviour                                          |
| ------- | -------------------------------------------------- |
| `FILL`  | `layoutGrow = 1` — stretches to fill parent width  |
| `FIXED` | Resizes frame to the given `width`                 |

```typescript
// FILL — inside vertical auto-layout frame
parent.appendChild(new Paragraph({ name: '_body', content: 'Text here.', type: 'FILL' }).node)

// FIXED — explicit width
parent.appendChild(new Paragraph({ name: '_note', content: 'Note.', type: 'FIXED', width: 320 }).node)
```

---

## Signature

Full-width branding footer. Two columns: tagline + plugin link | logotype SVG.

```typescript
parent.appendChild(new Signature().node)
```

Replace template placeholders in `Signature.ts` before shipping:

| Placeholder       | Replace with             |
| ----------------- | ------------------------ |
| `{{ pluginName }}` | Plugin display name     |
| `{{ pluginSlug }}` | URL slug (`my-tool`)    |

---

## Composing a Document Frame

```typescript
import Paragraph from './Paragraph'
import Signature from './Signature'
import Tag from './Tag'

export const createDocument = async (data: { title: string; body: string; status: string }) => {
  // 1. Load fonts first
  await Promise.all([
    figma.loadFontAsync({ family: 'Lexend', style: 'Medium' }),
    figma.loadFontAsync({ family: 'Martian Mono', style: 'Medium' }),
  ])

  // 2. Outer container (vertical auto-layout)
  const doc = figma.createFrame()
  doc.name = 'Document'
  doc.layoutMode = 'VERTICAL'
  doc.layoutSizingHorizontal = 'FIXED'
  doc.resize(480, 100)
  doc.layoutSizingVertical = 'HUG'
  doc.paddingTop = doc.paddingBottom = doc.paddingLeft = doc.paddingRight = 16
  doc.itemSpacing = 8
  doc.cornerRadius = 16
  doc.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]

  // 3. Tag row
  const tagRow = figma.createFrame()
  tagRow.name = '_tags'
  tagRow.fills = []
  tagRow.layoutMode = 'HORIZONTAL'
  tagRow.layoutSizingHorizontal = 'FILL'
  tagRow.layoutSizingVertical = 'HUG'
  tagRow.itemSpacing = 4
  tagRow.layoutAlign = 'STRETCH'
  tagRow.appendChild(
    new Tag({ name: '_status', content: data.status }).makeNodeTagwithIndicator([0, 0.7, 0.4, 1])
  )
  doc.appendChild(tagRow)

  // 4. Title
  doc.appendChild(new Paragraph({ name: '_title', content: data.title, type: 'FILL', fontSize: 16 }).node)

  // 5. Body
  doc.appendChild(new Paragraph({ name: '_body', content: data.body, type: 'FILL' }).node)

  // 6. Signature
  doc.appendChild(new Signature().node)

  // 7. Place and focus
  figma.currentPage.appendChild(doc)
  figma.viewport.scrollAndZoomIntoView([doc])

  return doc
}
```

---

## Tag Row Pattern

```typescript
const tagRow = figma.createFrame()
tagRow.name = '_meta'
tagRow.fills = []
tagRow.layoutMode = 'HORIZONTAL'
tagRow.layoutSizingHorizontal = 'FILL'
tagRow.layoutSizingVertical = 'HUG'
tagRow.layoutAlign = 'STRETCH'
tagRow.itemSpacing = 4

tagRow.appendChild(new Tag({ name: '_v', content: 'v1.0.0' }).makeNodeTag())
tagRow.appendChild(new Tag({ name: '_author', content: 'Alice' }).makeNodeTag())
parent.appendChild(tagRow)
```

---

## Component API Summary

### `Tag`

| Method                                      | Returns    | Notes                            |
| ------------------------------------------- | ---------- | -------------------------------- |
| `makeNodeTag()`                             | `FrameNode`| Basic pill                       |
| `makeNodeTagwithIndicator(gl, isCompact?)`  | `FrameNode`| Pill + dot; `gl` = `[r,g,b,a]`  |
| `makeNodeTagWithAvatar(image?)`             | `FrameNode`| Pill + avatar circle             |

### `Paragraph`

| Property | Type        | Notes                          |
| -------- | ----------- | ------------------------------ |
| `.node`  | `FrameNode` | Outer wrapper — append this    |

### `Signature`

| Property | Type        | Notes                               |
| -------- | ----------- | ----------------------------------- |
| `.node`  | `FrameNode` | Full-width footer — append this     |

---

## Best Practices

```typescript
// ✅ Load fonts before any canvas component
await Promise.all([
  figma.loadFontAsync({ family: 'Lexend', style: 'Medium' }),
  figma.loadFontAsync({ family: 'Martian Mono', style: 'Medium' }),
])

// ✅ Use FILL inside vertical auto-layout, FIXED for explicit widths
// ✅ Append .node (not the class instance) for Paragraph / Signature
// ✅ Append the return value of makeNodeTag() etc. for Tag
// ✅ Always scroll into view after appending
figma.currentPage.appendChild(doc)
figma.viewport.scrollAndZoomIntoView([doc])

// ❌ Never import canvas components in the UI layer
// ❌ Never skip loadFontAsync — text operations will throw
```
