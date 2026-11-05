# Changelog

All notable changes to this plugin are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [0.3.1] - 2026-11-03
### Added
- A machine contract written with every documentation: a declarative JSON
  description of the component or family (props, rules, token references,
  exceptions) stored in the file's shared plugin data, so AI agents connected
  to the Penpot MCP server can read it without opening the plugin. It always
  covers every variant, and is flagged as outdated when the component or one
  of its tokens changes.
- Copy a documentation's contract, or ready-to-paste instructions for an
  agent, from its row in the Generated tab; keep contracts up to date
  automatically from the Options tab if you opt in.
- A Props view: each variant property with its values and what it drives.
- A declarative summary in the documentation header: share of tokenized
  values, share of layout-driven parts, and the number of exceptions.
- Measurement values tagged `rule` or `measured`, so a distance that no layout
  produces is never mistaken for a spec.
- Layout now states how texts grow, the resize constraints of parts outside
  any layout, content clipping and layer order changes.
- Token chains in the colors view (`button.bg → color.action.primary → #0B5FFF`).

### Changed
- The Documentation tab warns when a generation may be slow on a large
  volume; the Generate button sits at the right of the selection header.
- Descriptions and sub-options are offset under their control, and the footer
  icons sit at the right.
- Faster generation and status checks: the documentation and the contract
  share one analysis, and each shape property is read once per run.

## [0.3.0] - 2026-10-22
### Added
- Generate a developer-oriented documentation of a component or a component
  family directly on the Penpot canvas, as a 6-column grid of native cards.
- Annotations drawn on a specimen: dimension and spacing redlines, radius
  callouts, numbered parts with leader lines, and an exploded view of the
  parts.
- Specs as compact tables of values, tokens and styles: variants, anatomy,
  measurements (size, padding, gap, radius, layout) and colors & references.
- Layout documentation for each container: none, flex or grid, with
  direction, wrap, alignment, justification, gaps and grid tracks.
- A merged anatomy view: one anatomy for the whole family, with a parts table
  listing the union of every variant's parts.
- Values keyed by the variant property that drives them, and the option to
  choose which variants of a family are documented.
- A Generated tab to list the documentations of the page, locate them, see
  which ones are outdated and update them. Re-generating a documented
  component updates the existing documentation instead of duplicating it.
- An Options tab to set the annotation style (color, text size, unit, label
  placement, scale mode); changes apply and persist as they are made.
