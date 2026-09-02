---
name: penpot-canvas-api
description: Direct Penpot Plugin API usage for shape creation, layout, fills, selection, and viewport operations. Use when writing Canvas-layer code that interacts with the Penpot document via penpot.* calls.
platform: penpot
---

# Penpot API — Canvas Manipulation

## Core Concepts

The Canvas layer runs in the Penpot plugin worker context. Only here can you:
- Create and manipulate shapes (`penpot.createBoard()`, `penpot.createText()`, etc.)
- Apply fills, strokes, layout
- Read selection and viewport
- Read/write `penpot.localStorage`

See [core.md](../../core.md) for the non-negotiables (no DOM/`window`/authenticated `fetch` in Canvas code).

**Key differences from Figma:**
- Frames are called **Boards** → `penpot.createBoard()`
- **No font loading** — text is created with content at call time, font set via properties
- **No async API** — all canvas operations are synchronous
- **Fills use HEX strings**, not RGB 0–1 floats
- **Auto-layout** is configured via `board.addFlexLayout()` (returns a `FlexLayout` object)
- **Corner radius** → `borderRadius` (not `cornerRadius`)
- **`fontSize`** is a **string** (e.g. `'24'`), not a number

---

## Shape Creation

```typescript
// Board (= Frame in Figma)
const board = penpot.createBoard()
board.name = 'Container'
board.resize(400, 300)
penpot.currentPage?.appendChild(board)

// Rectangle
const rect = penpot.createRectangle()
rect.x = 100; rect.y = 100
rect.width = 200; rect.height = 150
rect.fills = [{ fillColor: '#FF0000', fillOpacity: 1 }]
penpot.currentPage?.appendChild(rect)

// Text — content passed at creation time, no font loading needed
const text = penpot.createText('Hello World')
if (text) {
  text.fontFamily = 'Inter'
  text.fontSize = '24'      // string!
  text.fontWeight = '400'   // string!
  text.lineHeight = '1.3'
  text.fills = [{ fillColor: '#000000' }]
}
penpot.currentPage?.appendChild(text)

// Ellipse
const circle = penpot.createEllipse()
circle.resize(48, 48)
circle.fills = [{ fillColor: '#0000FF' }]

// Shape from SVG
const icon = penpot.createShapeFromSvg('<svg>...</svg>')
if (icon) icon.resize(24, 24)
```

---

## Auto-Layout on Boards

Layout is configured via `board.addFlexLayout()` which returns a `FlexLayout` object.

```typescript
const board = penpot.createBoard()

const flex = board.addFlexLayout()
flex.dir = 'column'              // 'row' | 'column'
flex.horizontalSizing = 'auto'   // 'auto' | 'fix' | 'fill'
flex.verticalSizing = 'auto'
flex.horizontalPadding = 16      // applies to left + right
flex.verticalPadding = 16        // applies to top + bottom
// OR individual sides:
flex.leftPadding = 8; flex.rightPadding = 8
flex.topPadding = 8; flex.bottomPadding = 8
flex.columnGap = 8               // gap between columns (horizontal layout)
flex.rowGap = 8                  // gap between rows (vertical layout)
flex.alignItems = 'center'       // 'start' | 'center' | 'end' | 'stretch'
flex.justifyContent = 'space-between'
// 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly'
```

### Board sizing

```typescript
board.horizontalSizing = 'auto'  // hug contents
board.verticalSizing = 'auto'    // hug contents
board.horizontalSizing = 'fix'   // fixed size (use .resize() to set)
board.borderRadius = 16
```

### Children layout

```typescript
// Make a child fill the parent in the main axis
if (child.layoutChild) child.layoutChild.horizontalSizing = 'fill'
if (child.layoutChild) child.layoutChild.verticalSizing = 'fill'
```

---

## Fills

Penpot uses **HEX strings** and separate opacity — no RGB 0–1 floats.

```typescript
// Solid color
node.fills = [{ fillColor: '#FF0000', fillOpacity: 1 }]

// White at 50% opacity
node.fills = [{ fillColor: '#FFFFFF', fillOpacity: 0.5 }]

// Image fill
node.fills = [{ fillImage: imageData }]  // imageData from penpot.uploadMediaUrl() etc.

// No fill
node.fills = []
```

**Converting RGB (0–1) to HEX** — use `chroma-js` (already in the template):

```typescript
import chroma from 'chroma-js'

const hex = chroma([r * 255, g * 255, b * 255]).hex()  // e.g. '#FF0000'
node.fills = [{ fillColor: hex, fillOpacity: alpha }]
```

---

## Strokes

```typescript
node.strokes = [{
  strokeColor: '#00212B',
  strokeOpacity: 0.05,
  strokeAlignment: 'inner',  // 'inner' | 'outer' | 'center'
  strokeWidth: 1,
}]
```

---

## Text Properties

```typescript
const text = penpot.createText('Hello')
if (text) {
  text.name = '_label'
  text.fontFamily = 'Lexend'
  text.fontSize = '12'       // always a string
  text.fontWeight = '500'    // always a string ('400', '500', '700', etc.)
  text.lineHeight = '1.3'
  text.align = 'left'        // 'left' | 'center' | 'right'
  text.fills = [{ fillColor: '#00212B' }]
  text.growType = 'auto-height'  // 'auto-height' | 'auto-width' | 'fixed'
}
```

---

## Selection

```typescript
// Read current selection
const selection = penpot.selection  // Shape[]

// No programmatic selection setting in plugins — read-only
if (selection.length === 0) {
  penpot.ui.sendMessage({ type: 'NO_SELECTION' })
  return
}

const shape = selection[0]
console.log(shape.type, shape.name, shape.id)
```

---

## Viewport

```typescript
penpot.viewport.zoomIntoView([shape])   // scroll + zoom to fit
const bounds = penpot.viewport.bounds   // { x, y, width, height }
const zoom = penpot.viewport.zoom
const center = penpot.viewport.center   // { x, y }
```

---

## Current Page

```typescript
penpot.currentPage?.appendChild(shape)

// Find shapes
const allShapes = penpot.currentPage?.findShapes()           // all shapes on page
const frames = penpot.currentPage?.findAll(s => s.type === 'board')
const byName = penpot.currentPage?.findAll(s => s.name.includes('Button'))
const first = penpot.currentPage?.findOne(s => s.name === 'Target')

// Get by ID
const shape = penpot.currentPage?.getShapeById(id)
```

---

## Current User

```typescript
penpot.currentUser.id
penpot.currentUser.name
penpot.currentUser.avatarUrl  // not .photoUrl (that's Figma)
```

---

## Theme

```typescript
penpot.theme  // 'light' | 'dark'

penpot.on('themechange', () => {
  penpot.ui.sendMessage({
    type: 'SET_THEME',
    data: { theme: penpot.theme === 'light' ? 'penpot-light' : 'penpot-dark' },
  })
})
```

---

## Best Practices

```typescript
// ✅ Always guard penpot.currentPage (it can be null in edge cases)
penpot.currentPage?.appendChild(shape)

// ✅ Always guard createText (can return null)
const text = penpot.createText('Hello')
if (text) { text.fontFamily = 'Inter' }

// ✅ Convert RGB fills to HEX before assigning
import chroma from 'chroma-js'
node.fills = [{ fillColor: chroma([r*255, g*255, b*255]).hex(), fillOpacity: a }]

// ✅ fontSize and fontWeight are strings
text.fontSize = '24'
text.fontWeight = '700'

// ✅ Use borderRadius, not cornerRadius
board.borderRadius = 8

// ✅ Zoom into view after generating content
penpot.viewport.zoomIntoView([doc])
```

---

## Common Patterns

### Creating a card

```typescript
export const createCard = (config: { title: string; body: string }) => {
  const doc = penpot.createBoard()
  doc.name = 'Card'
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

  const title = penpot.createText(config.title)
  if (title) {
    title.fontFamily = 'Lexend'
    title.fontSize = '16'
    title.fontWeight = '500'
    title.fills = [{ fillColor: '#00212B' }]
    if (title.layoutChild) title.layoutChild.horizontalSizing = 'fill'
    doc.appendChild(title)
  }

  const body = penpot.createText(config.body)
  if (body) {
    body.fontFamily = 'Lexend'
    body.fontSize = '12'
    body.fontWeight = '400'
    body.lineHeight = '1.3'
    body.growType = 'auto-height'
    body.fills = [{ fillColor: '#00212B' }]
    if (body.layoutChild) body.layoutChild.horizontalSizing = 'fill'
    doc.appendChild(body)
  }

  penpot.currentPage?.appendChild(doc)
  penpot.viewport.zoomIntoView([doc])
  return doc
}
```
