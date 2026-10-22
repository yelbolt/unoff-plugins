# Agent instructions

<!-- unoff:specs:start -->

## Functional specs

This project pairs **implementation skills** (how we build) with **functional
specs** (what the product does). Read both before writing code.

- **How** → `.claude/skills/unoff-create-plugin/` — architecture, conventions, platform APIs
- **What** → `specs/INDEX.md` — product behaviour and rules

When a task maps to a spec below, load that spec **and** the skill files for
the layers it declares in its frontmatter (`layers:`). The mapping from layer
to skill files is in `specs/INDEX.md`.

- `specs/component-handoff-annotations-and-specs.md` — Generate a developer-oriented spec of a component or a component family on the Penpot canvas, as a 6-column grid of native cards — variants with their properties, one merged anatomy, measurements and layout (flex, grid, fill, fit), colors with the tokens and styles applied, values keyed by the variant property that drives them — listed, locatable and updatable from the plugin.

<!-- unoff:specs:end -->
