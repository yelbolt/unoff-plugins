---
name: components-actions
description: "@unoff/ui action components: Button, Menu, ActionsList, Tabs, SimpleSlider, SegmentedControl. Detail file for component-library.md — load when building buttons, menus, tab navigation, or sliders."
---

# Components — Actions & Navigation

Part of the [component-library](../component-library.md) reference. Import all from `@unoff/ui`.

### Button

```typescript
<Button
  type="primary" | "secondary" | "tertiary"
  label="Click me"
  feature="FEATURE_NAME"
  isBlocked={this.features.MY_FEATURE.isBlocked()}
  isNew={this.features.MY_FEATURE.isNew()}
  isDisabled={false}
  isLoading={false}
  warning={{
    label: "This action cannot be undone",
    pin: "TOP" | "BOTTOM",
    type: "SINGLE_LINE" | "MULTI_LINE"
  }}
  action={(e) => {
    // Handle click
  }}
  onUnblock={() => {
    // Handle when user clicks blocked feature
    sendPluginMessage({ pluginMessage: { type: 'GET_PRO' } }, '*')
  }}
/>
```

**Props**:
- `type`: Visual style variant
- `label`: Button text
- `feature`: Feature name for tracking/analytics
- `isBlocked`: Show upgrade UI if true
- `isNew`: Show "new" badge
- `isDisabled`: Disable interaction
- `isLoading`: Show loading spinner
- `warning`: Show warning tooltip
- `action`: Click handler
- `onUnblock`: Called when user clicks blocked button


### Menu

```typescript
<Menu
  id="actions-menu"
  type="ICON" | "PRIMARY"
  label="Actions"
  icon="settings"
  customIcon={<MyIcon />}
  options={[
    {
      label: "Export",
      value: "export",
      feature: "EXPORT",
      type: "OPTION",
      isActive: this.features.EXPORT.isActive(),
      isBlocked: this.features.EXPORT.isReached(count),
      isNew: this.features.EXPORT.isNew(),
      action: (e) => this.handleExport()
    },
    {
      label: "Import",
      value: "import",
      feature: "IMPORT",
      type: "OPTION",
      isActive: this.features.IMPORT.isActive(),
      action: (e) => this.handleImport()
    }
  ]}
  selected={this.state.selected}
  alignment="TOP_LEFT" | "TOP_RIGHT" | "BOTTOM_LEFT" | "BOTTOM_RIGHT"
  state="DEFAULT" | "LOADING" | "DISABLED"
  helper={{
    label: "Open actions menu",
    pin: "TOP",
    isSingleLine: true
  }}
  warning={{
    label: "Warning message",
    pin: "BOTTOM",
    type: "MULTI_LINE" | "SINGLE_LINE"
  }}
  isBlocked={this.features.FEATURE.isBlocked()}
  isNew={this.features.FEATURE.isNew()}
  canBeSearched={true}
  searchLabel="Search…"
  noResultsLabel="No results"
/>
```

**Props**:
- `type`: Visual style — `"ICON"` (icon-only button) | `"PRIMARY"` (labeled button)
- `label`: Menu trigger text
- `icon`: Icon name
- `customIcon`: Custom React element as icon
- `options`: Menu items (same structure as Dropdown)
- `selected`: ID of the currently selected option
- `alignment`: Menu position relative to trigger
- `state`: Menu state
- `helper`: Tooltip on the trigger button
- `warning`: Warning tooltip on the trigger button
- `isBlocked` / `isNew`: Feature control

**Search props** (new):
- `canBeSearched`: Enable a search input above the option list
- `searchLabel`: Placeholder text for the search input
- `noResultsLabel`: Message shown when no option matches


### ActionsList

Low-level component that renders the floating option list used internally by `Dropdown` and `Menu`. Use it directly only when you need a fully custom trigger or a standalone floating list.

```typescript
<ActionsList
  options={[
    {
      label: "Option 1",
      value: "option1",
      type: "OPTION",
      isActive: this.state.selected === "option1",
      action: () => this.handleSelect("option1")
    },
    { type: "SEPARATOR" },
    {
      label: "Group",
      value: "group",
      type: "GROUP",
      children: [
        {
          label: "Sub-option",
          value: "sub",
          type: "OPTION",
          action: () => this.handleSelect("sub")
        }
      ]
    }
  ]}
  selected={this.state.selected}
  direction="LEFT" | "RIGHT"
  shouldScroll={true}
  containerId="plugin-container"
  preview={{
    image: imageUrl,
    text: "Preview text",
    pin: "TOP" | "BOTTOM"
  }}
  canBeSearched={true}
  searchLabel="Search…"
  noResultsLabel="No results"
  onCancellation={() => this.closeMenu()}
  menuRef={this.menuRef}
  subMenuRef={this.subMenuRef}
/>
```

**Props**:
- `options`: Array of `DropdownOption` — same type as `Dropdown` / `Menu`
- `selected`: ID of the currently highlighted/selected option
- `direction`: Direction submenu expands — `"RIGHT"` (default) | `"LEFT"`
- `shouldScroll`: Enable scrolling within the list
- `containerId`: ID of the scroll/portal container
- `preview`: Image tooltip shown on hover
- `canBeSearched`: Enable search input above the list
- `searchLabel`: Placeholder text for the search input
- `noResultsLabel`: Message shown when no option matches
- `onCancellation`: Called when the list is dismissed (Escape, click-outside)
- `menuRef` / `subMenuRef`: Refs to the `<ul>` elements for imperative control


### Tabs

```typescript
<Tabs
  tabs={[
    { id: 'TAB_A', label: 'Tab A', isUpdated: false },
    { id: 'TAB_B', label: 'Tab B', isUpdated: true },
  ]}
  active="TAB_A"
  direction="HORIZONTAL" | "VERTICAL"
  isFlex={true}
  maxVisibleTabs={3}
  action={(e: Event) => {
    const tabId = (e.currentTarget as HTMLElement).dataset.feature
    // Handle tab change
  }}
/>
```

**Props**:
- `tabs`: Array of tab items with `id`, `label`, and optional `isUpdated`
- `active`: Currently active tab `id`
- `direction`: `"HORIZONTAL"` (default) | `"VERTICAL"`
- `isFlex`: Whether tabs use flex layout
- `maxVisibleTabs`: Max tabs visible before overflow
- `action`: Tab click handler — reads tab ID from `e.currentTarget.dataset.feature`

**Use Cases**: Navigation between contexts, sub-navigation within a layout.


### SimpleSlider

> **⚠️ CRITICAL**: The component is called `SimpleSlider`, NOT `Slider`. The `onChange` has a non-standard signature.

```typescript
<SimpleSlider
  id="opacity-slider"
  min="0"
  max="100"
  value="50"
  feature="OPACITY"
  isBlocked={false}
  isNew={false}
  onChange={(feature: string, state: string, value: number) => {
    this.setState({ opacity: value })
  }}
/>
```

**Props**:
- `id`: Unique identifier
- `min` / `max` / `value`: Range values (as strings)
- `feature`: Feature name for tracking
- `isBlocked` / `isNew`: Feature control
- `onChange`: Non-standard signature `(feature: string, state: string, value: number) => void`


### SegmentedControl

Icon-based tab switcher. Each segment shows an icon (or a letter) with a tooltip helper. Use instead of `Tabs` when the options are purely icon-driven and compact layout is needed.

```typescript
<SegmentedControl
  items={[
    {
      id: "GRID",
      icon: { type: "PICTO", name: "grid" },
      helper: { label: "Grid view", pin: "BOTTOM" },
      isDisabled: false,
    },
    {
      id: "LIST",
      icon: { type: "PICTO", name: "list" },
      helper: { label: "List view", pin: "BOTTOM" },
    },
  ]}
  active={this.state.view}
  preview={{
    image: previewImageUrl,
    text: "Preview description",
    pin: "BOTTOM"
  }}
  warning={{
    label: "This option is unavailable",
    pin: "BOTTOM",
    type: "MULTI_LINE" | "SINGLE_LINE"
  }}
  isBlocked={this.features.FEATURE.isBlocked()}
  isNew={this.features.FEATURE.isNew()}
  action={(e) => {
    const id = (e.currentTarget as HTMLElement).dataset.feature
    this.setState({ view: id })
  }}
  onUnblock={() => {
    sendPluginMessage({ pluginMessage: { type: 'GET_PRO' } }, '*')
  }}
/>
```

**Props**:
- `items`: Array of segment definitions
  - `id`: Unique segment identifier (also used as `data-feature` on the DOM element)
  - `icon.type`: `"PICTO"` | `"LETTER"`
  - `icon.name`: Icon identifier from `IconList`
  - `helper`: Tooltip — `label` required, `pin` optional
  - `isDisabled`: Disable this segment
- `active`: ID of the currently active segment
- `preview`: Image + text tooltip shown on hover
- `warning`: Warning tooltip shown over the control
- `isBlocked` / `isNew`: Feature control
- `action`: Click/keyboard handler — read the active ID from `e.currentTarget.dataset.feature`
- `onUnblock`: Called when user clicks a blocked control

**Reading the active segment in `action`**:
```typescript
action={(e) => {
  const id = (e.currentTarget as HTMLElement).dataset.feature
  this.setState({ view: id })
}}
```

