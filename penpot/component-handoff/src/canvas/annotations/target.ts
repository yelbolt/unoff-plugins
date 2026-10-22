import type {
  LibraryComponent,
  LibraryVariantComponent,
  Shape,
  VariantContainer,
  Variants,
} from '@penpot/plugin-types'
import type {
  ComponentKind,
  DocTarget,
  RefusalReason,
  VariantProperty,
} from '../../app/types/annotations'

// Component/variant plumbing. Every Penpot call that can throw on a shape
// outside the current file (external library, other page) goes through safe().
export const safe = <T>(fn: () => T): T | null => {
  try {
    return fn()
  } catch {
    return null
  }
}

export const isContainer = (s: Shape | null): s is VariantContainer =>
  Boolean(s) && s?.type === 'board' && safe(() => s.isVariantContainer()) === true

export const variantComponentsOf = (
  variants: Variants
): Array<LibraryVariantComponent> =>
  (safe(() => variants.variantComponents()) ?? []).filter(
    (c): c is LibraryVariantComponent => c.isVariant()
  )

export const variantPropertiesOf = (
  variants: Variants
): Array<VariantProperty> =>
  (safe(() => variants.properties) ?? []).map((name) => ({
    name,
    values: safe(() => variants.currentValues(name)) ?? [],
  }))

// "Size=M, State=Hover": the variant's own property values, nothing else.
export const variantLabel = (comp: LibraryVariantComponent): string =>
  Object.entries(comp.variantProps ?? {})
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')

// The variants in the family's own order: the order of the container's
// children when it can be read, else the order variantComponents() returns.
export const orderedVariantsOf = (
  variants: Variants,
  container: VariantContainer | null
): Array<LibraryVariantComponent> => {
  const comps = variantComponentsOf(variants)
  const children = container ? (safe(() => container.children) ?? []) : []
  if (children.length === 0) return comps
  const rank = (c: LibraryVariantComponent): number => {
    const id = safe(() => c.mainInstance().id)
    const i = id ? children.findIndex((k) => k.id === id) : -1
    return i === -1 ? Number.MAX_SAFE_INTEGER : i
  }
  return comps
    .map((c, i) => ({ c, i, r: rank(c) }))
    .sort((x, y) => x.r - y.r || x.i - y.i)
    .map((e) => e.c)
}

export interface Classified {
  kind: ComponentKind
  comp: LibraryComponent | null
  main: Shape | null // the main component shape (itself for MAIN / VARIANT)
  container: VariantContainer | null
  variants: Variants | null
}

export const classify = (s: Shape): Classified => {
  if (isContainer(s))
    return {
      kind: 'FAMILY',
      comp: null,
      main: null,
      container: s,
      variants: safe(() => s.variants),
    }
  const head = safe(() => s.isComponentHead() || s.isComponentRoot()) === true
  const comp = head ? safe(() => s.component()) : null
  if (!comp)
    return {
      kind: s.type === 'board' ? 'BOARD' : 'OTHER',
      comp: null,
      main: null,
      container: null,
      variants: null,
    }
  const copy = safe(() => s.isComponentCopyInstance()) === true
  const main = copy ? safe(() => comp.mainInstance()) : s
  const isVariant = safe(() => comp.isVariant()) === true
  const parent = main?.parent ?? null
  const container = isVariant && isContainer(parent) ? parent : null
  const variants = isVariant
    ? (safe(() => (comp as LibraryVariantComponent).variants) ??
      container?.variants ??
      null)
    : null
  return {
    kind: copy ? 'COPY' : isVariant ? 'VARIANT' : 'MAIN',
    comp,
    main,
    container,
    variants,
  }
}

export interface Resolved {
  kind: ComponentKind
  target: DocTarget
  root: Shape // identity: container for FAMILY, main otherwise
  source: Shape // shape whose anatomy is documented
  comp: LibraryComponent | null // anatomy is comp.instance() when set
  container: VariantContainer | null
  variants: Variants | null
  shown: LibraryVariantComponent | null // family documented through its first variant
  copyFallback: boolean // COPY whose main is not on this page
}

const onCurrentPage = (s: Shape | null): s is Shape =>
  s !== null && Boolean(safe(() => penpot.currentPage?.getShapeById(s.id)))

export const resolveTarget = (
  sel: Shape,
  target: DocTarget
): Resolved | RefusalReason => {
  const c = classify(sel)
  const base = {
    kind: c.kind,
    target,
    container: c.container,
    variants: c.variants,
    shown: null,
    copyFallback: false,
  }

  const viaFirst = (
    variants: Variants,
    container: VariantContainer | null,
    root: Shape | null
  ): Resolved | null => {
    const first = orderedVariantsOf(variants, container)[0]
    const main = first ? safe(() => first.mainInstance()) : null
    if (!first || !main) return null
    return {
      ...base,
      root: root ?? main,
      source: main,
      comp: first,
      variants,
      shown: first,
    }
  }

  if (target === 'FAMILY') {
    if (!c.variants || !c.container || !onCurrentPage(c.container))
      return 'NOT_A_FAMILY'
    return viaFirst(c.variants, c.container, c.container) ?? 'NOT_A_FAMILY'
  }

  if (c.kind === 'FAMILY' && c.variants) {
    // A container has no single anatomy: document its first variant alone.
    const r = viaFirst(c.variants, c.container, null)
    if (r) return { ...r, kind: 'VARIANT' }
  }
  if (c.kind === 'COPY') {
    if (onCurrentPage(c.main))
      return { ...base, root: c.main, source: c.main, comp: c.comp }
    return { ...base, root: sel, source: sel, comp: c.comp, copyFallback: true }
  }
  return { ...base, root: sel, source: sel, comp: c.comp }
}
