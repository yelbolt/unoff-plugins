export const KEYS = {
  kind: 'ch:kind',
  targets: 'ch:targets',
  options: 'ch:options', // grouping absent = MERGED, variantFilter absent = null
  fingerprint: 'ch:fingerprint',
  generatedAt: 'ch:generatedAt',
  name: 'ch:name',
  layer: 'ch:layer',
  style: 'ch:style',
  contractSettings: 'ch:contractSettings',
} as const

export const PAGE_KEY = 'page'

export const MARKER_NAME = 'Marker'

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

export const FONT_TITLE = 'Martian Mono'
export const FONT_BODY = 'Lexend'

export const BRAND = {
  dark: '#00212B',
  board: '#FFFFFF',
  surfaceOpacity: 0.04,
  chipOpacity: 0.08,
  mutedOpacity: 0.6,
} as const

export const RADIUS = {
  board: 32,
  box: 16,
  swatch: 4,
} as const

export const LAYOUT = {
  gridColumns: 6,
  gridColumn: 200,
  gridColumnMax: 320,
  docPad: SPACING[48],
  sectionGap: SPACING[48],
  titleGap: SPACING[16],
  cardPad: SPACING[32],
  cardGap: SPACING[16],
  blockGap: SPACING[24],
  rowGap: SPACING[24],
  tableRowGap: SPACING[8],
  cellGap: SPACING[16],
  breath: SPACING[24],
  stageMarginX: 160,
  stageMarginY: 72,
  stageMarginYTall: SPACING[64] + SPACING[32],
} as const
