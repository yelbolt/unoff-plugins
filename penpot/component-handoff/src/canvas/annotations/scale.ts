import type { AnnotationStyle } from '../../app/types/annotations'

// Every size drawn on canvas goes through this object. DESIGN: k = 1.
// VIEWPORT: k = 1 / zoom, so sizes read the same on screen at draw-time zoom.
export interface Scale {
  k: number
  font: number
  stroke: number
  tick: number
  gap: number
  offset: number
  pad: number
  pin: number // pin diameter
  charW: number
}

export const makeScale = (style: AnnotationStyle): Scale => {
  const zoom = penpot.viewport.zoom
  const k = style.scaleMode === 'VIEWPORT' && zoom > 0 ? 1 / zoom : 1
  const font = Math.max(1, style.textSize) * k
  return {
    k,
    font,
    stroke: 1 * k,
    tick: 4 * k,
    gap: 4 * k,
    offset: 16 * k,
    pad: 4 * k,
    pin: Math.max(16, style.textSize * 1.8) * k,
    charW: font * 0.58,
  }
}
