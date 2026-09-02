import globalConfig from '../../global.config'
import { tolgee } from '../..'

// Reads stored user preferences (language, suggested-language flag), fills
// missing values with defaults, syncs Tolgee, and sends them to the UI.
// This is the last step in the LOAD_DATA chain — sets isLoaded: true in the UI.
const checkUserPreferences = async () => {
  // Example preferences: user_language
  let userLanguage = penpot.localStorage.getItem('user_language')
  let isSuggestedLanguageDisplayed = penpot.localStorage.getItem(
    'is_suggested_language_displayed'
  )

  // Fill if preferences are missing
  if (!isSuggestedLanguageDisplayed) {
    penpot.localStorage.setItem('is_suggested_language_displayed', 'true')
    isSuggestedLanguageDisplayed = 'true'
  }

  if (!userLanguage) {
    penpot.localStorage.setItem('user_language', globalConfig.lang)
    userLanguage = globalConfig.lang
  }

  // Update current language with Tolgee
  tolgee.changeLanguage(userLanguage)

  return penpot.ui.sendMessage({
    type: 'CHECK_USER_PREFERENCES',
    data: {
      userLanguage: userLanguage,
      isSuggestedLanguageDisplayed: isSuggestedLanguageDisplayed,
    },
  })
}

export default checkUserPreferences
