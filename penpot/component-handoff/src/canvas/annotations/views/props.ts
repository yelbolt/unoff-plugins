import { tr } from '../i18n'
import { card, fixedSize, heading, propCell } from './shared'
import { headerCell, linesCell } from './merged'
import type { Drive } from '../analysis'
import type { DocCtx, ViewBuild } from './shared'
import type { TableRow } from '../panel'

// What a set of drives amounts to, one line per part:
// `Button: height, padding` / `Icon: appears with this value`.
const linesOf = (dc: DocCtx, drives: Array<Drive>, suffix = ''): Array<string> => {
  const byPart = new Map<string, { props: Array<string>; presence: boolean }>()
  for (const d of drives) {
    const e = byPart.get(d.part) ?? { props: [], presence: false }
    if (d.presence) e.presence = true
    else if (!e.props.includes(d.prop)) e.props.push(d.prop)
    byPart.set(d.part, e)
  }
  const out: Array<string> = []
  for (const [part, e] of byPart) {
    if (e.props.length > 0) out.push(`${part}: ${e.props.join(', ')}${suffix}`)
    if (e.presence) out.push(tr('props.presence', { part }))
  }
  return out
}

// PROPS (family only): the component's API, read the other way round from the
// measurement and color tables. One row per variant property, with its values
// and what it drives; a property that drives nothing says so; values no single
// property explains are listed under Combined. Read from the same analysis as
// the machine contract.
export const buildProps = (dc: DocCtx): ViewBuild | null => {
  if (!dc.isFamily || dc.order.length === 0) return null
  const { panel, analysis } = dc
  const rows: Array<TableRow> = [
    [
      headerCell(dc, 'doc.propertyColumn'),
      headerCell(dc, 'doc.valuesColumn'),
      headerCell(dc, 'doc.drivesColumn'),
    ],
  ]
  for (const o of dc.order) {
    const lines = linesOf(
      dc,
      analysis.drives.filter((d) => d.by.length === 1 && d.by[0] === o.name)
    )
    rows.push([
      propCell(dc, o.name),
      panel.text(o.values.join(' · '), { name: 'Values' }),
      linesCell(dc, lines.length > 0 ? lines : [tr('props.drivesNothing')], {
        muted: lines.length === 0,
        name: 'Drives',
      }),
    ])
  }
  const combined = analysis.drives.filter((d) => d.by.length > 1)
  if (combined.length > 0) {
    const involved: Array<string> = []
    for (const d of combined)
      for (const n of d.by) if (!involved.includes(n)) involved.push(n)
    rows.push([
      propCell(dc, tr('props.combined')),
      panel.text(involved.join(' · '), { name: 'Values' }),
      linesCell(
        dc,
        // Each line also names the group that explains the value.
        [
          ...new Set(
            combined.flatMap((d) =>
              linesOf(dc, [d], ` (${d.by.join(' × ')})`)
            )
          ),
        ],
        { name: 'Drives' }
      ),
    ])
  }
  const size = fixedSize(dc, 6)
  return {
    title: heading(dc, tr('view.PROPS')),
    cards: [
      card(
        dc,
        [panel.table(rows, { width: size.inner, name: 'Props' })],
        tr('view.PROPS'),
        size
      ),
    ],
  }
}
