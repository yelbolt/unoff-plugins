import type { Resolved } from '../target'

export const docName = (res: Resolved, isFamily: boolean): string =>
  isFamily
    ? (res.container?.name ?? res.root.name)
    : (res.comp?.name ?? res.root.name)
