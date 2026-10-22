import { tr } from '../i18n'
import { BRAND, LAYOUT, RADIUS, SPACING } from '../constants'
import { px, spanW } from './shared'
import { docName } from './name'
import type { DocCtx } from './shared'
import type { PanelNode } from '../panel'

// Header: the title on the left, the metadata (kind and library path,
// generation date, variant filter) aligned on the right. A full-width card
// holding a space-between row of fill width.
export const buildHeader = (dc: DocCtx): PanelNode => {
  const { panel, res, isFamily } = dc
  const kind = tr(`doc.kind.${isFamily ? 'FAMILY' : res.kind}`)
  const date = new Date().toISOString().slice(0, 10)
  const meta = (str: string, name: string) =>
    panel.text(str, {
      font: 'title',
      muted: true,
      size: px(dc, 12),
      name,
    })
  const lines: Array<PanelNode> = [
    meta(`${kind}  ·  ${res.comp?.path || tr('doc.noPath')}`, 'Subtitle'),
    meta(tr('doc.generatedOn', { date }), 'Date'),
  ]
  if (dc.filterNote) lines.push(meta(dc.filterNote, 'Variant filter'))
  if (res.copyFallback) lines.push(meta(tr('doc.copyFallback'), 'Fallback'))

  const title = panel.text(docName(res, isFamily), {
    bold: true,
    font: 'title',
    size: px(dc, 32),
    name: 'Title',
  })
  const metadata = panel.box(lines, {
    dir: 'column',
    gap: px(dc, SPACING[4]),
    alignItems: 'end',
    name: 'Metadata',
  })
  const row = panel.fillWidth(
    panel.box([title, metadata], {
      dir: 'row',
      gap: px(dc, LAYOUT.cellGap),
      alignItems: 'start',
      justify: 'space-between',
      name: 'Header row',
    }),
    spanW(dc, LAYOUT.gridColumns) - px(dc, LAYOUT.cardPad) * 2
  )
  return panel.box([row], {
    dir: 'column',
    gap: 0,
    pad: px(dc, LAYOUT.cardPad),
    fixedWidth: spanW(dc, LAYOUT.gridColumns),
    fill: BRAND.dark,
    fillOpacity: BRAND.surfaceOpacity,
    radius: px(dc, RADIUS.board),
    name: 'Header',
  })
}
