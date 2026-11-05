import { DOC_VIEWS } from '../../app/types/annotations'
import { buildVariants } from './views/variants'
import { colWFor, px, variantNeed } from './views/shared'
import { buildProps } from './views/props'
import { docName } from './views/name'
import { buildMeasurements, measurementNeed } from './views/measurements'
import { buildHeader } from './views/header'
import { buildColors, colorsNeed } from './views/colors'
import { buildAnatomy } from './views/anatomy'
import { safe, variantPropertiesOf } from './target'
import { makeRefCtx } from './refs'
import { bindParts } from './parts'
import { Panel } from './panel'
import { buildMerged } from './merged'
import { readPhase } from './memo'
import { tr } from './i18n'
import { computeGroups, countMatching } from './groups'
import {
  boundsRect,
  intersects,
  isRotated,
  rectBottom,
  rectRight,
} from './geometry'
import { fingerprintOf } from './fingerprint'
import { BRAND, LAYOUT, RADIUS } from './constants'
import { analysisFor } from './analysis'
import type { Board, Shape } from '@penpot/plugin-types'
import type { GenerateDocumentationData } from '../../app/types/annotations'
import type { ViewBuild } from './views/shared'
import type { DocCtx } from './views/shared'
import type { Resolved } from './target'
import type { PanelNode } from './panel'
import type { Pen } from './draw'
import type { DrawEnv, DrawResult } from './commit'

export const drawDocumentation = (
  env: DrawEnv,
  res: Resolved,
  data: GenerateDocumentationData
): DrawResult => {
  const { sc, style, placer, lk, existing } = env
  const { views, depth } = data
  const on = (v: (typeof views)[number]) => views.includes(v)
  const created: Array<Shape> = []
  let rootBoard: Shape | null = null
  let panel: Panel | null = null
  const pens: Array<Pen> = []

  try {
    const isFamily = res.target === 'FAMILY' && res.variants !== null
    // Reads the documented root only: grouping never changes it.
    const fingerprint = fingerprintOf(res.root)

    const refs = makeRefCtx()
    const filter = isFamily ? (data.variantFilter ?? null) : null
    const fullOrder = res.variants ? variantPropertiesOf(res.variants) : []
    const analysis = analysisFor(res, isFamily, filter, 'ANY_VARIANTS')
    const { entries, order } = analysis
    const total = isFamily ? countMatching(res, null) : 0
    const restricted = fullOrder.flatMap((o, i) =>
      filter?.[o.name] && order[i].values.length < o.values.length
        ? [`${o.name}=${order[i].values.join(', ')}`]
        : []
    )
    const filterNote =
      isFamily && filter && entries.length < total
        ? [
            restricted.length > 0
              ? tr('doc.variantFilter', { filter: restricted.join(' · ') })
              : '',
            tr('doc.variantsOfTotal', { count: entries.length, total }),
          ]
            .filter(Boolean)
            .join('  ·  ')
        : null
    // A component is always laid out merged (single variant).
    const merged =
      !isFamily || data.grouping === 'MERGED'
        ? entries.length > 0
          ? depth === 'ALL'
            ? analysis.model
            : readPhase(() => buildMerged(entries, depth))
          : null
        : null
    const structures =
      !merged && (on('ANATOMY') || on('MEASUREMENTS') || on('COLORS'))
        ? readPhase(() =>
            computeGroups(entries, depth, style, refs, {
              measure: on('MEASUREMENTS'),
              color: on('COLORS'),
            })
          )
        : []

    const gridGap = sc.k * LAYOUT.cardGap
    const colW = Math.min(
      LAYOUT.gridColumnMax * sc.k,
      Math.max(
        LAYOUT.gridColumn * sc.k,
        ...(isFamily && on('VARIANTS')
          ? entries.map((e) => variantNeed(sc, e.main.width, e.props))
          : [0])
      )
    )

    const dc: DocCtx = {
      env,
      res,
      panel: (panel = new Panel(style, sc)),
      refs,
      depth,
      isFamily,
      colW,
      entries,
      structures,
      merged,
      order,
      analysis,
      filterNote,
      state: { rotated: false, markers: 0 },
      pens,
      track: (s) => {
        created.push(s)
        return s
      },
      copyOf: (e) => (e.comp ? e.comp.instance() : e.main.clone()),
    }
    // Dry runs (shapes dropped): widen the column so a measurement table fits span 3 and a color table span 2.
    const raise = (span: number, need: number) => {
      if (need > 0)
        dc.colW = Math.min(
          LAYOUT.gridColumnMax * sc.k,
          Math.max(dc.colW, colWFor(sc, span, need))
        )
    }
    if (on('MEASUREMENTS')) raise(3, measurementNeed(dc))
    if (on('COLORS')) raise(2, colorsNeed(dc))

    // Every copy is tracked so a failed draw removes it.
    const copyOf = dc.copyOf
    dc.copyOf = (e) => dc.track(copyOf(e))
    dc.state.rotated = merged
      ? merged.parts.some((p) =>
          [...p.shapes.values()].some((s) => isRotated(s.shape))
        )
      : structures.some((s) =>
          bindParts(s.plan, s.entries[0].main).some((p) => isRotated(p.shape))
        )

    const cols = LAYOUT.gridColumns
    const sections: Array<PanelNode> = [buildHeader(dc)]
    const section = (b: ViewBuild | null) => {
      if (!b) return
      const units: Array<Array<PanelNode>> = []
      for (const c of b.cards)
        if (c.join && units.length > 0) units[units.length - 1].push(c)
        else units.push([c])
      const spanOf = (u: Array<PanelNode>) =>
        u.reduce((n, c) => n + Math.min(c.span ?? cols, cols), 0)
      const rows: Array<PanelNode> = []
      let line: Array<PanelNode> = []
      let left = cols
      const close = () => {
        if (line.length === 0) return
        const row = dc.panel.box(line, {
          dir: 'row',
          gap: gridGap,
          alignItems: 'start',
          name: 'Row',
        })
        // Cards of a row take the tallest card's height, where supported.
        safe(() => {
          const flex = (row.shape as Board).flex
          if (flex) flex.alignItems = 'stretch'
        })
        rows.push(row)
        line = []
        left = cols
      }
      // Strict reading order, no backfill.
      for (const u of units) {
        const w = spanOf(u)
        if (line.length > 0 && (u[0].breakBefore || w > left)) close()
        line.push(...u)
        left -= w
        if (left <= 0) close()
      }
      close()
      sections.push(
        dc.panel.box([...(b.title ? [b.title] : []), ...rows], {
          dir: 'column',
          gap: px(dc, LAYOUT.titleGap),
          alignItems: 'start',
          name: 'View',
        })
      )
    }
    for (const view of DOC_VIEWS) {
      if (!on(view)) continue
      if (view === 'VARIANTS' && isFamily) section(buildVariants(dc))
      else if (view === 'PROPS' && isFamily) section(buildProps(dc))
      else if (view === 'ANATOMY') section(buildAnatomy(dc))
      else if (view === 'MEASUREMENTS') section(buildMeasurements(dc))
      else if (view === 'COLORS') section(buildColors(dc))
    }

    // Fit / fit: neither axis is ever fixed.
    const root = dc.panel.box(sections, {
      dir: 'column',
      gap: px(dc, LAYOUT.sectionGap),
      pad: px(dc, LAYOUT.docPad),
      alignItems: 'start',
      fill: BRAND.board,
      radius: px(dc, RADIUS.board),
      name: 'Documentation',
    })
    const rootShape = root.shape
    rootBoard = rootShape

    // Update in place keeps the designer's position; otherwise right of the target, below existing documentations.
    const spot = { x: 0, y: 0, w: root.w, h: root.h }
    if (existing) {
      const at = boundsRect(existing)
      spot.x = at.x
      spot.y = at.y
    } else {
      const anchor = boundsRect(lk.board ?? res.root)
      spot.x = rectRight(anchor) + sc.offset * 5
      spot.y = anchor.y
      for (let i = 0; i < 50; i++) {
        const hit = placer.obstacles.find((o) => intersects(spot, o, sc.gap))
        if (!hit) break
        spot.y = rectBottom(hit) + sc.gap * 4
      }
    }
    rootShape.x = spot.x
    rootShape.y = spot.y

    const group = penpot.group([root.shape])
    if (!group) throw new Error('Could not group the documentation')

    // Nothing created and never attached may stay at page root.
    const pageRootId = safe(() => penpot.currentPage?.root.id)
    const stray = (s: Shape): boolean =>
      safe(() => !s.parent || s.parent.id === pageRootId) === true
    const all: Array<Shape> = [
      ...created,
      ...dc.panel.created,
      ...pens.flatMap((p) => p.shapes),
    ]
    all.filter(stray).forEach((s) => safe(() => s.remove()))

    return {
      rotated: dc.state.rotated,
      group,
      name: docName(res, isFamily),
      fingerprint,
      options: {
        target: data.target,
        views,
        depth,
        grouping: data.grouping,
        variantFilter: filter,
      },
      parts: Math.max(
        0,
        (merged ? merged.parts.length : (structures[0]?.plan.length ?? 1)) - 1
      ),
      variants: isFamily && on('VARIANTS') ? entries.length : undefined,
    }
  } catch (error) {
    created.forEach((s) => safe(() => s.remove()))
    panel?.created.forEach((s) => safe(() => s.remove()))
    pens.forEach((p) => p.shapes.forEach((s) => safe(() => s.remove())))
    if (rootBoard) safe(() => rootBoard?.remove())
    throw error
  }
}
