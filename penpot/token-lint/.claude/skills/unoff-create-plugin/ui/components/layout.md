---
name: components-layout
description: "@unoff/ui structural components: Bar, Feature, Layout, Section, SectionTitle, SimpleItem, Card, List, SortableList. Detail file for component-library.md — load when building page structure, lists, or layout containers."
---

# Components — Layout & Containers

Part of the [component-library](../component-library.md) reference. Import all from `@unoff/ui`.

### Bar (Layout Container)

```typescript
<Bar
  leftPartSlot={
    <div className={layouts['snackbar--medium']}>
      {/* Left content */}
      <span className={texts['type']}>Title</span>
    </div>
  }
  rightPartSlot={
    <div className={layouts['snackbar--right']}>
      {/* Right content */}
      <Button type="primary" label="Action" />
    </div>
  }
  padding="var(--size-pos-xxsmall) var(--size-pos-xsmall)"
  shouldReflow={true}
  border={['TOP']} | {['BOTTOM']} | {['TOP', 'BOTTOM']}
/>
```

**Use Cases**:
- Header bars
- Footer bars
- Action bars
- Status bars


### Feature Wrapper

```typescript
<Feature isActive={this.features.PRO_FEATURE.isActive()}>
  <Button label="Pro Feature" />
  <Input placeholder="Pro input" />
</Feature>
```

**Purpose**: Conditionally render children based on feature status.


### Layout

```typescript
<Layout
  id="my-layout"
  column={[
    {
      node: <Tabs tabs={tabs} active={active} action={navHandler} />,
      typeModifier: "FIXED",
      fixedWidth: "148px",
    },
    {
      node: <div>Main content</div>,
      typeModifier: "BLANK",
    },
  ]}
  isFullHeight
  isFullWidth
/>
```

**Props**:
- `id`: Unique identifier
- `column`: Array of column definitions
  - `node`: React node to render
  - `typeModifier`: `"FIXED"` (fixed width) | `"BLANK"` (fills remaining space)
  - `fixedWidth`: Width string when `typeModifier` is `"FIXED"` (e.g., `"148px"`)
- `isFullHeight`: Stretch to full height
- `isFullWidth`: Stretch to full width

**Use Cases**: Multi-column layouts, sidebar + content, split views.


### Section

> **⚠️ CRITICAL**: `Section` does **NOT** accept JSX children. Use the `body` and `title` props.

```typescript
<Section
  title={
    <SimpleItem
      leftPartSlot={<SectionTitle label="My Section" />}
      isListItem={false}
      alignment="CENTER"
    />
  }
  body={[
    {
      node: <span className={texts.type}>Content item 1</span>,
      spacingModifier: "LARGE",
    },
    {
      node: <FormItem id="input" label="Name" shouldFill>
               <Input id="input" type="TEXT" value="" />
             </FormItem>,
    },
  ]}
  border={['BOTTOM']}
/>
```

**Props**:
- `title`: React node — typically a `SimpleItem` wrapping a `SectionTitle`
- `body`: Array of `{ node: ReactNode, spacingModifier?: "LARGE" }`
- `border`: `['TOP']` | `['BOTTOM']` | `['TOP', 'BOTTOM']`


### SectionTitle

```typescript
<SectionTitle label="Section Label" />
```

**Props**:
- `label`: Section heading text

**Usage**: Always wrapped inside a `SimpleItem` as `leftPartSlot`, used as the `title` prop of `Section`.


### SimpleItem

```typescript
<SimpleItem
  id="optional-id"
  leftPartSlot={<span className={texts.type}>Item label</span>}
  rightPartSlot={<Button type="icon" icon="trash" action={handleDelete} />}
  isListItem                       // renders as <li> inside a <List>
  isInteractive={false}            // adds hover/click styles
  isTransparent={false}            // removes background
  alignment="DEFAULT"              // 'DEFAULT' | 'CENTER' | 'BASELINE'
  action={handleClick}             // makes the whole row clickable
/>
```

**Props**:
- `leftPartSlot`: Required — main content (text, icon, etc.)
- `rightPartSlot`: Optional — trailing actions or meta
- `isListItem`: `true` renders as `<li>` — **always set this when inside a `<List>`** (default `true`)
- `isInteractive`: Adds hover highlight — set when the row itself is clickable
- `isTransparent`: Removes background fill
- `alignment`: Vertical alignment — `"DEFAULT"` | `"CENTER"` | `"BASELINE"`
- `action`: Row-level click/keyboard handler

**Typical usage inside a list**:
```typescript
<List>
  {items.map((item, index) => (
    <SimpleItem
      key={index}
      isListItem
      leftPartSlot={<span className={texts.type}>{item.label}</span>}
      rightPartSlot={
        <Button type="icon" icon="trash" action={handleDelete(index)} />
      }
    />
  ))}
</List>
```

**Usage as a section title row** (not a list item):
```typescript
<SimpleItem
  leftPartSlot={<SectionTitle label="My Section" />}
  isListItem={false}
  alignment="CENTER"
/>
```

### Card

```typescript
<Card
  src={imageUrl}
  title="Card Title"
  subtitle="Subtitle text"
  richText={<span className={texts.type}>Rich HTML content</span>}
  actions={<Button type="primary" label="Action" action={handleClick} />}
  shouldFill
  action={() => { /* card click handler */ }}
/>
```

**Props**:
- `src`: Image URL for the card header
- `title`: Card title
- `subtitle`: Card subtitle
- `richText`: React node for rich content body
- `actions`: React node for action buttons
- `shouldFill`: Expand to fill available space
- `action`: Click handler for the entire card


### List vs SortableList

Choose based on whether items need to be reordered:

| Use case | Component |
|---|---|
| Read-only or action-only list | `<List>` |
| Drag-and-drop reordering | `<SortableList>` |

#### List

```typescript
<List
  padding="0 var(--size-pos-xxsmall)"
  isFullWidth
  isFullHeight={false}
>
  {items.map((item, index) => (
    <SimpleItem
      key={index}
      isListItem
      leftPartSlot={<span className={texts.type}>{item.label}</span>}
      rightPartSlot={
        <Button type="icon" icon="trash" action={handleDelete(index)} />
      }
    />
  ))}
</List>
```

**Props**:
- `padding`: CSS padding value
- `isFullWidth`: Stretch to full width
- `isFullHeight`: Stretch to full height
- `children`: Any React nodes (typically `SimpleItem` or `Section`)

#### SortableList

Use when items must be reorderable via drag-and-drop. Items must each have a unique `id` field.

```typescript
<SortableList
  data={items}                         // Array<{ id: string; [key: string]: any }>
  primarySlot={items.map((item) => (   // One node per item, same order as data
    <span className={texts.type}>{item.label}</span>
  ))}
  actionsSlot={items.map((item) => (   // Optional action per item
    <Button type="icon" icon="settings" action={() => handleEdit(item.id)} />
  ))}
  emptySlot={
    <SemanticMessage type="NEUTRAL" message="No items yet." />
  }
  helpers={{ remove: 'Remove item', more: 'More options' }}
  isScrollable
  canBeEmpty
  onChangeSortableList={(reordered) => setItems(reordered)}
  onRemoveItem={(e) => {
    const index = Number((e.currentTarget as HTMLElement).dataset.index)
    setItems(items.filter((_, i) => i !== index))
  }}
  onRefoldOptions={() => { /* close open option panels */ }}
/>
```

**Key props**:
- `data`: Source array — each item **must** have an `id: string` field
- `primarySlot`: Array of nodes rendered as the main content (index-aligned with `data`)
- `actionsSlot`: Optional array of action nodes per item
- `emptySlot`: Content shown when the list is empty
- `isScrollable`: Enable scroll overflow
- `canBeEmpty`: Allow the list to have zero items (default `true`)
- `onChangeSortableList`: Called with the reordered array after a drop
- `onRemoveItem`: Called when the built-in remove button is clicked
- `onRefoldOptions`: Called to collapse any open secondary panels

