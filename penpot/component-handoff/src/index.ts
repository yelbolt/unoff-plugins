import { createI18n } from './utils/i18n'
import globalConfig from './global.config'
import loadUI from './bridges/loadUI'
import fr_FR from './app/content/translations/fr-FR.json'
import en_US from './app/content/translations/en-US.json'

export const tolgee: ReturnType<typeof createI18n> = createI18n(
  {
    'fr-FR': fr_FR,
    'en-US': en_US,
  },
  globalConfig.lang
)

// UI
loadUI()
