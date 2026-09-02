---
name: token-list-audit-and-application
description: Audit the current design token within a file and audit the applied ones, then the raw colors to switch them to the tokens.
status: draft
---

# Token Lint — Token audit and application

## Problem

Penpot exposes design tokens through its Plugins API since 2.14, and five catalog plugins already create, import and export them. Not one answers the two questions that matter once tokens exist: **where is my design system not applied?** and **how do I fix that in one action?**

So files drift. A color gets typed by hand, a spacing gets nudged, an instance gets overridden — and nothing surfaces it. The token set becomes documentation rather than a source of truth, and nobody can state a coverage figure.

## User flow

1. The designer opens the plugin on a file they inherited.
2. They pick a scope (selection, page, document) and the categories to audit: color, spacing, radius, typography, dimension.
3. They run the audit. The plugin returns a coverage rate and a **priority list** of deviations, grouped by value and ordered by how cheap the fix is:
    - **Exact matches first** — a hard-coded value strictly equal to the resolved value of an already active token. Nothing to decide: the plugin names the token and offers to apply it.
    - **Near matches** next — a value close to an active token, with the residual difference shown.
    - **Orphan values** last — nothing comparable in the active sets. The plugin suggests creating a token rather than forcing a match.
4. They expand a group — for example “`#3B82F6` used on 47 layers, resolves to `color.action.primary`” — and select those layers on canvas to see what is affected.
5. They apply the proposed token, **case by case or in bulk**: one occurrence, a whole group, or every exact match in the scope in a single action. The plugin announces the exact count, applies, then reports what changed and what was skipped, with reasons.
6. For groups with no obvious target, they open automatic matching: the plugin suggests the nearest existing token with its residual difference. They validate or reject each suggestion individually.
7. When nothing fits, either an orphan value or a near match they refuse to snap, they create the token from the audit itself: they pick a destination among the active sets, keep or edit the proposed name, and the plugin creates the token then applies it to the group.
8. Separately, they run token refactoring to swap or rename a token and propagate every reference.
9. Separately again, they run set hygiene to find unused tokens, broken aliases, duplicate values, scale gaps and off-convention names.

## Rules

- Deviations are always grouped by value, never listed layer by layer. A 47-row list is not actionable.
- An exact match is a hard-coded value strictly equal to the **resolved** value of a token active in the document. That resolution follows the alias chain to its end.
- Only active tokens are proposed. A token from an unapplied or disabled set is never suggested.
- Several active tokens resolving to the same value surface all of them, with their names. The plugin does not pick.
- “Apply every exact match in scope” is a single, undoable action, and it is the plugin's headline feature.
- Hidden, locked or off-board elements are counted but can be excluded.
- A deviation inside a component is counted once, on the main component, and labelled as such.
- Inherited or computed values are not deviations.
- Bulk application announces the exact affected count before writing, and reports skipped items with a reason afterwards.
- Applying to an instance where the property is inherited redirects to the main component rather than creating an override.
- A token type incompatible with the target property is refused explicitly.
- Automatic matching uses **perceptual** color distance, not RGB distance. Numeric matching uses the nearest step on the scale.
- **Automatic matching never writes anything without explicit human validation.** Ties surface every candidate; no candidate is auto-elected.
- When no token sits within a reasonable radius, suggest creating one instead of forcing a bad match.
- **Token creation is available on any orphan value and on any near match**, directly from the audit. It is the only creation the plugin does: one deviating value becomes one token, which is then applied.
- Creation requires picking a destination among the **active** sets. An unapplied or disabled set is never offered, and the destination is never chosen silently.
- The plugin proposes a default name built from the token type and the value, separated by dots: `color.3b82f6`, `spacing.12`, `radius.8`. The name stays editable before creation.
- A name that already exists in the target set is refused, with the option to apply that existing token instead of creating a duplicate.
- Once created, the token is applied to the group that triggered the creation, in a single undoable action, and the coverage rate is recomputed.
- Refactoring resolves alias chains end to end and displays them. Circular chains are refused with an explanation.
- Set hygiene is informational; it proposes an action only when the fix is unambiguous.

## Out of scope

- Managing token sets: bulk creation, editing, renaming outside a deviation, import, export. That stays Design Token Manager's territory, so plug into it rather than compete with it. The single exception is creating one token from one deviation, described above.
- Export to code.
- Git synchronization.
- Audit history and trend tracking.

## Acceptance criteria

- [ ]  On a 2,000-layer document, the audit completes and stays interruptible.
- [ ]  The coverage rate is reproducible: two consecutive runs return the same figure.
- [ ]  No bulk application touches an element outside the announced scope.
- [ ]  A bulk application is undoable with a single editor undo.
- [ ]  The report clearly separates deviations on main components from those on instances.
- [ ]  Automatic matching never applies anything without explicit validation.
- [ ]  Creating a token from a deviation never writes into an inactive set, and the created token is applied to its group in the same undoable action.
- [ ]  Refactoring a token with a three-level alias chain updates every reference in it.

## Implementation notes

- **Discard the current template.** What ships today is starter scaffolding, not a base to extend. Strip it out and let this spec drive the structure, the UI and the naming end to end.
- Build the resolved-value index of active tokens first, then match hard-coded values against it. Every priority tier is a query on that same index, which is what keeps the list cheap to recompute.
- Reuse Select's traversal and filtering layer. Build Select first; this plugin is its heaviest consumer.
- Separate the read pass from the write pass entirely. The audit must be a pure analysis producing a report object; application consumes that object. This keeps coverage reproducible and makes preview trivial.
- Coverage is a ratio of auditable properties, not of layers. Define what counts as auditable per element type early — it drives every number the plugin displays.
- Perceptual color distance is the one place worth pulling a known formula rather than improvising. Document which one, in the UI.
- Batch writes so the whole application collapses into a single undo entry.
- The audit on a large document should stream results as it goes rather than block until completion.
