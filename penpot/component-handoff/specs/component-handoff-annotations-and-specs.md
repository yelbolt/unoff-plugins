---
name: component-handoff-annotations-and-specs
description: Generate a developer-oriented documentation of a component or a component family on the Penpot canvas — annotations (redlines, numbered parts, exploded view, layout symbols) and specs (tables of values, tokens and styles) as a 6-column grid of native cards, with variants, one merged anatomy, measurements and layout (flex, grid, fill, fit), values keyed by the variant property that drives them — listed, locatable and updatable from the plugin. Separately, a machine-readable contract (props, rules, tokens, exceptions) stored as shared plugin data, for AI agents reading the file through the Penpot MCP server.
layers: [canvas, bridge, ui]
platforms: [penpot]
status: in-progress
---

# Component Handoff Annotations And Specs

## Problem

When a mockup goes to engineering, someone has to state the numbers: this card is 320 wide, these two blocks sit 24 apart, this container has 16 of padding, this button uses `color.action.primary`. Penpot has native comments and an inspect panel, but nothing that **draws** those measurements onto the canvas as a durable, shareable artifact.

So designers redraw redlines by hand with lines and text boxes, then re-edit them every time a value moves. Or they skip it, and engineering guesses.

Redlines also answer the wrong question. A measured "24" between two blocks says what is **observed**; Penpot designs are built from CSS-native rules — flex and grid layouts, sizing modes, design tokens — so what engineering needs is the **rule that produces** the 24: `gap: {spacing.lg}` in a column flex. A handoff in Penpot's spirit is **declarative**: it states the component's contract — its properties, the rules each property drives, the tokens it references — and isolates whatever is not backed by a rule.

Engineering increasingly reads designs through AI agents connected to the Penpot MCP server. What an agent sees today is either the raw shape tree (`x`, `y`, bounds — imperative), `generateStyle` output (one shape at a time, literal pixels, no notion of variant), or the drawn documentation (rectangles and text it has to guess the structure of). The plugin's own analysis — drivers, parts, fingerprint — sits in private plugin data no other plugin can read.

## Two outputs, two readers

Component Handoff produces two outputs from the same analysis. They are **independent**: each has its own switch, its own options, its own place in the panel and its own update policy. Neither is a by-product of the other, and an option of one never changes the other.

| | Visual documentation | Machine contract |
| --- | --- | --- |
| Reader | A developer or designer, on the canvas | An AI agent, through the Penpot MCP server |
| Form | Native boards, shapes and text beside the design | One JSON document per component or family, in shared plugin data |
| Where | Its own layer, outside the documented board | On the file (`penpot.currentFile`), never on the canvas |
| Scope | The views ticked, the variants matching the filter | Always the **whole** component or family — every variant, every part, every rule. No view selection, no variant filter |
| Style | Annotation style (color, text size, unit, placement, scale) | None. Lengths in design pixels, tokens by name |
| Part identity | Numbers, following the numbered-layers choice | Stable layer paths, plus the number when a visual documentation exists |
| Interactions | Locate, select, read, update | Copy, copy agent instructions, update, remove |
| When outdated | Flagged; the designer decides to update | Flagged in the contract itself, so the agent knows; updated by the designer, or automatically if the designer opted in |

The reason for the split: a filter, a numbering depth or a scale mode is a **presentation** choice that helps a human read a sheet. Applied to the contract, it would silently hide variants or rules from an agent that has no way to know they were left out.

## User flow

The interaction model follows the sketch **EightShapes Specs** established on Figma: select a component, tick which views to generate, generate the documentation as native content on the Penpot document itself.

A documentation is made of two kinds of content. **Annotations** are what is drawn on a specimen of the component: dimension and spacing redlines, radius callouts, numbered markers with their leader lines, the exploded view of the parts, and the layout symbols (fix, fill, fit, direction, gap). **Specs** are the tables beside them: values, tokens, styles and variant properties. Annotations make a value visible where it applies; specs state it exactly.

The documentation is written **for developers**: it favours a few dense, useful tables over many specimens. Simplicity wins over exhaustiveness.

The panel has three tabs: **Documentation** (what to document, generate), **Generated** (the documentations and contracts of the page) and **Options** (annotation style, which applies to the visual documentation only).

Under the selection header and *What to document*, an **Outputs** section groups the two switches, one under the other: **Visual documentation** (on by default) and **Machine contract** (off by default), each with a one-line description of what it produces. Below it come the options of each output that is switched on — the visual documentation's first (steps 4 and 5), then the contract's (step 6). With both switches off, Generate is disabled.

Generating runs inside Penpot and blocks it while it works: a large family documented at every depth can freeze the tab for a long time. When the estimated volume of an output is large (documented variants × numbered parts), its options start with a warning that says so and suggests what reduces it — fewer variants, direct layers. The machine contract always covers the whole family, so only its own volume counts. Switching an output on never computes anything by itself.

1. The designer selects a **component** (a main component, a copy, or any board) or a **component family** (a variant container, or one of its variants with "whole family" ticked).
2. They open the plugin. A single information message, when one applies, sits at the very top — above the selection summary. Never two messages saying the same thing.
3. A compact header says what will be documented: kind, name, variant count, and a one-line summary of the variant properties (e.g. `Variant · 3 values`, `Size · 4 values`) — never a raw dump of every value. The **Generate** button lives in this header, so it is reachable without scrolling. When the selection is a generated documentation, the header says so with a chip (e.g. `Documentation`) that sets it apart from design selections — no warning message.
4. **Visual documentation** — they tick which views to generate — variants (family only), props (family only), anatomy, measurements, colors & references. Every list of checkboxes is laid out vertically, one option per line. Under Anatomy, a **numbered layers** choice explains, for the selected element, what each option will do to the generated documentation: *direct layers* numbers the layers directly inside the component (listed by name, with their count) so that anatomy, measurements and colors break it down into those parts, and deeper layers stay part of their parent; *every layer* numbers all nested layers at every depth (with their count), for the most detailed documentation, with a longer parts table and more markers. An element without inner layers says that only the component itself is documented. For a family, they also choose the **grouping** (*merged*: one anatomy and one set of tables for the whole family — the default; *per structure*: one per group of variants sharing a structure).
   For a family they can also narrow **which variants are documented**: the options are built from the family's own properties — one group per property, one checkbox per value, all ticked by default — and a counter shows how many variants match (e.g. `4 / 12 variants`). A variant is documented when each of its property values is ticked. The filter applies to every view of the visual documentation: variants, props, anatomy, measurements and colors. It never applies to the machine contract.
5. They generate. One documentation board is drawn beside the design.
6. **Machine contract** — the section has no view, filter or style option: a contract always covers the whole component or family. When the selected component or family already has a contract, it shows that contract's one-line summary (e.g. `2 props · 14 rules · 92 % tokenized · 2 exceptions`), its generation date and whether it is outdated; otherwise it says none has been generated yet. Nothing is computed to show it — it is read from the stored contract. It offers:
   - **Keep up to date automatically** (off by default) — when an outdated contract is detected, rewrite it without asking. A contract has no visual footprint, so updating it disturbs nothing on the canvas; it stays opt-in because it changes what agents read.
   - **Copy contract** — the stored JSON, for pasting into a prompt or a repository; unavailable until a contract exists.
   - **Copy agent instructions** — a short, ready-to-paste text telling an agent connected to the Penpot MCP server where the contract is, how to read it, how to check it is current, and to fall back on the raw design only when no current contract exists (see *Machine contract*).
   Generating writes or rewrites the contract; nothing is drawn.
7. In the **Generated** tab they find every documentation and every contract of the page, each row tagged `Documentation` or `Contract`; a component with both has two rows. A documentation row offers **locate** (select and bring into view) and update. A contract row offers copy, update and remove — never locate, as it has no shape. Both kinds show when they are outdated. When a documented main component changes, the tab flags each of its outputs and offers to update, one by one or all at once.
8. In the **Options** tab they set the annotation style (color, text size, unit, label placement, scale mode). **Changes apply and persist as they are made** — there is no save button and no confirmation message; the scale-mode choice is explained by the dropdown's own hint, with no extra "current mode" line. Every choice offers all its options; a setting with a single option is not shown. The style is stored on the document.
9. Re-generating on an already-documented component updates the existing documentation and contract rather than duplicating them.

## What the documentation shows

One documentation board per documented component or family, laid out on a **6-column grid**. Every card occupies whole columns: its **width is controlled** (derived from its span), its **height fits its content**. **Reading order is never broken**: cards are placed strictly in the order they are read, left to right, then top to bottom — a later card never moves up to fill a gap. Cards of a row stretch to the row's height where the platform allows, so rows read as even bands. Views keep this reading order: **Header, Variants, Props, Anatomy, Measurements, Colors & references**. No label or value wraps, overflows its card, or overlaps another element.

| Element | Columns |
| --- | --- |
| Header, view titles | 6 |
| Variant card | 1 (2 when its instance is too wide for one column) |
| Props table | 6 |
| Measurement card (Size, Padding, Gap, Radius, Layout; empty categories omitted) | 3 — always two per row, never widened; the column width is chosen so a span of 3 holds the widest measurement table |
| Anatomy, compact component (few parts) | specimen 2 + parts table and exploded view 4 |
| Anatomy, rich component | 6 |
| Colors | per variant group: specimen 2, then each part card 2 — a group always starts a new row, so a variant's specimen and its parts read left to right on one band; an empty cell closes a row that is not full |

Measurements read in this order, two cards per row: **Size, Padding / Gap, Radius / Layout**. Without a Gap card, the order is **Size, Padding / Radius, Layout**. A new variant group in Colors or Anatomy always starts a new row; a row that is not full is simply closed, never backfilled.

**One presentation model everywhere** — white cards, each holding a specimen and/or a compact table, sized to fit their content.

- **Header** — component or family name, library path, kind, date of generation, and a **declarative summary** of the documented variants: the share of values backed by a token, the share of parts placed by a layout rather than positioned, and the count of exceptions (e.g. `Tokenized 92 % · Layout-driven 100 % · 2 exceptions`). It states facts, never a grade.
- **Variants** (family only, first) — every variant with its property values: one card per variant, packed in a grid, with the variant instance and a `Property | Value` table. No default variant.
- **Props** (family only) — the component's API, read the other way round from the measurement and color tables: one row per variant property, with its values and **what it drives** — the parts and properties whose value changes with it (`Size | sm · md · lg | height, padding, label font size, radius`; `State | default · hover · disabled | container fill, label color, opacity`). A property that drives nothing says so. A value that no single property explains is listed under `Combined`, with the properties involved.
- **Anatomy** — *merged* (default): **one** anatomy for the whole family, drawn on the first variant, with numbered parts and the exploded parts; a table lists each part of the **union** of all variants' parts with the variants it appears in (`All variants`, or the property values that bring it, e.g. `Size=icon`). *Per structure*: one anatomy per group of variants sharing the same layer structure.
- **Measurements** — *merged* (default): **one** specimen per category (**Size**, **Padding**, **Gap**, **Radius**, **Layout**) on the first variant, carrying only that category's redlines, and **one** table per category: `Part | Property | Value`. When a value is the same for every variant it is shown once; when it varies, the table names the variant property that drives it and lists one value per property value (e.g. `Size: sm 32 · md 40 · lg 48`); if no single property explains it, it lists the value per variant. *Per structure*: the same, per structure group.
  Every value carries its **origin** as a chip: `rule` when it comes from a layout property (padding, gap, sizing, min/max) or a token, `measured` when it is a distance observed between parts that no layout places — siblings without a flex or grid parent, or absolutely positioned. A measured value is still shown, but as a fact, not a contract: the developer is told not to hard-code it as one.
- **Layout** (a measurements category) — how each part is laid out, as developers need it: the layout of each container (none, flex or grid; direction, wrap, alignment, justification, gaps; for grid, its column and row tracks) and the sizing of each part (horizontal and vertical: **fix**, **fill**, **fit/auto**; min/max; absolute positioning). It also states the behaviours a developer cannot read off a static specimen: how each text grows (`growType`: *fixed*, *auto width* — the text pushes its container, *auto height* — the text wraps), the resize constraints of parts outside any layout (`constraintsHorizontal` / `constraintsVertical`), whether a container clips its content (`clipContent`), and a layer order set by `zIndex` when it differs from the layer order. Same keyed-by-driving-property rule when it varies. On the specimen, layout is shown with **symbols placed around the parts, never lines drawn over their text**: each part is outlined (dashed), its horizontal sizing is drawn along its bottom edge and its vertical sizing along its right edge — *fix*: a bar with an end tick at each side; *fill*: arrows pointing outward to the edges; *fit*: arrows pointing inward, hugging the content — each with a small `Fix` / `Fill` / `Fit` label; a flex container shows its direction with an arrow beside it and its gap as a bracket between two children; a grid shows its tracks as an outline.
- **Colors & references** — same principle: one specimen with part numbers, and one table per part (fills, strokes, typography, effects: swatch, then **token**, else **style**, else raw), with varying references keyed by the variant property that drives them. A token that references another token shows its chain down to the value (`button.bg → color.action.primary → #0B5FFF`), so the developer sees which semantic name to reference, not only the final value.

A component (not a family) is documented the same way with a single variant.

## Machine contract

The contract is the declarative description of a component or family, written for an agent that will implement or check it. It is the same analysis as the visual documentation — parts, drivers, references, layout — serialized, never re-derived differently.

**Where it lives.** In shared plugin data on the file (`penpot.currentFile.setSharedPluginData`), namespace `unoff.handoff`, readable by any plugin — and so by the Penpot MCP plugin, through `execute_code`:

- `index` — the list of contracts in the file: `[{ "key": "contract:<id>", "name": "Button", "page": "<page id>", "status": "current" }]`.
- `contract:<id>` — one contract, `<id>` being the same stable identity the visual documentation uses to link to its component or family.

One key per contract keeps each value small and lets an agent read only what it needs. The index records the page of the documented component, and follows it when the component moves to another page. Nothing is written on the documented component itself.

**Shape** (schema `unoff.handoff/contract@1`):

```json
{
  "schema": "unoff.handoff/contract@1",
  "component": { "id": "…", "name": "Button", "kind": "family", "library": "DS Core" },
  "status": "current",
  "generatedAt": "2026-11-02T10:24:00Z",
  "fingerprint": "a3f9…",
  "props": { "Size": ["sm", "md", "lg"], "State": ["default", "hover", "disabled"] },
  "parts": [
    { "path": "Button", "n": 1, "type": "board", "in": "all" },
    { "path": "Button/Label", "n": 2, "type": "text", "in": "all" },
    { "path": "Button/Icon", "n": 3, "type": "board", "in": { "Size": ["md", "lg"] } }
  ],
  "rules": [
    { "part": "Button", "prop": "layout", "value": { "type": "flex", "dir": "row", "alignItems": "center", "justifyContent": "center" } },
    { "part": "Button", "prop": "columnGap", "value": "{spacing.sm}" },
    { "part": "Button", "prop": "sizing", "value": { "h": "fit", "v": "fix" } },
    { "part": "Button", "prop": "height", "by": "Size",
      "values": { "sm": "{size.control.sm}", "md": "{size.control.md}", "lg": "{size.control.lg}" } },
    { "part": "Button", "prop": "fill", "by": "State",
      "values": { "default": "{color.action.primary}", "hover": "{color.action.primary-hover}", "disabled": "{color.action.disabled}" } },
    { "part": "Button/Label", "prop": "growType", "value": "auto-width" },
    { "part": "Button/Label", "prop": "typography", "by": "Size",
      "values": { "sm": "{type.label.sm}", "md": "{type.label.md}", "lg": "{type.label.md}" } }
  ],
  "exceptions": [
    { "part": "Button/Badge", "kind": "absolute", "note": "positioned, not placed by a layout" },
    { "part": "Button/Icon", "prop": "fill", "value": "#E5E5E5", "kind": "raw" }
  ],
  "tokens": {
    "color.action.primary": { "type": "color", "value": "{color.blue.600}", "resolved": "#0B5FFF", "set": "brand" }
  }
}
```

- **Rules** are what an implementation must reproduce: layout, sizing, gaps, paddings, radii, references, text behaviour. A rule's value is a **token reference** (`{name}`, as in the DTCG format Penpot exports) whenever a token is applied, otherwise the style name, otherwise the raw value — the same precedence as the visual documentation. Lengths without a token are numbers in design pixels.
- A rule that varies names the property that drives it (`"by"`) and gives one value per property value. When no single property explains it, `"by"` lists the properties involved and `"values"` is keyed by their combined values (`"sm|hover"`).
- **Exceptions** are everything that is not a rule: absolutely positioned parts, distances only measured between unplaced parts, raw values where a token of the same type exists in the file. An agent reproduces them only after flagging them; it never promotes them to rules.
- **Tokens** lists every token the rules reference, with its value (which may itself be a reference), resolved value and set — enough to follow a chain without another read.
- **Parts** are identified by their layer path (names from the root, with `[i]` when siblings share a name), which stays readable and stable across variants. `n` is the part number of the visual documentation as last generated, present only when one exists. It is a snapshot taken when the contract is written: regenerating or removing the visual documentation does not change it until the contract itself is regenerated. `in` says which variants contain the part.
- **Status** is `current` or `outdated`. When the plugin detects that the component changed, or that a token the contract embeds changed value or reference (at launch, after a save), it sets `status` to `outdated` in the contract and the index, so an agent that reads it later knows not to trust it. Flagging is the only write the plugin makes on its own; rewriting the contract waits for the designer, unless *Keep up to date automatically* is on. Detection only runs while the plugin is open, so `current` means *current at the last check*: the agent instructions say so, and give `generatedAt` for the agent to report.

**Agent instructions** — the text copied by *Copy agent instructions* tells an agent, in a few lines: read `index` from `penpot.currentFile.getSharedPluginData('unoff.handoff', 'index')`; read the matching `contract:<id>`; if `status` is `outdated` or no contract exists, say so and ask for it to be updated before implementing — fall back on the shape tree and `generateStyle` only when told to; implement the props as the component's API, rules as styles referencing tokens, never resolved values; list exceptions instead of hard-coding them silently.

## Visual style

The documentation follows the unoff brand, consistently with other generated documents (e.g. the UI Color Palette sheet):

- **Surface** — a white documentation board with a **32 px radius**; cards are light surfaces with a 32 px radius (smaller radii for chips and swatches, from the same 4-px scale).
- **Type** — **Martian Mono** for titles, section titles, metadata and property names; **Lexend** for labels, values and running text. Text color is the brand dark `#00212B` (rgb 0, 0.129, 0.168), with lighter tints of it for secondary text.
- **Spacing** — an 8-point rhythm: every padding, gap and margin is a multiple of 4 (4, 8, 12, 16, 20, 24, 32, 40, 48…). No ad-hoc values.
- **Chips** — short values (token names, `raw` / `token` / `style` tags, property values) are shown as small rounded chips, as in the palette sheet.
- **Header** — title on the left in Martian Mono; metadata (kind, library path, generation date, variant filter) aligned on the right in Martian Mono.
- The annotation style chosen in Options (color, text size, unit, label placement, scale mode) drives the annotations — redlines, labels, markers, leaders and layout symbols; the brand style drives the documentation's own surfaces and text.

## Rules

- Displayed values must match Penpot's properties panel exactly. A wrong number is worse than no annotation.
- The generated documentation lives **on the Penpot document**, as native editable boards, shapes and text. Never an export, never an image, never an external artifact.
- Each view is its own section, visually separated from the others. A view never mixes redlines with color references.
- The documentation follows a 6-column grid. What the plugin controls is fixed — a card's width comes from its span and the column width; what it does not control fits — card heights, row heights and the documentation's height hug their content. Nothing is given a size computed from another shape's measured size.
- Text in the documentation never wraps because of a lack of room; it is laid out on one line, and its container grows instead.
- Leader lines and connectors are orthogonal — horizontal and vertical segments only, with an elbow where needed. No diagonal lines, and no line ever lies outside its section.
- Anatomy walks the component and its children. The numbered layers choice (direct layers / every layer) is a visible option, not an assumption.
- Within a variant group, part numbers are the same across anatomy, measurements and colors views.
- References follow a fixed precedence: **token** name, else **style** name, else raw value. Raw values appear only when neither a token nor a style backs the property.
- Color styles are read from the applied reference (`fillColorRefId`, `strokeColorRefId`) and resolved in the local and connected libraries. Typography styles have no readable reference: a typography style is shown only when the text values match a library typography exactly, and it is labelled as matched, never presented as applied.
- When a variant filter is set, only the matching variants are documented, in every view; the header of the documentation states the filter (e.g. `Variant=default · Size=sm, md`). A filter that matches no variant is refused explicitly.
- Variants are described by their own property values. No variant is singled out as a default. When a value varies across variants, it is keyed by the variant property that drives it — never expressed as a difference from one reference variant.
- Documentation lives in one dedicated layer per board, outside the board, so it is excluded from the board's export.
- Overlapping or diagonally placed sibling parts have no meaningful gap: they are not measured, and the documentation says how many pairs were skipped. Never guess silently.
- Rotated elements are measured against their bounding box, and the annotation says so.
- When there is not enough room for a label, offset it with an orthogonal leader line rather than overlap the design.
- Re-running on a documented component updates the existing documentation; it never creates a duplicate.
- A documentation is never updated or deleted silently. When its main component changed, the plugin flags it as outdated and the designer decides to update. A documentation whose component is gone is removed only by an explicit action. Detection runs while the plugin is open: at launch and after each save of the file.
- The visual documentation and the machine contract are separate outputs: each has its own switch and options, and no option of one changes the other. The variant filter, the view selection, the numbered-layers choice and the annotation style apply to the visual documentation only.
- A contract always covers the whole component or family. It never omits a variant, a part or a rule to stay short.
- A contract and the visual documentation of the same component, generated from the same state, never disagree on a value, a reference or a driving property.
- A contract references tokens by name. A resolved value appears in a rule only when no token backs the property.
- What is not a rule is an exception, and is listed as one. A measured distance, an absolute position or a raw value where a token exists is never presented as a rule — in the contract, or in the visual documentation (`measured` chip).
- The contract is stored on the file, never on the documented component, and is readable by other plugins (shared plugin data).
- Legibility across zoom is the designer's choice between two **scale modes**, set in Options: **Design scale** draws everything at 100%, in design pixels — the documentation is the same size whatever the zoom was when it was generated; **Viewport** draws everything — type, strokes, markers, spacing — at the size that reads the same on screen at the zoom the designer had when generating. The dropdown's own hint explains each mode.

## Out of scope

- Exporting a spec document or a PDF.
- Code generation. The machine contract describes the component; turning it into code is the agent's job, outside the plugin.
- A live API: agents read the stored contract through the Penpot MCP server, never by talking to Component Handoff.
- Behaviour specimens (the component instantiated at several widths or with long content to show its rules at work) — deferred.
- Collaborative comments and free notes — Penpot handles those natively.
- Standalone per-measurement tools (dimension, spacing, padding, property sheet): their output is part of the documentation.
- Expressing variants as differences from a reference variant.
- Detecting changes while the plugin is closed.

## Acceptance criteria

- [ ]  The documentation uses Martian Mono for titles and Lexend for text, 32 px radii, the brand dark text color, and spacings that are multiples of 4.
- [ ]  No content of a card extends past the card, and no table row overlaps another.
- [ ]  Displayed values match Penpot's properties panel exactly.
- [ ]  The documentation does not appear in the documented board's export.
- [ ]  In Design scale, a documentation generated at 25% zoom and one generated at 400% zoom have the same size; in Viewport, both read at the same size on screen at the zoom they were generated at.
- [ ]  Re-generating on an already-documented component creates no duplicates.
- [ ]  Each ticked view appears as its own titled section; unticked views are absent.
- [ ]  Specimens are centred in their cards in every view.
- [ ]  In the Layout specimen, sizing modes are shown with distinct symbols (fix, fill, fit) beside the parts; nothing is drawn over a part's text.
- [ ]  Cards are placed in reading order with no backfill; measurements form a 2×2 block; each color variant group starts its own row with its specimen first.
- [ ]  The documentation follows a 6-column grid with the spans of the table above; the documentation's height fits its content; every card contains all of its content, and no text is cut, wrapped, overflowing or overlapping.
- [ ]  Measurements include a Layout category naming each container's layout (flex/grid, direction, alignment, gaps, tracks) and each part's sizing (fix, fill, fit), with values matching the properties panel.
- [ ]  Selecting a generated documentation shows a chip in the header, and no warning message.
- [ ]  The Generate button is in the selection header.
- [ ]  No label or value in the documentation wraps onto several lines.
- [ ]  The documentation contains no diagonal line and no shape outside its sections.
- [ ]  Measurements are grouped by category (size, padding, gap, radius, layout), each with its own specimen; categories with nothing to show are omitted.
- [ ]  In merged grouping, a family gets one anatomy whose part table lists every part of the union with the variants it appears in.
- [ ]  In merged grouping, a measurement that varies across variants is listed per value of the variant property that drives it.
- [ ]  The plugin never shows two messages for the same condition; the information message sits above the selection summary.
- [ ]  Every style setting in Options offers all its options.
- [ ]  Unticking a property value removes the matching variants from every view of the documentation, and the counter matches the number of variants documented.
- [ ]  The Generated tab lists every documentation of the page; locating one selects it and brings it into view.
- [ ]  Every part number in the anatomy appears with the same number in the measurements and colors views.
- [ ]  On a fully tokenized component, the colors view shows token names and zero raw values.
- [ ]  A fill or stroke bound to a library color style shows the style name when no token backs it.
- [ ]  Documenting a family shows every variant as a card with its own property values, first in the documentation, with no default marker and no comparison.
- [ ]  Editing a documented main component, then saving, flags its documentation as outdated in the plugin; updating it clears the flag.
- [ ]  The Documentation tab groups the two output switches in one Outputs section; generating with only one switch on produces only that output.
- [ ]  Switching the machine contract on, or changing the selection, computes nothing: Penpot stays responsive on a 25-variant family.
- [ ]  A large estimated volume shows a slowness warning in the options of the output concerned.
- [ ]  Changing the variant filter, the views, the numbered layers or the annotation style in the panel, then generating the contract, gives the same contract as before, `generatedAt` aside.
- [ ]  An agent connected to the Penpot MCP server, with Component Handoff closed, reads the index and a contract through `penpot.currentFile.getSharedPluginData('unoff.handoff', …)`.
- [ ]  A contract lists every variant property and every variant's parts, whatever the filter of the visual documentation.
- [ ]  On a fully tokenized component, no rule of the contract holds a resolved value.
- [ ]  Every value that varies across variants appears in the contract with the same driving property as in the visual documentation.
- [ ]  An absolutely positioned part appears in `exceptions`, never in `rules`; its measurements carry a `measured` chip in the visual documentation.
- [ ]  Editing a component with a contract, then saving, sets the contract's `status` and its index entry to `outdated`; updating it sets them back to `current`. With *Keep up to date automatically* on, the contract is rewritten instead.
- [ ]  The Generated tab lists documentations and contracts as separate, tagged rows; a contract row has no locate action.
- [ ]  The Props view lists, for each variant property, every part and property it drives, consistently with the measurement and color tables.
- [ ]  A token that references another token shows its full chain in the colors view, and in the contract's `tokens`.

## Implementation notes

- Study EightShapes Specs on Figma before designing the panel: the option-ticking model and the layout of the generated sheet are the part worth copying.
- Documentation needs identity: it must carry a stable link to the component it documents, so re-runs can update rather than duplicate. Plugin data on the documentation group is the carrier; layer naming is for humans.
- Outdated detection: store a fingerprint of the documented component (geometry, layout, radius, fills, strokes, typography, effects, tokens, structure — for a family, every variant) at generation time, and compare it with a fresh one on `contentsave` and at launch.
- Label placement is the hard part, not measurement. Budget most of the effort on collision handling and leader lines.
- **The 6-column grid is realised with flex rows, not Penpot's native grid layout.** A native grid built through the plugin API collapsed in testing (fixed board height, every card stacked in the first cells). Each row is a flex row with fit sizing; each card has a fixed width computed from its span and fit height.
- **Fill where the width is controlled, fit where it is not.** A card's width is known (from its span), so everything inside a card — tables, wrap rows, exploded views, chip rows — uses `fill` horizontally and never gets its own computed width. Heights are never controlled: table rows, cells and cards fit their content, so a multi-line cell grows its row instead of overlapping the next one. Tables are built row by row (one flex row per table row, fit height), with column widths taken from the card's known content width.
- **UI uses the unoff layout primitives**: plugin UI spacing and alignment come from `layouts` in `@unoff/ui` (`snackbar` for rows, `stackbar` for columns, with their `--tight` / `--medium` / `--large`, `--wrap`, `--fill`, `--start` / `--centered` / `--end` variants) rather than ad-hoc inline flex and gap styles.
- **Fonts**: apply Martian Mono and Lexend through the Penpot fonts API (`penpot.fonts.findByName(...)?.applyToText(text)`), falling back to the default font if a font is not available.
- **Never read back a computed size to lay out the documentation.** Penpot resolves auto layout asynchronously: sizes read right after creation are stale, and fixing a size from them truncates text (`Propert/y`) and lets content overflow its card. Let native flex layout do all the work: every board is flex; a width is fixed only where the plugin controls it (cards, from their span), everything else is `fill` or `auto` (fit); text is `auto-width` and is never resized; rows set `alignItems: 'stretch'` so cards of a row share the tallest card's height (best effort — if the platform ignores it, cards stay top-aligned). The only absolutely positioned content is inside a specimen stage, whose size is known up front from the source shape's own width and height.
- Lines are orthogonal, so draw them as thin rectangles rather than path shapes: a path whose geometry fails to apply leaves stray diagonals.
- Scale: every size drawn goes through one scale factor — 1 in Design scale, 1 ÷ viewport zoom in Viewport. The factor is read once, when the generation starts.
- Read token names from the same source Token Lint uses, so both plugins report identically.
- Draw everything as plain native shapes and text. Nothing here should be a group the user cannot open.
- **One analysis, two serializers.** Parts, drivers, references and layout are computed once per generation; the visual views and the contract both read that result. The contract must not re-walk the component with its own logic, or the two outputs will drift.
- **Private vs shared plugin data.** The plugin's own bookkeeping (layers, targets, fingerprint, options) stays in `getPluginData` / `setPluginData`, private to the plugin. The contract and its index go in `setSharedPluginData('unoff.handoff', …)` on `penpot.currentFile`, the only kind another plugin — the MCP plugin — can read. Values are strings: `JSON.stringify` on write, `JSON.parse` in a try/catch on read.
- No size limit is documented for plugin data: keep contracts compact (no resolved values duplicated in rules, tokens listed once) and check the size of the largest family in testing.
- Version the schema from the first release (`contract@1`). A breaking change bumps it; agent instructions name the version they expect.
- Storing the contract on the library component (`LibraryElement` supports plugin data) would let it travel with a shared library, but writing there may count as a library change for consuming files. Not used until tested.
- Penpot variants: `VariantContainer.variants` exposes `properties`, `currentValues(property)` and `variantComponents()`; each `LibraryVariantComponent` has `variantProps`.
