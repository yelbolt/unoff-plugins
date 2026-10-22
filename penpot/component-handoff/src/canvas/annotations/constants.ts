// Plugin-data keys carried by documentation groups and layers. They are the
// stable identity that lets re-runs update in place and feeds outdated
// detection.
export const KEYS = {
  kind: 'ch:kind', // 'DOCUMENTATION'
  targets: 'ch:targets', // JSON array of target shape ids (documented root)
  options: 'ch:options', // JSON { target, views, depth, grouping, variantFilter } (grouping absent = MERGED, variantFilter absent = null)
  fingerprint: 'ch:fingerprint', // hash of the documented target at generation
  generatedAt: 'ch:generatedAt', // epoch ms, as a string
  name: 'ch:name', // component or family name, for the status list
  layer: 'ch:layer', // on a layer group: the board id, or PAGE_KEY
  style: 'ch:style', // on the file: JSON AnnotationStyle
} as const

export const PAGE_KEY = 'page'

export const MARKER_NAME = 'Marker'

// Spacing scale: an 8-point rhythm, every padding, gap and margin of the
// documentation is one of these values (design px, multiplied by `sc.k`).
export const SPACING = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
  48: 48,
  64: 64,
} as const

// Brand style of the documentation's own surfaces and text.
export const FONT_TITLE = 'Martian Mono'
export const FONT_BODY = 'Lexend'

export const BRAND = {
  dark: '#00212B', // rgb(0, 0.129, 0.168)
  board: '#FFFFFF',
  surfaceOpacity: 0.04, // cards: the brand dark at 4%
  chipOpacity: 0.08, // chips: the brand dark at 8%
  mutedOpacity: 0.6, // secondary text
} as const

// Radii, from the 4-px scale.
export const RADIUS = {
  board: 32, // documentation board and cards
  box: 16, // inner sub-boxes (exploded parts)
  swatch: 4, // swatches
} as const

// Layout constants of the documentation board, in design px. Multiplied by
// `sc.k` so they stay proportional in VIEWPORT scale mode.
export const LAYOUT = {
  gridColumns: 6, // columns of the documentation grid
  gridColumn: 200, // minimum width of one grid column
  gridColumnMax: 320, // a column is never widened beyond this
  docPad: SPACING[48], // padding of the documentation board
  sectionGap: SPACING[48], // between the header and the views
  titleGap: SPACING[16], // between a view title and its rows
  cardPad: SPACING[32], // padding inside a card
  cardGap: SPACING[16], // grid column gap and row gap
  blockGap: SPACING[24], // between the blocks of a card
  rowGap: SPACING[24], // between the rows of the exploded parts
  tableRowGap: SPACING[8], // between table rows
  cellGap: SPACING[16], // between table columns
  breath: SPACING[24], // room around a variant instance
  stageMarginX: 160, // room around the copy for markers and redlines
  stageMarginY: 72,
  stageMarginYTall: SPACING[64] + SPACING[32], // Layout: glyphs + labels below
} as const
