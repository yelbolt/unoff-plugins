import { Board, Text } from '@penpot/plugin-types'
import { darkColor, propertyFontFamily } from './styles'

// ── Color helpers ─────────────────────────────────────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }
  return [h * 360, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number): number => {
    let tVal = t
    if (tVal < 0) tVal += 1
    if (tVal > 1) tVal -= 1
    if (tVal < 1 / 6) return p + (q - p) * 6 * tVal
    if (tVal < 1 / 2) return q
    if (tVal < 2 / 3) return p + (q - p) * (2 / 3 - tVal) * 6
    return p
  }

  let r: number, g: number, b: number

  if (s === 0) 
    r = g = b = l
   else {
    const hNorm = h / 360
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, hNorm + 1 / 3)
    g = hue2rgb(p, q, hNorm)
    b = hue2rgb(p, q, hNorm - 1 / 3)
  }

  const toHex = (c: number) =>
    Math.round(c * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// ── Shade scale ───────────────────────────────────────────────────────────────

const SHADES: Array<{ stop: number; lightness: number }> = [
  { stop: 50, lightness: 0.96 },
  { stop: 100, lightness: 0.91 },
  { stop: 200, lightness: 0.82 },
  { stop: 300, lightness: 0.73 },
  { stop: 400, lightness: 0.6 },
  { stop: 500, lightness: 0.49 },
  { stop: 600, lightness: 0.38 },
  { stop: 700, lightness: 0.29 },
  { stop: 800, lightness: 0.2 },
  { stop: 900, lightness: 0.12 },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default class ColorPalette {
  node: Board

  constructor({ baseColor }: { baseColor: string }) {
    this.node = this.makeNode(baseColor)
  }

  private makeNode(baseColor: string): Board {
    const [h, s] = hexToHsl(baseColor)

    const container = penpot.createBoard()
    container.name = `Palette — ${baseColor.toUpperCase()}`
    container.fills = [{ fillColor: '#FFFFFF', fillOpacity: 0.5 }]
    container.strokes = [
      {
        strokeColor: darkColor,
        strokeOpacity: 0.05,
        strokeAlignment: 'inner',
        strokeWidth: 1,
        strokeStyle: 'solid',
      },
    ]
    container.borderRadius = 12

    const flex = container.addFlexLayout()
    flex.dir = 'row'
    flex.verticalSizing = 'auto'
    flex.horizontalSizing = 'auto'
    flex.topPadding = 12
    flex.leftPadding = 12
    flex.bottomPadding = 12
    flex.rightPadding = 12
    flex.columnGap = 4

    SHADES.forEach(({ stop, lightness }) => {
      const hex = hslToHex(h, s, lightness)
      container.appendChild(this.makeChip(stop, hex))
    })

    return container
  }

  private makeChip(stop: number, hex: string): Board {
    const chip = penpot.createBoard() as Board
    chip.name = `_${stop}`
    chip.fills = []

    const flex = chip.addFlexLayout()
    flex.dir = 'column'
    flex.verticalSizing = 'auto'
    flex.horizontalSizing = 'auto'
    flex.alignItems = 'center'
    flex.rowGap = 6

    // Swatch
    const swatch = penpot.createBoard() as Board
    swatch.name = '_swatch'
    swatch.resize(56, 40)
    swatch.fills = [{ fillColor: hex }]
    swatch.strokes = [
      {
        strokeColor: darkColor,
        strokeOpacity: 0.05,
        strokeAlignment: 'inner',
        strokeWidth: 1,
        strokeStyle: 'solid',
      },
    ]
    swatch.borderRadius = 8
    chip.appendChild(swatch)

    // Stop label
    const stopLabel = penpot.createText(String(stop)) as Text
    stopLabel.name = '_stop'
    stopLabel.fontFamily = propertyFontFamily
    stopLabel.fontWeight = 'Medium'
    stopLabel.fontSize = '8'
    stopLabel.fills = [{ fillColor: darkColor, fillOpacity: 0.5 }]
    chip.appendChild(stopLabel)

    return chip
  }
}
