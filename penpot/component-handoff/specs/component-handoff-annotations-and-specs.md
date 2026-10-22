---
name: component-handoff-annotations-and-specs
description: Generate a developer-oriented spec of a component or a component family on the Penpot canvas, as a 6-column grid of native cards — variants with their properties, one merged anatomy, measurements and layout (flex, grid, fill, fit), colors with the tokens and styles applied, values keyed by the variant property that drives them — listed, locatable and updatable from the plugin.
layers: [canvas, bridge, ui]
platforms: [penpot]
status: in-progress
---

# Component Handoff Annotations And Specs

## Problem

When a mockup goes to engineering, someone has to state the numbers: this card is 320 wide, these two blocks sit 24 apart, this container has 16 of padding, this button uses `color.action.primary`. Penpot has native comments and an inspect panel, but nothing that **draws** those measurements onto the canvas as a durable, shareable artifact.

So designers redraw redlines by hand with lines and text boxes, then re-edit them every time a value moves. Or they skip it, and engineering guesses.

## User flow

The interaction model follows the sketch **EightShapes Specs** established on Figma: select a component, tick which views to generate, generate the documentation as native content on the Penpot document itself.

The documentation is written **for developers**: it favours a few dense, useful tables over many specimens. Simplicity wins over exhaustiveness.

The panel has three tabs: **Documentation** (what to document, generate), **Generated** (the documentations on the page) and **Options** (annotation style).

1. The designer selects a **component** (a main component, a copy, or any board) or a **component family** (a variant container, or one of its variants with "whole family" ticked).
2. They open the plugin. A single information message, when one applies, sits at the very top — above the selection summary. Never two messages saying the same thing.
3. A compact header says what will be documented: kind, name, variant count, and a one-line summary of the variant properties (e.g. `Variant · 3 values`, `Size · 4 values`) — never a raw dump of every value. The **Generate** button lives in this header, so it is reachable without scrolling. When the selection is a generated documentation, the header says so with a chip (e.g. `Documentation`) that sets it apart from design selections — no warning message.
4. They tick which views to generate — variants (family only), anatomy, measurements, colors & references. Every list of checkboxes is laid out vertically, one option per line. Under Anatomy, a **numbered layers** choice explains, for the selected element, what each option will do to the generated documentation: *direct layers* numbers the layers directly inside the component (listed by name, with their count) so that anatomy, measurements and colors break it down into those parts, and deeper layers stay part of their parent; *every layer* numbers all nested layers at every depth (with their count), for the most detailed documentation, with a longer parts table and more markers. An element without inner layers says that only the component itself is documented. For a family, they also choose the **grouping** (*merged*: one anatomy and one set of tables for the whole family — the default; *per structure*: one per group of variants sharing a structure).
   For a family they can also narrow **which variants are documented**: the options are built from the family's own properties — one group per property, one checkbox per value, all ticked by default — and a counter shows how many variants match (e.g. `4 / 12 variants`). A variant is documented when each of its property values is ticked. The filter applies to every view: variants, anatomy, measurements and colors.
5. They generate. One documentation board is drawn beside the design.
6. In the **Generated** tab they find every documentation of the page, **locate** it (select and bring into view), and see which ones are outdated. When a documented main component changes, the tab flags it and offers to update, one by one or all at once.
7. In the **Options** tab they set the annotation style (color, text size, unit, label placement, scale mode). **Changes apply and persist as they are made** — there is no save button and no confirmation message; the scale-mode choice is explained by the dropdown's own hint, with no extra "current mode" line. Every choice offers all its options; a setting with a single option is not shown. It persists for the document.
8. Re-generating on an already-documented component updates the existing documentation rather than duplicating it.

## What the documentation shows

One documentation board per documented component or family, laid out on a **6-column grid**. Every card occupies whole columns: its **width is controlled** (derived from its span), its **height fits its content**. **Reading order is never broken**: cards are placed strictly in the order they are read, left to right, then top to bottom — a later card never moves up to fill a gap. Cards of a row stretch to the row's height where the platform allows, so rows read as even bands. Views keep this reading order: **Header, Variants, Anatomy, Measurements, Colors & references**. No label or value wraps, overflows its card, or overlaps another element.

| Element | Columns |
| --- | --- |
| Header, view titles | 6 |
| Variant card | 1 (2 when its instance is too wide for one column) |
| Measurement card (Size, Padding, Gap, Radius, Layout) | 3 — always two per row, never widened; the column width is chosen so a span of 3 holds the widest measurement table |
| Anatomy, compact component (few parts) | specimen 2 + parts table and exploded view 4 |
| Anatomy, rich component | 6 |
| Colors | per variant group: specimen 2, then each part card 2 — a group always starts a new row, so a variant's specimen and its parts read left to right on one band; an empty cell closes a row that is not full |

Measurements read as two rows of two: **Size, Padding / Radius, Layout** (Gap sits with its group when it exists). A new variant group in Colors or Anatomy always starts a new row; a row that is not full is simply closed, never backfilled.

**One presentation model everywhere** — white cards, each holding a specimen and/or a compact table, sized to fit their content.

- **Header** — component or family name, library path, kind, date of generation.
- **Variants** (family only, first) — every variant with its property values: one card per variant, packed in a grid, with the variant instance and a `Property | Value` table. No default variant.
- **Anatomy** — *merged* (default): **one** anatomy for the whole family, drawn on the first variant, with numbered parts and the exploded parts; a table lists each part of the **union** of all variants' parts with the variants it appears in (`All variants`, or the property values that bring it, e.g. `Size=icon`). *Per structure*: one anatomy per group of variants sharing the same layer structure.
- **Measurements** — *merged* (default): **one** specimen per category (**Size**, **Padding**, **Gap**, **Radius**, **Layout**) on the first variant, carrying only that category's redlines, and **one** table per category: `Part | Property | Value`. When a value is the same for every variant it is shown once; when it varies, the table names the variant property that drives it and lists one value per property value (e.g. `Size: sm 32 · md 40 · lg 48`); if no single property explains it, it lists the value per variant. *Per structure*: the same, per structure group.
- **Layout** (a measurements category) — how each part is laid out, as developers need it: the layout of each container (none, flex or grid; direction, wrap, alignment, justification, gaps; for grid, its column and row tracks) and the sizing of each part (horizontal and vertical: **fix**, **fill**, **fit/auto**; min/max; absolute positioning). Same keyed-by-driving-property rule when it varies. On the specimen, layout is shown with **symbols placed around the parts, never lines drawn over their text**: each part is outlined (dashed), its horizontal sizing is drawn along its bottom edge and its vertical sizing along its right edge — *fix*: a bar with an end tick at each side; *fill*: arrows pointing outward to the edges; *fit*: arrows pointing inward, hugging the content — each with a small `Fix` / `Fill` / `Fit` label; a flex container shows its direction with an arrow beside it and its gap as a bracket between two children; a grid shows its tracks as an outline.
- **Colors & references** — same principle: one specimen with part numbers, and one table per part (fills, strokes, typography, effects: swatch, then **token**, else **style**, else raw), with varying references keyed by the variant property that drives them.

A component (not a family) is documented the same way with a single variant.

## Visual style

The documentation follows the unoff brand, consistently with other generated documents (e.g. the UI Color Palette sheet):

- **Surface** — a white documentation board with a **32 px radius**; cards are light surfaces with a 32 px radius (smaller radii for chips and swatches, from the same 4-px scale).
- **Type** — **Martian Mono** for titles, section titles, metadata and property names; **Lexend** for labels, values and running text. Text color is the brand dark `#00212B` (rgb 0, 0.129, 0.168), with lighter tints of it for secondary text.
- **Spacing** — an 8-point rhythm: every padding, gap and margin is a multiple of 4 (4, 8, 12, 16, 20, 24, 32, 40, 48…). No ad-hoc values.
- **Chips** — short values (token names, `raw` / `token` / `style` tags, property values) are shown as small rounded chips, as in the palette sheet.
- **Header** — title on the left in Martian Mono; metadata (kind, library path, generation date, variant filter) aligned on the right in Martian Mono.
- The annotation style chosen in Options (color, text size) still drives redlines, labels and markers; the brand style drives the documentation's own surfaces and text.

## Rules

- Displayed values must match Penpot's properties panel exactly. A wrong number is worse than no annotation.
- The generated documentation lives **on the Penpot document**, as native editable boards, shapes and text. Never an export, never an image, never an external artifact.
- Each view is its own section, visually separated from the others. A view never mixes redlines with color references.
- The documentation follows a 6-column grid. What the plugin controls is fixed — a card's width comes from its span and the column width; what it does not control fits — card heights, row heights and the documentation's height hug their content. Nothing is given a size computed from another shape's measured size.
- Text in the documentation never wraps because of a lack of room; it is laid out on one line, and its container grows instead.
- Leader lines and connectors are orthogonal — horizontal and vertical segments only, with an elbow where needed. No diagonal lines, and no line ever lies outside its section.
- Anatomy walks the component and its children. The parts detail (main parts / all layers) is a visible option, not an assumption.
- Within a variant group, part numbers are the same across anatomy, measurements and colors views.
- References follow a fixed precedence: **token** name, else **style** name, else raw value. Raw values appear only when neither a token nor a style backs the property.
- Color styles are read from the applied reference (`fillColorRefId`, `strokeColorRefId`) and resolved in the local and connected libraries. Typography styles have no readable reference: a typography style is shown only when the text values match a library typography exactly, and it is labelled as matched, never presented as applied.
- When a variant filter is set, only the matching variants are documented, in every view; the header of the documentation states the filter (e.g. `Variant=default · Size=sm, md`). A filter that matches no variant is refused explicitly.
- Variants are described by their own property values. No variant is singled out as a default. When a value varies across variants, it is keyed by the variant property that drives it — never expressed as a difference from one reference variant.
- Documentation lives in one dedicated layer per board, outside the board, so it is excluded from the board's export.
- Overlapping or nested parts: infer the meaningful spacing, or refuse explicitly. Never guess silently.
- Rotated elements are measured against their bounding box, and the annotation says so.
- When there is not enough room for a label, offset it with an orthogonal leader line rather than overlap the design.
- Re-running on a documented component updates the existing documentation; it never creates a duplicate.
- A documentation is never updated or deleted silently. When its main component changed, the plugin flags it as outdated and the designer decides to update. A documentation whose component is gone is removed only by an explicit action. Detection runs while the plugin is open: at launch and after each save of the file.
- Annotations remain legible across the usable zoom range.

## Out of scope

- Exporting a spec document or a PDF.
- Code generation.
- Collaborative comments and free notes — Penpot handles those natively.
- Standalone per-measurement tools (dimension, spacing, padding, property sheet): their output is part of the documentation.
- Expressing variants as differences from a reference variant.
- Detecting changes while the plugin is closed.

## Acceptance criteria

- [ ]  The documentation uses Martian Mono for titles and Lexend for text, 32 px radii, the brand dark text color, and spacings that are multiples of 4.
- [ ]  No content of a card extends past the card, and no table row overlaps another.
- [ ]  Displayed values match Penpot's properties panel exactly.
- [ ]  The documentation does not appear in the documented board's export.
- [ ]  Annotations stay legible at 25% and at 400% zoom.
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
- [ ]  Measurements are grouped by category (size, padding, gap, radius), each with its own specimen.
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

## Implementation notes

- **Discard the current template.** What ships today is starter scaffolding, not a base to extend. Strip it out and let this spec drive the structure, the UI and the naming end to end.
- Study EightShapes Specs on Figma before designing the panel: the option-ticking model and the layout of the generated sheet are the part worth copying.
- Documentation needs identity: it must carry a stable link to the component it documents, so re-runs can update rather than duplicate. Plugin data on the documentation group is the carrier; layer naming is for humans.
- Outdated detection: store a fingerprint of the documented component (geometry, layout, radius, fills, strokes, typography, effects, tokens, structure — for a family, every variant) at generation time, and compare it with a fresh one on `contentsave` and at launch.
- Label placement is the hard part, not measurement. Budget most of the effort on collision handling and leader lines.
- **The 6-column grid is realised with flex rows, not Penpot's native grid layout.** A native grid built through the plugin API collapsed in testing (fixed board height, every card stacked in the first cells). Each row is a flex row with fit sizing; each card has a fixed width computed from its span and fit height.
- **Fill where the width is controlled, fit where it is not.** A card's width is known (from its span), so everything inside a card — tables, wrap rows, exploded views, chip rows — uses `fill` horizontally and never gets its own computed width. Heights are never controlled: table rows, cells and cards fit their content, so a multi-line cell grows its row instead of overlapping the next one. Tables are built row by row (one flex row per table row, fit height), with column widths taken from the card's known content width.
- **UI uses the unoff layout primitives**: plugin UI spacing and alignment come from `layouts` in `@unoff/ui` (`snackbar` for rows, `stackbar` for columns, with their `--tight` / `--medium` / `--large`, `--wrap`, `--fill`, `--start` / `--centered` / `--end` variants) rather than ad-hoc inline flex and gap styles.
- **Fonts**: apply Martian Mono and Lexend through the Penpot fonts API (`penpot.fonts.findByName(...)?.applyToText(text)`), falling back to the default font if a font is not available.
- **Never read back a computed size to lay out the documentation.** Penpot resolves auto layout asynchronously: sizes read right after creation are stale, and fixing a size from them truncates text (`Propert/y`) and lets content overflow its card. Let native flex layout do all the work: every board is flex with `auto` (fit) sizing, columns use `alignItems: 'stretch'`, text is `auto-width` and is never resized. The only absolutely positioned content is inside a specimen stage, whose size is known up front from the source shape's own width and height. Text uses auto-width so it never wraps.
- Lines are orthogonal, so draw them as thin rectangles rather than path shapes: a path whose geometry fails to apply leaves stray diagonals.
- Legibility across zoom means either scale-aware sizing or a deliberate choice to keep annotations at design scale. Pick one and state it in the Options tab.
- Read token names from the same source Token Lint uses, so both plugins report identically.
- Draw everything as plain native shapes and text. Nothing here should be a group the user cannot open.
- Penpot variants: `VariantContainer.variants` exposes `properties`, `currentValues(property)` and `variantComponents()`; each `LibraryVariantComponent` has `variantProps`.
