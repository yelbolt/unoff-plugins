---
name: components-css-classes
description: "@unoff/ui CSS utility classes: layouts (snackbar/stackbar flex helpers) and texts (typography). Detail file for component-library.md — load when styling with unoff-ui's CSS modules instead of custom CSS."
---

# CSS Classes — layouts & texts

Part of the [component-library](../component-library.md) reference.

## CSS Classes

### Layouts

```typescript
import { layouts } from '@unoff/ui'
```

Two layout families are available: **snackbar** (horizontal row) and **stackbar** (vertical column). Both share the same modifier suffixes.

#### snackbar — horizontal flex row

Use inside `Bar.leftPartSlot` or anywhere you need to arrange items in a row.

```typescript
// Base row
<div className={layouts.snackbar}>…</div>

// Gap variants
<div className={layouts['snackbar--large']}>…</div>   // large gap
<div className={layouts['snackbar--medium']}>…</div>  // medium gap
<div className={layouts['snackbar--tight']}>…</div>   // tight gap (toolbar buttons)

// Alignment
<div className={layouts['snackbar--start']}>…</div>
<div className={layouts['snackbar--centered']}>…</div>
<div className={layouts['snackbar--end']}>…</div>
<div className={layouts['snackbar--baseline']}>…</div>

// Filling & wrapping
<div className={layouts['snackbar--fill']}>…</div>    // children fill remaining space
<div className={layouts['snackbar--wrap']}>…</div>    // wraps when overflowing

// Justification
<div className={layouts['snackbar--left']}>…</div>
<div className={layouts['snackbar--center']}>…</div>
<div className={layouts['snackbar--right']}>…</div>
```

**Practical guide**:
- **Toolbar with icon buttons** → `snackbar--tight`
- **Bar with a label + action** → `snackbar--medium`
- **Responsive wrapping row** → `snackbar--wrap`

#### stackbar — vertical flex column

Use when you need to stack elements vertically.

```typescript
// Base column
<div className={layouts.stackbar}>…</div>

// Gap variants
<div className={layouts['stackbar--large']}>…</div>
<div className={layouts['stackbar--medium']}>…</div>
<div className={layouts['stackbar--tight']}>…</div>

// Alignment & justification (same modifiers as snackbar)
<div className={layouts['stackbar--centered']}>…</div>
<div className={layouts['stackbar--fill']}>…</div>
<div className={layouts['stackbar--right']}>…</div>
// etc.
```

#### centered

Centers content both horizontally and vertically (absolute positioning).

```typescript
<div className={layouts.centered}>…</div>
```

### Typography

```typescript
import { texts } from '@unoff/ui'
```

#### Size & weight

```typescript
<span className={texts.type}>Default body text</span>
<span className={texts['type--small']}>Small text</span>
<span className={texts['type--medium']}>Medium text</span>
<span className={texts['type--large']}>Large text</span>
<span className={texts['type--xlarge']}>Extra-large text</span>
<span className={texts['type--bold']}>Bold text</span>
<span className={texts['type--truncated']}>Truncated with ellipsis…</span>
```

#### Color / semantic

```typescript
<span className={texts['type--secondary']}>Muted / secondary</span>
<span className={texts['type--tertiary']}>Very muted / tertiary</span>
<span className={texts['type--success']}>Success / green</span>
<span className={texts['type--warning']}>Warning / amber</span>
<span className={texts['type--alert']}>Alert / red</span>
<span className={texts['type--inverse']}>Inverse (for dark backgrounds)</span>
```

#### Label

```typescript
<span className={texts.label}>Form label style</span>
```

### Combining Classes

```typescript
import { doClassnames } from '@unoff/utils'

<div className={doClassnames([
  layouts['snackbar--medium'],
  texts['type'],
  this.state.isActive && 'active-class',
  'custom-class'
])}>
  Content
</div>
```

**doClassnames** filters out falsy values, making conditional classes easy.

