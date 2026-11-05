/** Placeholder, not perceptual: 0 if identical, 1 otherwise. */
export const colorDistance = (a: string, b: string): number =>
  a.toLowerCase() === b.toLowerCase() ? 0 : 1

/** Placeholder: naive absolute difference. */
export const numericDistance = (a: number, b: number): number => Math.abs(a - b)
