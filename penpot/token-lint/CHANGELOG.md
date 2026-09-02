# Changelog

All notable changes to this plugin are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]
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
