import { tr } from '../i18n'
import { LAYOUT } from '../constants'
import { card, centered, heading, propCell, px, sizeOf, variantNeed } from './shared'
import { headerCell } from './merged'
import type { DocCtx, ViewBuild } from './shared'
import type { PanelNode, TableRow } from '../panel'

// VARIANTS (family only): one card per variant, packed in a wrapping grid.
// The instance on top, a Property | Value table of its own values below.
// No default, no comparison.
export const buildVariants = (dc: DocCtx): ViewBuild | null => {
  const { panel, env } = dc
  if (!dc.isFamily || dc.entries.length === 0) return null
  const sc = env.sc

  const cards: Array<PanelNode> = dc.entries.map((e) => {
    const inst = dc.track((e.comp as NonNullable<typeof e.comp>).instance())
    const specimen = panel.box(
      [{ shape: inst, w: inst.width, h: inst.height }],
      {
        dir: 'row',
        gap: 0,
        pad: px(dc, LAYOUT.breath),
        alignItems: 'center',
        name: 'Instance',
      }
    )
    const rows: Array<TableRow> = [
      [headerCell(dc, 'doc.propertyColumn'), headerCell(dc, 'doc.valueColumn')],
      ...Object.entries(e.props).map(([k, v]): TableRow => [
        propCell(dc, k),
        panel.text(v, { name: 'Value' }),
      ]),
    ]
    const preferred = variantNeed(sc, inst.width, e.props) > dc.colW ? 2 : 1
    const size = sizeOf(dc, preferred, Math.max(specimen.w, panel.tableNeed(rows)))
    const table = panel.table(rows, { width: size.inner, name: 'Variant values' })
    return card(dc, [centered(dc, specimen), table], e.label, size)
  })

  return { title: heading(dc, tr('view.VARIANTS')), cards }
}
