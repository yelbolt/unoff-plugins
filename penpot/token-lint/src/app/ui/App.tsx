import { Component, createPortal } from 'preact/compat'
import { FeatureStatus } from '@unoff/utils'
import {
  Button,
  Consent,
  ConsentConfiguration,
  Icon,
  layouts,
  SemanticMessage,
} from '@unoff/ui'
import './stylesheets/app.css'
import { sendPluginMessage } from '../utils/pluginMessage'
import { UserSession } from '../types/user'
import { Language } from '../types/translations'
import { NotificationMessage, PluginMessageData } from '../types/messages'
import {
  BaseProps,
  Editor,
  AnnouncementsDigest,
  PlanStatus,
  ModalContext,
  Service,
} from '../types/app'
import { $isSuggestedLanguageDisplayed } from '../stores/preferences'
import { $creditsCount } from '../stores/credits'
import {
  $userConsent,
  getUserConsent,
  updateUserConsent,
  updateUserConsentWithData,
} from '../stores/consent'
import {
  applyTokenApplied,
  applyTokenCreated,
  cancelAudit,
  completeAudit,
  setActiveTokenSets,
  setAuditError,
  startAudit,
  updateAuditProgress,
  $auditStatus,
  $lastLayerSelection,
  $selectionCount,
} from '../stores/audit'
import { getTolgee } from '../external/translation'
import {
  trackEditorEvent,
  trackLanguageEvent,
  trackPurchaseEvent,
  trackTrialEnablementEvent,
  trackUserConsentEvent,
} from '../external/tracking/eventsTracker'
import { setEditor } from '../external/tracking/client'
import validateUserLicenseKey from '../external/license/validateUserLicenseKey '
import checkAnnouncementsVersion from '../external/cms/checkAnnouncementsVersion'
import checkConnectionStatus from '../external/auth/checkConnectionStatus'
import { getSupabase } from '../external/auth'
import { ConfigContextType } from '../config/ConfigContext'
import AuditService from './services/AuditService'
import Shortcuts from './modules/Shortcuts'
import Modal from './contexts/Modal'
import {
  WithTranslation,
  WithTranslationProps,
} from './components/WithTranslation'
import { WithConfig, WithConfigProps } from './components/WithConfig'
import Feature from './components/Feature'

type AppProps = WithConfigProps & WithTranslationProps

export interface AppState extends BaseProps {
  modalContext: ModalContext
  mustUserConsent: boolean
  announcements: AnnouncementsDigest
  notification: NotificationMessage
  suggestedLanguage: Language | null
  isSuggestedLanguageDisplayed: boolean
  isLoaded: boolean
  isNotificationDisplayed: boolean
  onGoingStep: string
}

class App extends Component<AppProps, AppState> {
  private subsscribeSuggestedLanguage: (() => void) | undefined
  private subscribeUserConsent: (() => void) | undefined
  private subscribeCreditCount: (() => void) | undefined
  private isFirstCreditCountSubscription = true

  static features = (
    planStatus: PlanStatus,
    config: ConfigContextType,
    service: Service,
    editor: Editor
  ) => ({
    TOKEN_LINT: new FeatureStatus({
      features: config.features,
      featureName: 'TOKEN_LINT',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    AUTHENTICATION: new FeatureStatus({
      features: config.features,
      featureName: 'AUTHENTICATION',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    USER_CONSENT: new FeatureStatus({
      features: config.features,
      featureName: 'USER_CONSENT',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    SHORTCUTS: new FeatureStatus({
      features: config.features,
      featureName: 'SHORTCUTS',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    USER_LANGUAGE_SUGGESTION: new FeatureStatus({
      features: config.features,
      featureName: 'USER_LANGUAGE_SUGGESTION',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
  })

  private get features() {
    return App.features(
      this.state.planStatus,
      this.props.config,
      this.state.service,
      this.state.editor
    )
  }

  constructor(props: AppProps) {
    super(props)
    this.state = {
      service: 'TOKEN_LINT',
      userSession: {
        connectionStatus: 'UNCONNECTED',
        id: '',
        fullName: '',
        avatar: '',
      },
      userIdentity: {
        id: '',
        fullName: '',
        avatar: '',
      },
      userConsent: getUserConsent(props.t),
      mustUserConsent: true,
      planStatus: 'UNPAID',
      trialStatus: 'UNUSED',
      trialRemainingTime: props.config.plan.trialTime,
      creditsCount: props.config.plan.creditsLimit,
      creditsRenewalDate: 0,
      editor: props.config.env.editor,
      plans: [],
      modalContext: 'EMPTY',
      announcements: {
        version: '',
        status: 'NO_ANNOUNCEMENTS',
      },
      notification: {
        type: 'INFO',
        message: '',
        timer: 5000,
      },
      suggestedLanguage: null,
      isSuggestedLanguageDisplayed: true,
      isLoaded: false,
      isNotificationDisplayed: false,
      documentWidth: document.documentElement.clientWidth,
      onGoingStep: 'app started',
    }
  }

  // Lifecycle
  componentDidMount = async () => {
    // Load
    sendPluginMessage(
      {
        pluginMessage: {
          type: 'LOAD_DATA',
          data: {
            userConsent: $userConsent.get(),
          },
        },
      },
      '*'
    )

    this.subsscribeSuggestedLanguage = $isSuggestedLanguageDisplayed.subscribe(
      (value) => {
        this.setState({
          isSuggestedLanguageDisplayed: value,
        })
      }
    )
    this.subscribeUserConsent = $userConsent.subscribe((value) => {
      this.setState({ userConsent: [...value] })
    })
    this.subscribeCreditCount = $creditsCount.subscribe((value) => {
      if (this.isFirstCreditCountSubscription) {
        this.isFirstCreditCountSubscription = false
        return
      }

      let adjustedValue = value
      if (adjustedValue < 0) adjustedValue = 0
      this.setState({ creditsCount: adjustedValue })

      sendPluginMessage(
        {
          pluginMessage: {
            type: 'SET_ITEMS',
            items: [
              {
                key: 'credits_count',
                value: adjustedValue,
              },
            ],
          },
          pluginId: this.props.config.env.pluginId,
        },
        this.props.config.urls.platformUrl
      )
    })

    this.setState({
      userConsent: $userConsent.get(),
    })

    // Authentication
    if (getSupabase() !== null && this.props.config.env.isSupabaseEnabled)
      getSupabase()?.auth.onAuthStateChange((event, session) => {
        const actions: {
          [action: string]: () => void
        } = {
          SIGNED_IN: () => {
            this.setState({
              userSession: {
                connectionStatus: 'CONNECTED',
                id: session?.user.id || '',
                fullName:
                  session?.user.user_metadata.full_name ||
                  'Anonymous Palette Wizard',
                avatar:
                  session?.user.user_metadata.avatar_url ||
                  `https://www.gravatar.com/avatar/${session?.user.id}?d=identicon`,
              },
            })
          },
          TOKEN_REFRESHED: () => {
            this.setState({
              userSession: {
                connectionStatus: 'CONNECTED',
                id: session?.user.id || '',
                fullName:
                  session?.user.user_metadata.full_name ||
                  'Anonymous Palette Wizard',
                avatar:
                  session?.user.user_metadata.avatar_url ||
                  `https://www.gravatar.com/avatar/${session?.user.id}?d=identicon`,
              },
            })

            sendPluginMessage(
              {
                pluginMessage: {
                  type: 'SET_ITEMS',
                  items: [
                    {
                      key: 'supabase_access_token',
                      value: session?.access_token,
                    },
                    {
                      key: 'supabase_refresh_token',
                      value: session?.refresh_token,
                    },
                  ],
                },
              },
              this.props.config.urls.platformUrl
            )
          },
        }
        return actions[event]?.()
      })

    // Listener
    window.addEventListener(
      'platformMessage',
      this.handleMessage as EventListener
    )
    window.addEventListener('resize', this.handleResize)
  }

  componentWillUnmount = () => {
    if (this.subsscribeSuggestedLanguage) this.subsscribeSuggestedLanguage()
    if (this.subscribeUserConsent) this.subscribeUserConsent()
    if (this.subscribeCreditCount) this.subscribeCreditCount()

    window.removeEventListener(
      'platformMessage',
      this.handleMessage as EventListener
    )
    window.removeEventListener('resize', this.handleResize)
  }

  // Handlers
  handleResize = () => {
    this.setState({
      documentWidth: document.documentElement.clientWidth,
    })
  }
  handleMessage = (e: CustomEvent<PluginMessageData>) => {
    const path = e.detail

    try {
      const switchService = () => {
        this.setState({
          service: path.data.service,
          onGoingStep: `service switched to ${path.data.service}`,
        })
      }

      const setTheme = () => {
        document.documentElement.setAttribute('data-mode', path.data.theme)
      }

      const openInBrowser = () => {
        window
          .open(path.data.url, !path.data.isNewTab ? '_self' : '_blank')
          ?.focus()
      }

      const checkUserAuthentication = async () => {
        this.setState({
          userIdentity: {
            id: path.data.id,
            fullName: path.data.fullName,
            avatar: path.data.avatar,
          },
        })
        if (this.props.config.env.isSupabaseEnabled)
          await checkConnectionStatus(
            path.data.accessToken,
            path.data.refreshToken
          )
      }

      const checkUserConsent = () => {
        this.setState({
          mustUserConsent: path.data.mustUserConsent,
        })
        updateUserConsentWithData(this.props.t, path.data.userConsent)
      }

      const checkUserPreferences = () => {
        setTimeout(() => this.setState({ isLoaded: true }), 2000)
        $isSuggestedLanguageDisplayed.set(
          path.data.isSuggestedLanguageDisplayed
        )

        this.onDetectBrowserLanguage(path.data.userLanguage)

        getTolgee()
          .changeLanguage(path.data.userLanguage)
          .then(() => {
            updateUserConsent(this.props.t)
          })
      }

      const checkUserLicense = () => {
        validateUserLicenseKey({
          corsWorkerUrl: this.props.config.urls.corsWorkerUrl,
          storeApiUrl: this.props.config.urls.storeApiUrl,
          licenseKey: path.data.licenseKey,
          instanceId: path.data.instanceId,
        }).then((isValid: boolean) => {
          this.setState({
            planStatus: isValid ? 'PAID' : 'UNPAID',
            trialStatus: isValid ? 'SUSPENDED' : this.state.trialStatus,
          })
        })
      }

      const checkEditor = () => {
        this.setState({ editor: path.data.editor })
        setEditor(path.data.editor)
        setTimeout(
          () =>
            trackEditorEvent(
              this.props.config.env.isMixpanelEnabled,
              this.state.userSession.id,
              this.state.userIdentity.id,
              this.state.planStatus,
              this.state.userConsent.find(
                (consent) => consent.id === 'mixpanel'
              )?.isConsented ?? false
            ),
          1000
        )
      }

      const checkPlanStatus = () =>
        this.setState({
          planStatus: path.data.planStatus,
        })

      const checkTrialStatus = () =>
        path.data.planStatus !== undefined
          ? this.setState({
              planStatus: path.data.planStatus,
              trialStatus: path.data.trialStatus,
              trialRemainingTime: path.data.trialRemainingTime,
            })
          : this.setState({
              trialStatus: path.data.trialStatus,
              trialRemainingTime: path.data.trialRemainingTime,
            })

      const checkCredits = () => {
        $creditsCount.set(path.data.creditsCount)
        this.setState({
          creditsCount: path.data.creditsCount,
          creditsRenewalDate: path.data.creditsRenewalDate,
        })
      }

      const checkAnnouncements = () => {
        checkAnnouncementsVersion(
          this.props.config.urls.announcementsWorkerUrl,
          this.props.config.env.announcementsDbId
        ).then((version: string) => {
          this.setState({
            announcements: {
              version: version,
              status: 'NO_ANNOUNCEMENTS',
            },
          })
          sendPluginMessage(
            {
              pluginMessage: {
                type: 'CHECK_ANNOUNCEMENTS_STATUS',
                data: {
                  version: version,
                },
              },
            },
            '*'
          )
        })
      }

      const postMessage = () => {
        // An ERROR notification arriving mid-audit (e.g. a Canvas-side
        // crash during RUN_AUDIT — see bridges/audit/runAudit.ts, which
        // catches and reports via this exact POST_MESSAGE path rather than
        // throwing) must not leave AuditService's RUNNING view stuck on the
        // spinner forever. Flip $auditStatus to 'ERROR' so it re-derives
        // back to the SETUP view, where the existing "Run audit" button
        // doubles as "try again". The toast banner below still surfaces the
        // actual error message via the pre-existing notification path.
        if (path.data.type === 'ERROR' && $auditStatus.get() === 'RUNNING')
          setAuditError()

        this.setState({
          isNotificationDisplayed: true,
          notification: {
            type: path.data.type,
            message: path.data.message,
            timer: path.data.timer === undefined ? 5000 : path.data.timer,
          },
        })
      }

      const handleAnnouncements = () => {
        this.setState({
          modalContext:
            path.data.status !== 'DISPLAY_ANNOUNCEMENTS_DIALOG'
              ? 'EMPTY'
              : 'ANNOUNCEMENTS',
          announcements: {
            version: this.state.announcements.version,
            status: path.data.status,
          },
        })
      }

      const handleOnboarding = () => {
        this.setState({
          modalContext:
            path.data.status !== 'DISPLAY_ONBOARDING_DIALOG'
              ? 'EMPTY'
              : 'ONBOARDING',
        })
      }

      const enableTrial = () => {
        this.setState({
          planStatus: 'PAID',
          trialStatus: 'PENDING',
          modalContext: 'WELCOME_TO_TRIAL',
        })

        trackTrialEnablementEvent(
          this.props.config.env.isMixpanelEnabled,
          this.state.userSession.id,
          this.state.userIdentity.id,
          this.state.planStatus,
          this.state.userConsent.find((consent) => consent.id === 'mixpanel')
            ?.isConsented ?? false,
          {
            date: path.data.date,
            trialTime: path.data.trialTime,
          }
        )
      }

      const getTrial = () =>
        this.setState({
          modalContext: 'TRY',
        })

      const getPricing = () =>
        this.setState({
          modalContext: 'PRICING',
          plans: path.data.plans,
        })

      const getLicense = () =>
        this.setState({
          modalContext: 'LICENSE',
        })

      const enableProPlan = () =>
        this.setState({
          planStatus: 'PAID',
        })

      const leaveProPlan = () =>
        this.setState({
          planStatus: 'UNPAID',
        })

      const welcomeToPro = () => {
        this.setState({
          planStatus: 'PAID',
          modalContext: 'WELCOME_TO_PRO',
          trialStatus:
            this.state.trialStatus !== 'UNUSED'
              ? 'SUSPENDED'
              : this.state.trialStatus,
        })

        trackPurchaseEvent(
          this.props.config.env.isMixpanelEnabled,
          this.state.userSession.id,
          this.state.userIdentity.id,
          this.state.planStatus,
          this.state.userConsent.find((consent) => consent.id === 'mixpanel')
            ?.isConsented ?? false
        )
      }

      const signOut = (data: UserSession) =>
        this.setState({
          userSession: data,
        })

      const reportError = () => console.error(path.data)

      const handleAuditStarted = () => startAudit(path.data.totalShapesEstimate)

      const handleShapesScanned = () => updateAuditProgress(path.data)

      const handleAuditCompleted = () => completeAudit(path.data)

      const handleAuditCancelled = () => cancelAudit(path.data.scannedShapes)

      const handleLayersSelected = () => $lastLayerSelection.set(path.data)

      const handleTokenApplied = () => applyTokenApplied(path.data)

      const handleTokenCreated = () => applyTokenCreated(path.data)

      const handleActiveTokenSetsListed = () =>
        setActiveTokenSets(path.data.sets)

      const handleSelectionChanged = () => $selectionCount.set(path.data.count)

      const actions: {
        [action: string]: () => void
      } = {
        SWITCH_SERVICE: () => switchService(),
        SET_THEME: () => setTheme(),
        OPEN_IN_BROWSER: () => openInBrowser(),
        CHECK_USER_AUTHENTICATION: () => checkUserAuthentication(),
        CHECK_USER_CONSENT: () => checkUserConsent(),
        CHECK_USER_PREFERENCES: () => checkUserPreferences(),
        CHECK_USER_LICENSE: () => checkUserLicense(),
        CHECK_EDITOR: () => checkEditor(),
        CHECK_PLAN_STATUS: () => checkPlanStatus(),
        CHECK_TRIAL_STATUS: () => checkTrialStatus(),
        CHECK_CREDITS: () => checkCredits(),
        CHECK_ANNOUNCEMENTS_VERSION: () => checkAnnouncements(),
        POST_MESSAGE: () => postMessage(),
        PUSH_ANNOUNCEMENTS_STATUS: () => handleAnnouncements(),
        PUSH_ONBOARDING_STATUS: () => handleOnboarding(),
        ENABLE_TRIAL: () => enableTrial(),
        GET_TRIAL: () => getTrial(),
        GET_PRICING: () => getPricing(),
        GET_LICENSE: () => getLicense(),
        ENABLE_PRO_PLAN: () => enableProPlan(),
        LEAVE_PRO_PLAN: () => leaveProPlan(),
        WELCOME_TO_PRO: () => welcomeToPro(),
        SIGN_OUT: () => signOut(path?.data),
        REPORT_ERROR: () => reportError(),
        AUDIT_STARTED: () => handleAuditStarted(),
        SHAPES_SCANNED: () => handleShapesScanned(),
        AUDIT_COMPLETED: () => handleAuditCompleted(),
        AUDIT_CANCELLED: () => handleAuditCancelled(),
        LAYERS_SELECTED: () => handleLayersSelected(),
        TOKEN_APPLIED: () => handleTokenApplied(),
        TOKEN_CREATED: () => handleTokenCreated(),
        ACTIVE_TOKEN_SETS_LISTED: () => handleActiveTokenSetsListed(),
        SELECTION_CHANGED: () => handleSelectionChanged(),
        DEFAULT: () => null,
      }

      return actions[path.type ?? 'DEFAULT']?.()
    } catch (error) {
      console.error(error)
      return
    }
  }

  userConsentHandler = (e: Array<ConsentConfiguration>) => {
    this.setState({
      userConsent: e,
      mustUserConsent: false,
    })

    sendPluginMessage(
      {
        pluginMessage: {
          type: 'SET_ITEMS',
          items: [
            {
              key: 'mixpanel_user_consent',
              value: e.find((consent) => consent.id === 'mixpanel')
                ?.isConsented,
            },
            {
              key: 'user_consent_version',
              value: this.props.config.versions.userConsentVersion,
            },
          ],
        },
        pluginId: this.props.config.env.pluginId,
      },
      this.props.config.urls.platformUrl
    )

    trackUserConsentEvent(
      this.props.config.env.isMixpanelEnabled,
      this.props.config.versions.userConsentVersion,
      e
    )
  }

  acceptSuggestedLanguageHandler = () => {
    if (!this.state.suggestedLanguage) return

    const tolgee = getTolgee()
    tolgee.changeLanguage(this.state.suggestedLanguage).then(() => {
      updateUserConsent(this.props.t)
    })

    sendPluginMessage(
      {
        pluginMessage: {
          type: 'UPDATE_LANGUAGE',
          data: {
            lang: this.state.suggestedLanguage,
          },
        },
      },
      '*'
    )

    this.onDismissLanguageBannerHandler()

    trackLanguageEvent(
      this.props.config.env.isMixpanelEnabled,
      this.state.userSession.id,
      this.state.userIdentity.id,
      this.state.planStatus,
      this.state.userConsent.find((consent) => consent.id === 'mixpanel')
        ?.isConsented ?? false,
      { lang: this.state.suggestedLanguage }
    )

    this.setState({
      isSuggestedLanguageDisplayed: false,
      suggestedLanguage: null,
    })
  }

  getLanguageSuggestionKey = (language: Language | null): string => {
    const langCodeMap: { [key in Language]?: string } = {
      'en-US': 'en',
      'pt-BR': 'pt',
      'fr-FR': 'fr',
      'zh-Hans-CN': 'zh',
    }
    return language ? langCodeMap[language] || '' : ''
  }

  getSuggestedLanguageMessage = (): string => {
    const langCode = this.getLanguageSuggestionKey(this.state.suggestedLanguage)
    return langCode
      ? this.props.t(`user.language.suggestion.${langCode}.message`)
      : ''
  }

  getSuggestedLanguageCta = (): string => {
    const langCode = this.getLanguageSuggestionKey(this.state.suggestedLanguage)
    return langCode
      ? this.props.t(`user.language.suggestion.${langCode}.cta`)
      : ''
  }

  // Direct Actions
  onDetectBrowserLanguage = (userLanguage: Language) => {
    const browserLang = navigator.language
    const currentLang = userLanguage

    const languageMapping: { [key: string]: Language } = {
      'en-US': 'en-US',
      en: 'en-US',
      'fr-FR': 'fr-FR',
      fr: 'fr-FR',
    }

    const suggestedLang =
      languageMapping[browserLang] || languageMapping[browserLang.split('-')[0]]

    if (
      suggestedLang &&
      suggestedLang !== currentLang &&
      (!userLanguage || suggestedLang !== userLanguage)
    )
      this.setState({
        suggestedLanguage: suggestedLang,
      })
  }

  onDismissLanguageBannerHandler = () => {
    this.setState({
      isSuggestedLanguageDisplayed: false,
      suggestedLanguage: null,
    })

    sendPluginMessage(
      {
        pluginMessage: {
          type: 'SET_ITEMS',
          items: [
            {
              key: 'is_suggested_language_displayed',
              value: false,
            },
          ],
        },
      },
      '*'
    )
  }

  // Render
  render() {
    if (this.state.isLoaded)
      return (
        <main
          className="ui"
          inert={
            this.state.modalContext !== 'EMPTY' || this.state.mustUserConsent
          }
        >
          <Feature
            isActive={
              this.features.TOKEN_LINT.isActive() &&
              this.state.service === 'TOKEN_LINT'
            }
          >
            <AuditService
              {...this.props}
              {...this.state}
            />
          </Feature>
          <Feature isActive={this.state.modalContext !== 'EMPTY'}>
            {document.getElementById('modal') &&
              createPortal(
                <Modal
                  {...this.props}
                  {...this.state}
                  rawData={this.state}
                  context={this.state.modalContext}
                  onChangePublication={(e) => this.setState({ ...e })}
                  onManageLicense={(e) => this.setState({ ...e })}
                  onSkipAndResetPalette={(e) => this.setState({ ...e })}
                  onClose={() =>
                    this.setState({
                      modalContext: 'EMPTY',
                      announcements: {
                        version: this.state.announcements.version,
                        status: 'NO_ANNOUNCEMENTS',
                      },
                    })
                  }
                />,
                document.getElementById('modal') ??
                  document.createElement('app')
              )}
          </Feature>
          <Feature isActive={this.state.isNotificationDisplayed}>
            {document.getElementById('toast') &&
              createPortal(
                <Modal
                  {...this.props}
                  {...this.state}
                  rawData={this.state}
                  context="NOTIFICATION"
                  onChangePublication={(e) => this.setState({ ...e })}
                  onManageLicense={(e) => this.setState({ ...e })}
                  onSkipAndResetPalette={(e) => this.setState({ ...e })}
                  onClose={() =>
                    this.setState({
                      isNotificationDisplayed: false,
                      notification: {
                        type: 'INFO',
                        message: '',
                        timer: 5000,
                      },
                    })
                  }
                />,
                document.getElementById('toast') ??
                  document.createElement('app')
              )}
          </Feature>
          <Feature
            isActive={
              this.state.mustUserConsent &&
              this.features.USER_CONSENT.isActive()
            }
          >
            {document.getElementById('modal') &&
              createPortal(
                <Consent
                  welcomeMessage={this.props.t('user.cookies.welcome', {
                    pluginName: this.props.config.information.pluginName,
                  })}
                  vendorsMessage={this.props.t('user.cookies.vendors')}
                  privacyPolicy={{
                    label: this.props.t('user.cookies.privacyPolicy'),
                    action: () =>
                      sendPluginMessage(
                        {
                          pluginMessage: {
                            type: 'OPEN_IN_BROWSER',
                            data: {
                              url: this.props.config.urls.privacyUrl,
                            },
                          },
                        },
                        '*'
                      ),
                  }}
                  moreDetailsLabel={this.props.t('user.cookies.customize')}
                  lessDetailsLabel={this.props.t('user.cookies.back')}
                  consentActions={{
                    consent: {
                      label: this.props.t('user.cookies.consent'),
                      action: this.userConsentHandler,
                    },
                    deny: {
                      label: this.props.t('user.cookies.deny'),
                      action: this.userConsentHandler,
                    },
                    save: {
                      label: this.props.t('user.cookies.save'),
                      action: this.userConsentHandler,
                    },
                  }}
                  validVendor={{
                    name: this.props.t('vendors.functional.name'),
                    id: 'functional',
                    icon: '',
                    description: this.props.t('vendors.functional.description'),
                    isConsented: true,
                  }}
                  vendorsList={this.state.userConsent}
                  canBeClosed
                  closeLabel={this.props.t('user.cookies.close')}
                  onClose={() => this.setState({ mustUserConsent: false })}
                />,
                document.getElementById('modal') ??
                  document.createElement('app')
              )}
          </Feature>
          <Feature
            isActive={
              this.features.USER_LANGUAGE_SUGGESTION.isActive() &&
              this.state.isSuggestedLanguageDisplayed &&
              this.state.suggestedLanguage !== null
            }
          >
            <SemanticMessage
              type="INFO"
              message={this.getSuggestedLanguageMessage()}
              actionsSlot={
                <>
                  <Button
                    type="secondary"
                    label={this.getSuggestedLanguageCta()}
                    action={this.acceptSuggestedLanguageHandler}
                  />
                  <Button
                    type="icon"
                    icon="close"
                    action={this.onDismissLanguageBannerHandler}
                  />
                </>
              }
              isAnchored
            />
          </Feature>
          <Feature isActive={this.features.SHORTCUTS.isActive()}>
            <Shortcuts
              {...this.props}
              {...this.state}
              onReOpenAnnouncements={(e) => this.setState({ ...e })}
              onReOpenOnboarding={(e) => this.setState({ ...e })}
              onReOpenReport={(e) => this.setState({ ...e })}
              onReOpenAbout={(e) => this.setState({ ...e })}
              onReOpenPreferences={(e) => this.setState({ ...e })}
              onReOpenLicense={(e) => this.setState({ ...e })}
              onReOpenChat={(e) => this.setState({ ...e })}
              onReOpenFeedback={(e) => this.setState({ ...e })}
              onUpdateConsent={(e) => this.setState({ ...e })}
              onUpdateLanguage={(e) => this.setState({ ...e })}
            />
          </Feature>
        </main>
      )
    else
      return (
        <main className="ui">
          <div className={layouts.centered}>
            <Icon
              type="PICTO"
              iconName="spinner"
            />
          </div>
        </main>
      )
  }
}

export default WithTranslation(WithConfig(App))
