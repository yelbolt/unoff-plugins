# Changelog

All notable changes to this plugin are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]
### Fixed
- The manifest's `code`/`icon` paths now resolve relative to the manifest
  itself instead of the domain root, so the plugin loads correctly from
  its hosted path instead of 404ing.

## [0.3.0] - 2026-09-02
### Added
- Token audit across a chosen scope (selection, page, or document) and
  category (color, spacing, radius, typography, dimension), returning a
  coverage rate and a deviation list grouped by value and prioritized as
  exact match, near match, or orphan.
- Selecting the layers behind a deviation group directly on canvas.
- Applying a proposed token to a single occurrence, a whole deviation
  group, or every exact match in scope in one action, with a report of
  what was applied and what was skipped.
- Automatic nearest-token matching using perceptual color distance for
  near/orphan groups, with per-suggestion validation before anything is
  written.
- Creating a new token from an unmatched deviation, into an active token
  set of the user's choice.

### Fixed
- Selecting a deviation whose shape lives on a page other than the one
  currently open (a component's main definition, or a DOCUMENT-scope
  result) now switches to that page first, instead of silently failing to
  select and zooming into empty space on the active page.
- A property already governed by a token — on a main component, an
  instance, or a standalone element — no longer shows up as a false
  deviation. Compliance is now checked against the shape that actually
  owns the token binding for that property, rather than always the
  traversed shape.
- The "main component" deviation count now gets the same warning styling
  as instance overrides, instead of a plain, easy-to-miss chip.
