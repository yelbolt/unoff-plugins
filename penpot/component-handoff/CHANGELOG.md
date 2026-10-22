# Changelog

All notable changes to this plugin are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]
### Added
- The plugin manifest now carries a description of what the plugin does.

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
