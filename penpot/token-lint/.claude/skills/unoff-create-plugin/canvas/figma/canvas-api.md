---
name: figma-canvas-api
description: Direct Figma Plugin API usage for node creation, style management, selection, and viewport operations. Use when writing Canvas-layer code that interacts with the Figma document via figma.* calls.
platform: figma
---

# Figma API — Canvas Manipulation

## Core Concepts

The Canvas layer is the "backend" of your plugin. Only here can you:
- Create and manipulate nodes (`figma.createFrame()`, `figma.createText()`, etc.)
- Manage styles and variables
- Read/write plugin data and client storage
- Handle selection and viewport

See [core.md](../../core.md) for the non-negotiables (no DOM/`window`/authenticated `fetch` in Canvas code).

## Node Creation

```typescript
// Rectangle
const rect = figma.createRectangle()
rect.x = 100; rect.y = 100
rect.resize(200, 150)
rect.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]
figma.currentPage.appendChild(rect)

// Text — always load font before modifying characters
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
const text = figma.createText()
text.characters = 'Hello World'
text.fontSize = 24
figma.currentPage.appendChild(text)

// Frame
const frame = figma.createFrame()
frame.name = 'Container'
frame.resize(400, 300)
figma.currentPage.appendChild(frame)

// Component + instance
const component = figma.createComponent()
component.resize(120, 40)
const instance = component.createInstance()
instance.x = 200
figma.currentPage.appendChild(instance)
```

## Auto-Layout on Frames

```typescript
frame.layoutMode = 'VERTICAL'          // or 'HORIZONTAL'
frame.primaryAxisSizingMode = 'AUTO'   // 'AUTO' = hug, 'FIXED' = fixed size
frame.counterAxisSizingMode = 'AUTO'
frame.paddingTop = 16; frame.paddingBottom = 16
frame.paddingLeft = 16; frame.paddingRight = 16
frame.itemSpacing = 8
frame.cornerRadius = 12

// Children: fill vs hug
child.layoutGrow = 1          // fill (expands in primary axis)
child.layoutAlign = 'STRETCH' // fill (expands in counter axis)
```

## Node Manipulation

### Reading properties

```typescript
const selection = figma.currentPage.selection
if (selection.length === 0) { figma.notify('Select something'); return }

const node = selection[0]
console.log(node.type, node.name, node.id)

if (node.type === 'TEXT') console.log(node.characters)
if ('fills' in node) console.log(node.fills)
```

### Modifying properties

```typescript
// Fill
if ('fills' in node) {
  node.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.8, b: 0.4 } }]
}

// Stroke
if ('strokes' in node) {
  node.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]
  node.strokeWeight = 2
}

// Corner radius
if ('cornerRadius' in node) node.cornerRadius = 8

// Drop shadow
if ('effects' in node) {
  node.effects = [{
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.25 },
    offset: { x: 0, y: 4 },
    radius: 8, visible: true, blendMode: 'NORMAL',
  }]
}
```

### Traversing the tree

```typescript
const allFrames = figma.currentPage.findAll(n => n.type === 'FRAME')
const byName = figma.currentPage.findAll(n => n.name.includes('Button'))
const firstFrame = figma.currentPage.findOne(n => n.type === 'FRAME')
```

## Styles

```typescript
// Paint style
const paintStyle = figma.createPaintStyle()
paintStyle.name = 'Primary/Blue'
paintStyle.paints = [{ type: 'SOLID', color: { r: 0, g: 0.5, b: 1 } }]
if ('fillStyleId' in node) node.fillStyleId = paintStyle.id

// Text style
const textStyle = figma.createTextStyle()
textStyle.name = 'Heading/H1'
textStyle.fontSize = 32
textStyle.fontName = { family: 'Inter', style: 'Bold' }
if (node.type === 'TEXT') node.textStyleId = textStyle.id

// Get all
figma.getLocalPaintStyles()
figma.getLocalTextStyles()
```

## Variables

```typescript
const collection = figma.variables.createVariableCollection('Design Tokens')
const colorVar = figma.variables.createVariable('primary', collection, 'COLOR')
colorVar.setValueForMode(collection.defaultModeId, { r: 0, g: 0.5, b: 1 })

// Bind to fill
if ('fills' in node && node.fills !== figma.mixed) {
  const fills = JSON.parse(JSON.stringify(node.fills))
  fills[0] = figma.variables.setBoundVariableForPaint(fills[0], 'color', colorVar)
  node.fills = fills
}
```

## Selection Management

```typescript
// Read
const selection = figma.currentPage.selection

// Set
figma.currentPage.selection = [node]
figma.currentPage.selection = [node1, node2]
figma.currentPage.selection = []  // clear
```

## Viewport

```typescript
figma.viewport.scrollAndZoomIntoView([node])
const bounds = figma.viewport.bounds  // { x, y, width, height }
const zoom = figma.viewport.zoom
```

## Plugin Data (node-level)

```typescript
node.setPluginData('key', 'value')
node.setPluginData('config', JSON.stringify({ enabled: true }))

const value = node.getPluginData('key')          // '' if missing
const config = JSON.parse(node.getPluginData('config') || '{}')

const keys = node.getPluginDataKeys()
node.setPluginData('key', '')  // delete

// Shared (readable by other plugins)
node.setSharedPluginData('com.yourplugin', 'key', 'value')
node.getSharedPluginData('com.yourplugin', 'key')
```

## Client Storage (user-level)

```typescript
// All operations are async
await figma.clientStorage.setAsync('prefs', { theme: 'dark' })  // any serializable value
const prefs = await figma.clientStorage.getAsync('prefs')        // undefined if missing
await figma.clientStorage.deleteAsync('prefs')
const keys = await figma.clientStorage.keysAsync()
```

Storage limits: 1 MB per key, 100 keys max. Persists across files and plugin runs.

## Text — Font Loading

```typescript
// Always load before modifying characters or fontName
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })

const text = figma.createText()
text.characters = 'Hello'
text.fontSize = 24
text.fontName = { family: 'Inter', style: 'Bold' }
text.textAlignHorizontal = 'CENTER'
text.letterSpacing = { value: 0, unit: 'PIXELS' }
text.lineHeight = { value: 150, unit: 'PERCENT' }
```

## Notifications

```typescript
figma.notify('Done!', { timeout: 2000 })
figma.notify('Something went wrong', { error: true })
```

## Best Practices

```typescript
// ✅ Check node existence
const node = figma.getNodeById(id)
if (!node) { figma.notify('Node not found'); return }

// ✅ Use type guards
if (node.type === 'TEXT') console.log(node.characters)
if ('fills' in node) node.fills = [...]

// ✅ Batch clientStorage reads
const [prefs, history] = await Promise.all([
  figma.clientStorage.getAsync('prefs'),
  figma.clientStorage.getAsync('history'),
])

// ✅ Use findOne when you need a single result
const node = figma.currentPage.findOne(n => n.name === 'Target')

// ✅ Skip invisible nodes for performance
figma.skipInvisibleInstanceChildren = true
```
