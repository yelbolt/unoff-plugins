import { tr } from '../i18n'
import {
  drivenText,
  presenceLines,
  resolvePresence,
  variantText,
} from '../drivers'
import { SPACING } from '../constants'
import { px, titleBlock } from './shared'
import type { MergedPart } from '../merged'
import type { Presence, Resolution } from '../drivers'
import type { DocCtx } from './shared'
import type { PanelNode } from '../panel'

// Where a part appears among the variants of the family.
export const presenceOf = (dc: DocCtx, part: MergedPart): Presence =>
  resolvePresence(
    dc.entries.map((e) => ({
      label: e.label,
      props: e.props,
      present: part.shapes.has(e),
    })),
    dc.order
  )

// One line as a text, several lines as a column of texts: a cell may hold
// lines, but a line never wraps.
export const linesCell = (
  dc: DocCtx,
  strs: Array<string>,
  o: { muted?: boolean; bold?: boolean; name: string }
): PanelNode =>
  strs.length === 1
    ? dc.panel.text(strs[0], o)
    : dc.panel.box(
        strs.map((s) => dc.panel.text(s, o)),
        { dir: 'column', gap: px(dc, SPACING[4]), name: 'Lines' }
      )

export const appearsCell = (dc: DocCtx, part: MergedPart): PanelNode =>
  linesCell(dc, presenceLines(presenceOf(dc, part), tr('doc.allVariants')), {
    name: 'Appears in',
  })

// A value that may vary: once, keyed by the driving property, or per variant.
export const valueCell = (dc: DocCtx, res: Resolution<string>): PanelNode => {
  if (res.kind === 'uniform') return dc.panel.text(res.data, { name: 'Value' })
  if (res.kind === 'driven')
    return dc.panel.text(
      drivenText(
        res.property,
        res.items.map((i) => ({ value: i.value, text: i.data }))
      ),
      { name: 'Value' }
    )
  return linesCell(
    dc,
    res.items.map((i) => variantText(i.label, i.data)),
    { name: 'Value' }
  )
}

// The merged specimen is the first variant: say so for a family.
export const specimenTitle = (dc: DocCtx): PanelNode =>
  dc.isFamily
    ? dc.panel.text(tr('doc.specimenOn', { variant: dc.entries[0].label }), {
        bold: true,
        font: 'title',
        name: 'Group title',
      })
    : titleBlock(dc, dc.entries)

export const headerCell = (dc: DocCtx, key: string): PanelNode =>
  dc.panel.text(tr(key), {
    bold: true,
    muted: true,
    font: 'title',
    size: dc.env.sc.font * 0.9,
    name: 'Header',
  })
