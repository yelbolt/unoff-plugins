---
name: component-mapping
description: Reference table mapping Figma component library names to @unoff/ui npm exports and their Storybook stories. Use when looking up which npm component corresponds to a Figma component, when navigating Storybook documentation, or when translating a Figma spec into code imports. Companion to implement-design and component-library skills.
metadata:
  figma-file: RDBmy7x5HfkZHpafVqHNWQ
  figma-node: 3329:69503
  storybook-url: https://ui.unoff.dev
  npm-package: "@unoff/ui"
---

# Component Mapping — Figma ↔ @unoff/ui ↔ Storybook

## Overview

This document is the single reference for navigating between three surfaces of the same design system:

| Surface           | URL / Source                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| **Figma Library** | [Unoff v0.1](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3329-69503) |
| **npm package**   | `@unoff/ui`                                                                                     |
| **Storybook**     | https://ui.unoff.dev                                                                            |

Component names, prop names, and variant values are designed to be **1:1 between Figma and code**. A variant named `type=primary` in Figma maps directly to `type="primary"` in the React prop.

## Using the Figma Library

The library is designed to be **duplicated** — each team or user can keep their own copy in their Figma workspace.

When the library is duplicated:

- The **file key** in the URL (e.g. `RDBmy7x5HfkZHpafVqHNWQ`) **changes** — it becomes the new file's unique identifier.
- The **`t` parameter** (e.g. `t=R0dnjO7z5XLVtg8F-11`) **changes** — it is a per-session token, not part of the node identity.
- The **`node-id` parameter** (e.g. `node-id=1018-526`) **does not change** — all node IDs are preserved exactly after duplication.

This means the `node-id` values in the table below are stable and valid for any copy of the library. To build a valid deep link, replace only the file key with your own:

```
https://www.figma.com/design/{YOUR_FILE_KEY}/Unoff-v0.1?node-id={node-id}
```

All `node-id` values in this document link to the **original library** (`RDBmy7x5HfkZHpafVqHNWQ`) as a reference.

## Status Tags

Components in Figma may carry a status suffix:

| Tag      | Meaning             | Implication                           |
| -------- | ------------------- | ------------------------------------- |
| _(none)_ | Stable              | Safe to use in production             |
| **TbC**  | To be confirmed     | Exists but implementation may change  |
| **DdD**  | Documentation to do | Component exists, no design sheet yet |
| **WIP**  | Work in progress    | Actively being designed/developed     |

> Note: the Figma canvas pages for DdD components show `DtD` in their name — this is a typo in the file. The canonical status name is `DdD` as defined in the Getting Started page.

---

## Foundations

| Figma Name | npm Export                                | Storybook                                                                                | Figma |
| ---------- | ----------------------------------------- | ---------------------------------------------------------------------------------------- | ----- |
| Colors     | _(design tokens — no React component)_    | [Figma colors](https://ui.unoff.dev/?path=/docs/foundations-colors-figma--documentation) | [3215:235686](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3215-235686) |
| Texts      | `texts` (utility object from `@unoff/ui`) | [Text](https://ui.unoff.dev/?path=/docs/foundations-text--documentation)                 | [3004:1903](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3004-1903) |
| Icons      | `Icon`                                    | [Icon](https://ui.unoff.dev/?path=/docs/foundations-icon--documentation)                 | [1018:525](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=1018-525) |

### `Icon` variant reference

Storybook stories for `Icon`:

- `foundations-icon--pictogram` → `type="PICTO"`
- `foundations-icon--letter` → `type="LETTER"`

---

## Components

### Actions

| Figma Name | npm Export     | Storybook Docs                                                                                          | Key Stories                                                                | Figma |
| ---------- | -------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----- |
| Accordion  | `Accordion`    | [Accordion](https://ui.unoff.dev/?path=/docs/components-actions-accordion--documentation)               | `expand-collapse-input`                                                    | [1018:540](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=1018-540) |
| Button     | `Button`       | [Button](https://ui.unoff.dev/?path=/docs/components-actions-button--documentation)                     | `primary`, `secondary`, `tertiary`, `destructive`, `alternative`, `icon`   | [1018:526](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=1018-526) |
| Card       | `Card`         | [Card](https://ui.unoff.dev/?path=/docs/components-actions-card--documentation)                         | `default`, `without-actions`, `without-title`, `filled`                    | [3240:172129](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3240-172129) |
| Knob       | `Knob` | —                                                                                                       | —                                                                          | [3261:32447](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3261-32447) |
| Menu       | `Menu`         | [Multiple Actions](https://ui.unoff.dev/?path=/docs/components-actions-multiple-actions--documentation) | `dropdown-icon`, `multiple-actions-icon-button`, `multiple-actions-button` | [3240:181089](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3240-181089) |
| Segmented Control       | `SegmentedControl`         | [Segmented Control](https://ui.unoff.dev/?path=/docs/components-actions-segmented-control--documentation) | `two-items`, `three-items`, `four-items`, `five-items` | [3617:59162](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3617-59162) |

### Assets

| Figma Name    | npm Export     | Storybook Docs                                                                                   | Key Stories                      | Figma |
| ------------- | -------------- | ------------------------------------------------------------------------------------------------ | -------------------------------- | ----- |
| Avatar        | `Avatar`       | [Avatar](https://ui.unoff.dev/?path=/docs/components-assets-avatar--documentation)               | `defined-user`, `undefined-user` | [1018:533](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=1018-533) |
| Section Title | `SectionTitle` | [Section Title](https://ui.unoff.dev/?path=/docs/components-assets-section-title--documentation) | `title-with-helper`              | [3246:190131](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3246-190131) |
| Thumbnail     | `Thumbnail`    | [Thumbnail](https://ui.unoff.dev/?path=/docs/components-assets-thumbnail--documentation)         | `external-image`                 | [1018:541](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=1018-541) |

### Dialogs

| Figma Name       | npm Export        | Storybook Docs                                                                                          | Key Stories                           | Figma |
| ---------------- | ----------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----- |
| Message          | `Message`         | [Message](https://ui.unoff.dev/?path=/docs/components-dialogs-message--documentation)                   | `simple-message`, `message-ticker`    | [3257:5563](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3257-5563) |
| Notification     | `Notification`    | [Notification](https://ui.unoff.dev/?path=/docs/components-dialogs-notification--documentation)         | `single-message`, `multiple-messages` | [3260:5687](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3260-5687) |
| Semantic Message | `SemanticMessage` | [Semantic Message](https://ui.unoff.dev/?path=/docs/components-dialogs-semantic-message--documentation) | `typed-message`                       | [1018:535](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=1018-535) |

### Inputs

| Figma Name      | npm Export       | Storybook Docs                                                                                       | Key Stories                                                                       | Figma |
| --------------- | ---------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----- |
| Dropdown        | `Dropdown`       | [Dropdown](https://ui.unoff.dev/?path=/docs/components-inputs-dropdown--documentation)               | `single-selection`, `many-options-selection`, `multiple-selection`                | [1018:529](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=1018-529) |
| Dropzone        | `Dropzone`       | [Dropzone](https://ui.unoff.dev/?path=/docs/components-inputs-dropzone--documentation)               | `image-drop-box`                                                                  | [3264:25299](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3264-25299) |
| Input           | `Input`          | [Input](https://ui.unoff.dev/?path=/docs/components-inputs-input--documentation)                     | `color-picker`, `numeric-stepper`, `short-text`, `long-text`, `code-snippet`      | [1018:527](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=1018-527) |
| Inputs Bar      | `InputsBar`      | [Inputs Bar](https://ui.unoff.dev/?path=/docs/components-inputs-inputs-bar--documentation)           | `color-parameters`                                                                | [3264:5393](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3264-5393) |
| Multiple Slider | `MultipleSlider` | [Multiple Slider](https://ui.unoff.dev/?path=/docs/components-inputs-multiple-slider--documentation) | `triple-values`, `editing-values`, `progressive`                                  | [1018:534](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=1018-534) |
| Select          | `Select`         | [Select](https://ui.unoff.dev/?path=/docs/components-inputs-select--documentation)                   | `check-box`, `radio-button`, `switch-button`, `multiple-choices`, `single-choice` | [1018:528](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=1018-528) |
| Simple Slider   | `SimpleSlider`   | [Simple Slider](https://ui.unoff.dev/?path=/docs/components-inputs-simple-slider--documentation)     | `age-select`                                                                      | [3261:32448](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3261-32448) |

### Lists

| Figma Name                     | npm Export             | Storybook Docs                                                                                                    | Key Stories                                                                                                     | Figma |
| ------------------------------ | ---------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----- |
| Actions Item                   | `ActionsItem`          | [Actions Item](https://ui.unoff.dev/?path=/docs/components-lists-actions-item--documentation)                     | `single-action`, `several-actions`, `without-action-nor-thumbnail`                                              | [3521:3669](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3521-3669) |
| Actions List                   | `ActionsList`          | [Actions List](https://ui.unoff.dev/?path=/docs/components-lists-actions-list--documentation)                     | `four-options-list`, `four-options-list-with-separator`, `four-options-list-in-groups`, `long-list-with-scroll` | [1018:532](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=1018-532) |
| Color Item                     | `ColorItem`            | [Color Item](https://ui.unoff.dev/?path=/docs/components-lists-color-item--documentation)                         | `color-sample`                                                                                                  | [1018:542](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=1018-542) |
| Draggable Item _(TbC)_         | `DraggableItem`        | [Draggable Item](https://ui.unoff.dev/?path=/docs/components-lists-draggable-item--documentation)                 | `color-item`, `rich-color-item`                                                                                 | [3543:9365](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3543-9365) |
| Keyboard Shortcut Item _(TbC)_ | `KeyboardShortcutItem` | [Keyboard Shortcut Item](https://ui.unoff.dev/?path=/docs/components-lists-keyboard-shortcut-item--documentation) | `single-key`, `combo-keys`, `several-combo-keys`                                                                | [3543:9367](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3543-9367) |
| Members List                   | `MembersList`          | [Members List](https://ui.unoff.dev/?path=/docs/components-lists-members-list--documentation)                     | `default`, `show-all-members`, `show-one-member`, `empty-list`                                                  | [3212:5394](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3212-5394) |
| Sortable List _(TbC)_          | `SortableList`         | [Sortable List](https://ui.unoff.dev/?path=/docs/components-lists-sortable-list--documentation)                   | `simple-colors`                                                                                                 | [3543:9366](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3543-9366) |
| Tabs                           | `Tabs`                 | [Tabs](https://ui.unoff.dev/?path=/docs/components-lists-tabs--documentation)                                     | `three-tabs`, `five-tabs`                                                                                       | [1018:530](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=1018-530) |

### Tags

| Figma Name | npm Export | Storybook Docs                                                                     | Key Stories                                                                                               | Figma |
| ---------- | ---------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----- |
| Chip       | `Chip`     | [Chip](https://ui.unoff.dev/?path=/docs/components-tags-chip--documentation)       | `new`, `pro`, `score`                                                                                     | [1018:531](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=1018-531) |
| Tooltip    | `Tooltip`  | [Tooltip](https://ui.unoff.dev/?path=/docs/components-tags-tooltip--documentation) | `single-line-bottom`, `single-line-top`, `multi-line-bottom`, `multi-line-top`, `with-image`, `long-text` | [3265:47830](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3265-47830) |

---

## Patterns

Patterns are **composed components** — they wrap and orchestrate atomic components into opinionated layouts.

### Dialogs

| Figma Name      | npm Export                        | Storybook Docs                                                                      | Key Stories                                                                                        | Figma |
| --------------- | --------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----- |
| Consent _(TbC)_ | `Consent`, `ConsentConfiguration` | [Consent](https://ui.unoff.dev/?path=/docs/patterns-dialogs-consent--documentation) | `single-vendor`, `several-vendors`                                                                 | [3266:67452](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3266-67452) |
| Dialog          | `Dialog`                          | [Dialog](https://ui.unoff.dev/?path=/docs/patterns-dialogs-dialog--documentation)   | `single-message`, `multiple-message`, `form`, `delete-dialog`, `loading-dialog`, `dialog-on-error` | [3266:67453](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3266-67453) |

### Slots

Slots are structural layout patterns — they define where content goes, not what the content is.

| Figma Name          | npm Export   | Storybook Docs                                                                            | Key Stories                                                                    | Figma |
| ------------------- | ------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----- |
| Bar _(DdD)_         | `Bar`        | [Bar](https://ui.unoff.dev/?path=/docs/patterns-slots-bar--documentation)                 | `default`, `truncate-left`, `truncate-right`, `truncate-solo`, `truncate-both` | [3266:67454](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3266-67454) |
| Drawer _(TbC)_      | `Drawer`     | [Drawer](https://ui.unoff.dev/?path=/docs/patterns-slots-drawer--documentation)           | `default`                                                                      | [3543:4195](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3543-4195) |
| Form Item           | `FormItem`   | [Form Item](https://ui.unoff.dev/?path=/docs/patterns-slots-form-item--documentation)     | `text-input-item`, `simple-text-item`                                          | [1018:536](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=1018-536) |
| Layout _(DdD)_      | `Layout`     | [Layout](https://ui.unoff.dev/?path=/docs/patterns-slots-layout--documentation)           | `two-columns`, `three-columns`                                                 | [3266:67456](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3266-67456) |
| List _(DdD)_        | `List`       | [List](https://ui.unoff.dev/?path=/docs/patterns-slots-list--documentation)               | `default`, `message`, `loading`                                                | [3266:67457](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3266-67457) |
| Section _(DdD)_     | `Section`    | [Section](https://ui.unoff.dev/?path=/docs/patterns-slots-section--documentation)         | `default`                                                                      | [3266:67458](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3266-67458) |
| Simple Item _(DdD)_ | `SimpleItem` | [Simple Item](https://ui.unoff.dev/?path=/docs/patterns-slots-simple-item--documentation) | `color-item`                                                                   | [3266:67459](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3266-67459) |

---

## Complete Import Reference

```typescript
import {
  // Foundations
  Icon,
  texts,
  layouts,

  // Components — Actions
  Accordion,
  Button,
  Card,
  Menu,
  SegmentedControl,

  // Components — Assets
  Avatar,
  SectionTitle,
  Thumbnail,

  // Components — Dialogs
  Message,
  Notification,
  SemanticMessage,

  // Components — Inputs
  Dropdown,
  Dropzone,
  Input,
  InputsBar,
  MultipleSlider,
  Select,
  SimpleSlider,

  // Components — Lists
  ActionsItem,
  ActionsList,
  ColorItem,
  DraggableItem,
  KeyboardShortcutItem,
  MembersList,
  SortableList,
  Tabs,

  // Components — Tags
  Chip,
  IconChip,
  Tooltip,

  // Patterns — Dialogs
  Consent,
  ConsentConfiguration,
  Dialog,

  // Patterns — Slots
  Bar,
  Drawer,
  FormItem,
  Layout,
  List,
  Section,
  SimpleItem,
} from "@unoff/ui";
```

---

## Usage in Practice

### 1. Figma → Code

When you see a Figma component named **"Dropdown"** in a spec:

1. Look up the table above → npm export is `Dropdown`
2. Open Storybook at [https://ui.unoff.dev/?path=/docs/components-inputs-dropdown--documentation](https://ui.unoff.dev/?path=/docs/components-inputs-dropdown--documentation) to inspect available props and variants
3. Map the Figma variant values directly to React props

### 2. Code → Figma

When you need to understand what a `<SortableList>` looks like in design:

1. Look up the table above → Figma name is **"Sortable List"** in the _Lists_ group under _Components_
2. Navigate to [Unoff v0.1](https://www.figma.com/design/RDBmy7x5HfkZHpafVqHNWQ/Unoff-v0.1?node-id=3329-69503) and find the component page
3. Status is **TbC** — implementation may change

### 3. Via Figma MCP

When the Figma MCP is active (server: `http://127.0.0.1:3845/mcp`), use `get_design_context` to extract component instances from a spec frame. The `name` attribute on each `<instance>` matches the Figma library name in the table above.

```
<instance name="Button" ...>
  → Button in Figma = Button from @unoff/ui
  → See: https://ui.unoff.dev/?path=/docs/components-actions-button--documentation
```

### 4. Via Storybook MCP

When Storybook is running at `https://ui.unoff.dev`, use `index.json` to enumerate available stories:

```
GET https://ui.unoff.dev/index.json
```

Each entry has a `componentPath` pointing to the source file in `@unoff/ui`, confirming the exact export name.

---

## Related Skills

- **[component-library](./component-library.md)** — Full prop reference and usage examples for each component
- **[implement-design](../externals/implement-design.md)** — End-to-end workflow: Figma spec → production code
