import globalConfig from '../global.config'
import { tolgee } from '..'
import enableTrial from './plans/enableTrial'
import checkUserPreferences from './checks/checkUserPreferences'
import checkUserLicense from './checks/checkUserLicense'
import checkUserConsent from './checks/checkUserConsent'
import checkTrialStatus from './checks/checkTrialStatus'
import checkCredits from './checks/checkCredits'
import checkAnnouncementsStatus from './checks/checkAnnouncementsStatus'
import { selectLayers } from './audit/selectLayers'
import { runAudit } from './audit/runAudit'
import { listActiveTokenSets } from './audit/listActiveTokenSets'
import { createToken } from './audit/createToken'
import { cancelAudit } from './audit/cancelAudit'
import { applyTokens } from './audit/applyTokens'

const loadUI = async () => {
  // Setup UI
  penpot.ui.open(
    `Token Lint${globalConfig.env.isDev && ' /dev'}`,
    globalConfig.urls.uiUrl,
    {
      width: globalConfig.limits.width,
      height: globalConfig.limits.height,
    }
  )

  // Listen to messages from UI to Canvas
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  penpot.ui.onMessage(async (msg: any) => {
    const path = msg.pluginMessage

    const actions: { [key: string]: () => void } = {
      // ── Startup ──────────────────────────────────────────────────────
      LOAD_DATA: () => {
        const accessToken = penpot.localStorage.getItem('supabase_access_token')
        const refreshToken = penpot.localStorage.getItem(
          'supabase_refresh_token'
        )

        penpot.ui.sendMessage({
          type: 'CHECK_USER_AUTHENTICATION',
          data: {
            id: penpot.currentUser.id,
            fullName: penpot.currentUser.name,
            avatar: penpot.currentUser.avatarUrl,
            accessToken: accessToken ? accessToken : undefined,
            refreshToken: refreshToken ? refreshToken : undefined,
          },
        })
        penpot.ui.sendMessage({
          type: 'SET_THEME',
          data: {
            theme: penpot.theme === 'light' ? 'penpot-light' : 'penpot-dark',
          },
        })
        penpot.ui.sendMessage({
          type: 'CHECK_ANNOUNCEMENTS_VERSION',
        })
        penpot.ui.sendMessage({
          type: 'CHECK_EDITOR',
          data: {
            id: penpot.currentUser.id,
            editor: globalConfig.env.editor,
          },
        })

        checkUserConsent(path.data.userConsent)
          .then(() => checkTrialStatus())
          .then(() => checkCredits())
          .then(() => checkUserLicense())
          .then(() => checkUserPreferences())
      },

      // ── Announcements ─────────────────────────────────────────────────
      CHECK_ANNOUNCEMENTS_STATUS: () =>
        checkAnnouncementsStatus(path.data.version),

      // ── Preferences ───────────────────────────────────────────────────
      UPDATE_LANGUAGE: () => {
        penpot.localStorage.setItem('user_language', path.data.lang)
        tolgee.changeLanguage(path.data.lang)
      },

      // ── Storage ───────────────────────────────────────────────────────
      SET_ITEMS: () => {
        path.items.forEach((item: { key: string; value: unknown }) => {
          if (typeof item.value === 'object')
            penpot.localStorage.setItem(item.key, JSON.stringify(item.value))
          else if (
            typeof item.value === 'boolean' ||
            typeof item.value === 'number'
          )
            penpot.localStorage.setItem(item.key, item.value.toString())
          else penpot.localStorage.setItem(item.key, item.value as string)
        })
      },
      GET_ITEMS: async () =>
        path.items.map(async (item: string) => {
          const value = penpot.localStorage.getItem(item)
          if (value && typeof value === 'string')
            penpot.ui.sendMessage({
              type: `GET_ITEM_${item.toUpperCase()}`,
              data: { value: value },
            })
        }),
      DELETE_ITEMS: () =>
        path.items.forEach(async (item: string) => {
          penpot.localStorage.setItem(item, '')
        }),

      // ── Browser ───────────────────────────────────────────────────────
      OPEN_IN_BROWSER: () =>
        penpot.ui.sendMessage({
          type: 'OPEN_IN_BROWSER',
          data: {
            url: path.data.url,
            isNewTab: true,
          },
        }),
      POST_MESSAGE: () => {
        penpot.ui.sendMessage({
          type: 'POST_MESSAGE',
          data: {
            type: path.data.type,
            message: path.data.message,
          },
        })
      },

      // ── Plans ─────────────────────────────────────────────────────────
      ENABLE_TRIAL: async () => {
        enableTrial(path.data.trialTime, path.data.trialVersion).then(() =>
          checkTrialStatus()
        )
      },
      GET_TRIAL: async () =>
        penpot.ui.sendMessage({
          type: 'GET_TRIAL',
        }),
      GET_PRO: async () =>
        penpot.ui.sendMessage({
          type: 'GET_PRICING',
          data: {
            // Add the templates you need from the component Pricing.tsx
            plans: ['PLAN_A', 'PLAN_B', 'ACTIVATE'],
          },
        }),
      GET_LICENSE: async () =>
        penpot.ui.sendMessage({
          type: 'GET_LICENSE',
        }),
      GO_TO_PLAN_A: async () =>
        penpot.ui.sendMessage({
          type: 'OPEN_IN_BROWSER',
          data: {
            url: globalConfig.urls.storeUrl,
            isNewTab: true,
          },
        }),
      GO_TO_PLAN_B: async () =>
        penpot.ui.sendMessage({
          type: 'OPEN_IN_BROWSER',
          data: {
            url: globalConfig.urls.storeUrl,
            isNewTab: true,
          },
        }),
      ENABLE_PRO_PLAN: async () =>
        penpot.ui.sendMessage({
          type: 'ENABLE_PRO_PLAN',
        }),
      LEAVE_PRO_PLAN: async () => {
        penpot.ui.sendMessage({
          type: 'LEAVE_PRO_PLAN',
        })
        checkTrialStatus()
      },
      WELCOME_TO_PRO: async () =>
        penpot.ui.sendMessage({
          type: 'WELCOME_TO_PRO',
        }),

      // ── Audit ────────────────────────────────────────────────────────
      RUN_AUDIT: () => runAudit(path.data),
      CANCEL_AUDIT: () => cancelAudit(),
      SELECT_LAYERS_ON_CANVAS: () => selectLayers(path.data.shapeIds),
      APPLY_TOKEN: async () =>
        penpot.ui.sendMessage({
          type: 'TOKEN_APPLIED',
          data: await applyTokens(path.data),
        }),
      APPLY_TOKEN_GROUP: async () =>
        penpot.ui.sendMessage({
          type: 'TOKEN_APPLIED',
          data: await applyTokens(path.data),
        }),
      APPLY_ALL_EXACT_MATCHES: async () =>
        penpot.ui.sendMessage({
          type: 'TOKEN_APPLIED',
          data: await applyTokens(path.data),
        }),
      CREATE_TOKEN: async () =>
        penpot.ui.sendMessage({
          type: 'TOKEN_CREATED',
          data: await createToken(path.data),
        }),
      GET_ACTIVE_TOKEN_SETS: () =>
        penpot.ui.sendMessage({
          type: 'ACTIVE_TOKEN_SETS_LISTED',
          data: { sets: listActiveTokenSets() },
        }),

      // ── Canvas ───────────────────────────────────────────────────────
      GET_SELECTION: () => sendSelectionInfo(),

      // ── Auth ──────────────────────────────────────────────────────────
      SIGN_OUT: () =>
        penpot.ui.sendMessage({
          type: 'SIGN_OUT',
          data: {
            connectionStatus: 'UNCONNECTED',
            fullName: '',
            avatar: '',
            id: undefined,
          },
        }),

      DEFAULT: () => null,
    }

    try {
      return actions[path.type]?.()
    } catch {
      return actions['DEFAULT']?.()
    }
  })

  // ── Listeners ───────────────────────────────────────────────────────
  penpot.on('themechange', () => {
    penpot.ui.sendMessage({
      type: 'SET_THEME',
      data: {
        theme: penpot.theme === 'light' ? 'penpot-light' : 'penpot-dark',
      },
    })
  })

  penpot.on('selectionchange', () => sendSelectionInfo())
}

// ── Selection helper ──────────────────────────────────────────────────────
const sendSelectionInfo = () => {
  penpot.ui.sendMessage({
    type: 'SELECTION_CHANGED',
    data: { count: penpot.selection.length },
  })
}

export default loadUI
