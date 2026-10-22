// Pure logic, no Penpot call: which variant property explains a value that
// varies across the variants of a family. Kept free of the platform so it can
// be unit-tested on its own.

export interface PropertyOrder {
  name: string
  values: Array<string> // the family's own value order
}

export interface Sample<T> {
  label: string // "Size=M, State=Hover"
  props: Record<string, string> // the variant's own property values
  key: string // identity of the value: equal keys mean equal values
  data: T // what is displayed for this value
}

export type Resolution<T> =
  | { kind: 'uniform'; data: T }
  | {
      kind: 'driven'
      property: string
      items: Array<{ value: string; data: T }> // in property-value order
    }
  | { kind: 'variants'; items: Array<{ label: string; data: T }> }

export type Presence =
  | { kind: 'all' }
  | { kind: 'driven'; property: string; values: Array<string> }
  | { kind: 'variants'; labels: Array<string> }

// Property names to try: the family's order first, then any other name found
// on the samples.
const namesOf = (
  samples: Array<{ props: Record<string, string> }>,
  order: Array<PropertyOrder>
): Array<string> => {
  const names = order.map((o) => o.name)
  for (const s of samples)
    for (const k of Object.keys(s.props)) if (!names.includes(k)) names.push(k)
  return names
}

// The single property that functionally determines the value: for each of its
// values, every sample sharing it has the same key. Among several, the one
// with the fewest distinct values wins; a tie goes to the earlier property in
// the family's order. Null when none qualifies (or there is nothing to
// explain).
export const findDriver = (
  samples: Array<{ props: Record<string, string>; key: string }>,
  order: Array<PropertyOrder>
): string | null => {
  if (samples.length < 2) return null
  let best: { name: string; size: number } | null = null
  for (const name of namesOf(samples, order)) {
    const seen = new Map<string, string>()
    let ok = true
    for (const s of samples) {
      const v = s.props[name]
      if (v === undefined) {
        ok = false
        break
      }
      const prev = seen.get(v)
      if (prev === undefined) seen.set(v, s.key)
      else if (prev !== s.key) {
        ok = false
        break
      }
    }
    if (ok && (!best || seen.size < best.size))
      best = { name, size: seen.size }
  }
  return best?.name ?? null
}

// Property values sorted by the family's own order (unknown values last, in
// encounter order).
const sortValues = (
  values: Array<string>,
  name: string,
  order: Array<PropertyOrder>
): Array<string> => {
  const known = order.find((o) => o.name === name)?.values ?? []
  const rank = (v: string): number => {
    const i = known.indexOf(v)
    return i === -1 ? Number.MAX_SAFE_INTEGER : i
  }
  return values
    .map((v, i) => ({ v, i }))
    .sort((a, b) => rank(a.v) - rank(b.v) || a.i - b.i)
    .map((e) => e.v)
}

export const resolveValue = <T>(
  samples: Array<Sample<T>>,
  order: Array<PropertyOrder>
): Resolution<T> => {
  const first = samples[0]
  if (samples.every((s) => s.key === first.key))
    return { kind: 'uniform', data: first.data }
  const property = findDriver(samples, order)
  if (property) {
    const byValue = new Map<string, T>()
    for (const s of samples)
      if (!byValue.has(s.props[property])) byValue.set(s.props[property], s.data)
    return {
      kind: 'driven',
      property,
      items: sortValues([...byValue.keys()], property, order).map((value) => ({
        value,
        data: byValue.get(value) as T,
      })),
    }
  }
  return {
    kind: 'variants',
    items: samples.map((s) => ({ label: s.label, data: s.data })),
  }
}

// Where a part appears: everywhere, else the values of the property that
// explains its presence, else the variants one by one.
export const resolvePresence = (
  all: Array<{ label: string; props: Record<string, string>; present: boolean }>,
  order: Array<PropertyOrder>
): Presence => {
  if (all.every((s) => s.present)) return { kind: 'all' }
  const property = findDriver(
    all.map((s) => ({ props: s.props, key: s.present ? '1' : '0' })),
    order
  )
  if (property) {
    const values = new Set<string>()
    for (const s of all) if (s.present) values.add(s.props[property])
    return {
      kind: 'driven',
      property,
      values: sortValues([...values], property, order),
    }
  }
  return {
    kind: 'variants',
    labels: all.filter((s) => s.present).map((s) => s.label),
  }
}

export const presenceLines = (p: Presence, allLabel: string): Array<string> =>
  p.kind === 'all'
    ? [allLabel]
    : p.kind === 'driven'
      ? [`${p.property}=${p.values.join(' · ')}`]
      : p.labels

// `Size: sm 32 · md 40 · lg 48`
export const drivenText = (
  property: string,
  items: Array<{ value: string; text: string }>
): string => `${property}: ${items.map((i) => `${i.value} ${i.text}`).join(' · ')}`

// `Variant=a, Size=b: 40`
export const variantText = (label: string, text: string): string =>
  `${label}: ${text}`
