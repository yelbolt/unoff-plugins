import { tolgee } from '../..'

// Canvas strings live under the top-level "canvas" object of the translation
// files (createI18n — never Tolgee React).
export const tr = (key: string, params?: Record<string, unknown>): string =>
  tolgee.t(`canvas.${key}`, params)
