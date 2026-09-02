// Stub distance functions for NEAR-tier residuals/tie-breaks in matchValue.ts.
// TODO: replace `colorDistance` with a real perceptual formula (e.g. CIEDE2000)
// and `numericDistance` with "nearest step on the scale" once we have one.

/** Placeholder — NOT perceptual. 0 for identical hex/color strings, 1 otherwise. */
export const colorDistance = (a: string, b: string): number =>
  a.toLowerCase() === b.toLowerCase() ? 0 : 1

/** Placeholder — naive absolute difference, not "nearest step on the scale". */
export const numericDistance = (a: number, b: number): number => Math.abs(a - b)
