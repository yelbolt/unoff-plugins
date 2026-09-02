import React from 'react'
import { PureComponent } from 'preact/compat'
import { doClassnames, FeatureStatus } from '@unoff/utils'
import { Bar, Button, Icon, layouts, Menu } from '@unoff/ui'
import { WithTranslationProps } from '../components/WithTranslation'
import { WithConfigProps } from '../components/WithConfig'
import Feature from '../components/Feature'
import { AppState } from '../App'
import { sendPluginMessage } from '../../utils/pluginMessage'
import {
  BaseProps,
  AnnouncementsDigest,
  PlanStatus,
  Service,
  Editor,
} from '../../types/app'
import {
  trackSignInEvent,
  trackSignOutEvent,
} from '../../external/tracking/eventsTracker'
import { signIn, signOut } from '../../external/auth/authentication'
import { ConfigContextType } from '../../config/ConfigContext'
import PlanControls from './PlanControls'

interface ShortcutsProps
  extends BaseProps, WithConfigProps, WithTranslationProps {
  trialRemainingTime: number
  creditsRenewalDate: number
  announcements: AnnouncementsDigest
  onReOpenAnnouncements: React.Dispatch<Partial<AppState>>
  onReOpenOnboarding: React.Dispatch<Partial<AppState>>
  onReOpenAbout: React.Dispatch<Partial<AppState>>
  onReOpenReport: React.Dispatch<Partial<AppState>>
  onReOpenPreferences: React.Dispatch<Partial<AppState>>
  onReOpenLicense: React.Dispatch<Partial<AppState>>
  onReOpenChat: React.Dispatch<Partial<AppState>>
  onReOpenFeedback: React.Dispatch<Partial<AppState>>
  onUpdateConsent: React.Dispatch<Partial<AppState>>
  onUpdateLanguage: React.Dispatch<Partial<AppState>>
}

interface ShortcutsState {
  isUserMenuLoading: boolean
}

export default class Shortcuts extends PureComponent<
  ShortcutsProps,
  ShortcutsState
> {
  private theme: string | null

  static features = (
    planStatus: PlanStatus,
    config: ConfigContextType,
    service: Service,
    editor: Editor
  ) => ({
    USER: new FeatureStatus({
      features: config.features,
      featureName: 'USER',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    USER_PREFERENCES: new FeatureStatus({
      features: config.features,
      featureName: 'USER_PREFERENCES',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    USER_LICENSE: new FeatureStatus({
      features: config.features,
      featureName: 'USER_LICENSE',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    USER_LICENSE_JUMP: new FeatureStatus({
      features: config.features,
      featureName: 'USER_LICENSE_JUMP',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    USER_LANGUAGE: new FeatureStatus({
      features: config.features,
      featureName: 'USER_LANGUAGE',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    USER_LANGUAGE_EN_US: new FeatureStatus({
      features: config.features,
      featureName: 'USER_LANGUAGE_EN_US',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    USER_LANGUAGE_FR_FR: new FeatureStatus({
      features: config.features,
      featureName: 'USER_LANGUAGE_FR_FR',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    HELP_ANNOUNCEMENTS: new FeatureStatus({
      features: config.features,
      featureName: 'HELP_ANNOUNCEMENTS',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    HELP_ONBOARDING: new FeatureStatus({
      features: config.features,
      featureName: 'HELP_ONBOARDING',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    HELP_EMAIL: new FeatureStatus({
      features: config.features,
      featureName: 'HELP_EMAIL',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    HELP_CHAT: new FeatureStatus({
      features: config.features,
      featureName: 'HELP_CHAT',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    INVOLVE_REPOSITORY: new FeatureStatus({
      features: config.features,
      featureName: 'INVOLVE_REPOSITORY',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    INVOLVE_FEEDBACK: new FeatureStatus({
      features: config.features,
      featureName: 'INVOLVE_FEEDBACK',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    INVOLVE_ISSUES: new FeatureStatus({
      features: config.features,
      featureName: 'INVOLVE_ISSUES',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    INVOLVE_REQUESTS: new FeatureStatus({
      features: config.features,
      featureName: 'INVOLVE_REQUESTS',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    INVOLVE_COMMUNITY: new FeatureStatus({
      features: config.features,
      featureName: 'INVOLVE_COMMUNITY',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    MORE_ABOUT: new FeatureStatus({
      features: config.features,
      featureName: 'MORE_ABOUT',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    MORE_NETWORK: new FeatureStatus({
      features: config.features,
      featureName: 'MORE_NETWORK',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    MORE_AUTHOR: new FeatureStatus({
      features: config.features,
      featureName: 'MORE_AUTHOR',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    HELP_DOCUMENTATION: new FeatureStatus({
      features: config.features,
      featureName: 'HELP_DOCUMENTATION',
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
    RESIZE_UI: new FeatureStatus({
      features: config.features,
      featureName: 'RESIZE_UI',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    PRO_PLAN: new FeatureStatus({
      features: config.features,
      featureName: 'BACKSTAGE_PRO_PLAN',
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
  })

  constructor(props: ShortcutsProps) {
    super(props)
    this.theme = document.documentElement.getAttribute('data-theme')
    this.state = {
      isUserMenuLoading: false,
    }
  }

  // Direct Actions
  onHold = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    const shiftX = target.offsetWidth - e.layerX
    const shiftY = target.offsetHeight - e.layerY
    window.onmousemove = (e) => this.onResize(e, shiftX, shiftY)
    window.onmouseup = this.onRelease
  }

  onResize = (e: MouseEvent, shiftX: number, shiftY: number) => {
    const windowSize = {
      w: 640,
      h: 420,
    }
    const origin = {
      x: e.screenX - e.clientX,
      y: e.screenY - e.clientY,
    }
    const shift = {
      x: shiftX,
      y: shiftY,
    }
    const cursor = {
      x: e.screenX,
      y: e.screenY,
    }
    const scaleX = Math.abs(origin.x - cursor.x - shift.x),
      scaleY = Math.abs(origin.y - cursor.y - shift.y)

    if (scaleX > this.props.config.limits.minWidth) windowSize.w = scaleX
    else windowSize.w = this.props.config.limits.minWidth
    if (scaleY > this.props.config.limits.minHeight) windowSize.h = scaleY
    else windowSize.h = this.props.config.limits.minHeight

    sendPluginMessage(
      {
        pluginMessage: {
          type: 'RESIZE_UI',
          data: {
            width: windowSize.w,
            height: windowSize.h,
          },
        },
      },
      '*'
    )
  }

  onRelease = () => (window.onmousemove = null)

  onDoubleClick = () => {
    sendPluginMessage(
      {
        pluginMessage: {
          type: 'RESIZE_UI',
          data: {
            width: this.props.config.limits.minWidth,
            height: this.props.config.limits.minHeight,
          },
        },
      },
      '*'
    )
  }

  // Render
  render() {
    let height, radius

    switch (this.theme) {
      case 'figma':
        height = 'calc(100% - var(--size-pos-xxsmall))'
        radius = 'var(--border-radius-full)'
        break
      case 'penpot':
        height = 'calc(100% - var(--size-pos-xxsmall))'
        radius = 'var(--border-radius-full)'
        break
      case 'sketch':
        height = 'calc(100% - var(--size-pos-xxsmall))'
        radius = 'var(--border-radius-full)'
        break
      case 'framer':
        height = 'calc(100% - var(--size-pos-xxsmall))'
        radius = 'var(--border-radius-xlarge)'
        break
      default:
        height = 'calc(100% - var(--size-pos-xxsmall))'
        radius = 'var(--border-radius-full)'
    }

    return (
      <>
        <Bar
          rightPartSlot={
            <>
              <div
                className={doClassnames([
                  'shortcuts',
                  layouts['snackbar--medium'],
                ])}
              >
                <Feature
                  isActive={Shortcuts.features(
                    this.props.planStatus,
                    this.props.config,
                    this.props.service,
                    this.props.editor
                  ).HELP_DOCUMENTATION.isActive()}
                >
                  <Button
                    type="icon"
                    icon="repository"
                    helper={{
                      label: this.props.t('shortcuts.tooltips.documentation'),
                      pin: 'TOP',
                    }}
                    isBlocked={Shortcuts.features(
                      this.props.planStatus,
                      this.props.config,
                      this.props.service,
                      this.props.editor
                    ).HELP_DOCUMENTATION.isBlocked()}
                    isNew={Shortcuts.features(
                      this.props.planStatus,
                      this.props.config,
                      this.props.service,
                      this.props.editor
                    ).HELP_DOCUMENTATION.isNew()}
                    action={() =>
                      sendPluginMessage(
                        {
                          pluginMessage: {
                            type: 'OPEN_IN_BROWSER',
                            data: {
                              url: this.props.config.urls.documentationUrl,
                            },
                          },
                        },
                        '*'
                      )
                    }
                  />
                </Feature>
                <Feature
                  isActive={Shortcuts.features(
                    this.props.planStatus,
                    this.props.config,
                    this.props.service,
                    this.props.editor
                  ).USER.isActive()}
                >
                  <Menu
                    id="user-menu"
                    icon={
                      this.props.userSession.connectionStatus === 'UNCONNECTED'
                        ? 'user'
                        : undefined
                    }
                    customIcon={
                      this.props.userSession.connectionStatus === 'CONNECTED' &&
                      this.props.userSession.avatar ? (
                        <img
                          src={this.props.userSession.avatar}
                          style={{
                            height: height,
                            borderRadius: radius,
                          }}
                          alt="User Avatar"
                        />
                      ) : undefined
                    }
                    options={[
                      ...(this.props.userSession.connectionStatus ===
                      'CONNECTED'
                        ? [
                            {
                              label: this.props.t('user.welcomeMessage', {
                                username: this.props.userSession.fullName,
                              }),
                              type: 'TITLE' as const,
                              action: () => null,
                            },
                          ]
                        : []),

                      ...(this.props.userSession.connectionStatus ===
                      'CONNECTED'
                        ? [
                            {
                              label: this.props.t('user.signOut'),
                              type: 'OPTION' as const,
                              action: async () => {
                                this.setState({ isUserMenuLoading: true })
                                signOut({
                                  authUrl: this.props.config.urls.authUrl,
                                  platformUrl:
                                    this.props.config.urls.platformUrl,
                                  pluginId: this.props.config.env.pluginId,
                                })
                                  .then(() => {
                                    sendPluginMessage(
                                      {
                                        pluginMessage: {
                                          type: 'POST_MESSAGE',
                                          data: {
                                            type: 'INFO',
                                            message:
                                              this.props.t('info.signOut'),
                                          },
                                        },
                                      },
                                      '*'
                                    )

                                    trackSignOutEvent(
                                      this.props.config.env.isMixpanelEnabled,
                                      this.props.userSession.id,
                                      this.props.userIdentity.id,
                                      this.props.planStatus,
                                      this.props.userConsent.find(
                                        (consent) => consent.id === 'mixpanel'
                                      )?.isConsented ?? false
                                    )
                                  })
                                  .finally(() => {
                                    this.setState({ isUserMenuLoading: false })
                                  })
                                  .catch(() => {
                                    sendPluginMessage(
                                      {
                                        pluginMessage: {
                                          type: 'POST_MESSAGE',
                                          data: {
                                            type: 'ERROR',
                                            message:
                                              this.props.t('error.generic'),
                                          },
                                        },
                                      },
                                      '*'
                                    )
                                  })
                              },
                            },
                          ]
                        : [
                            {
                              label: this.props.t('user.signIn'),
                              type: 'OPTION' as const,
                              isActive:
                                Shortcuts.features(
                                  this.props.planStatus,
                                  this.props.config,
                                  this.props.service,
                                  this.props.editor
                                ).AUTHENTICATION.isActive() &&
                                this.props.config.env.isSupabaseEnabled,
                              isBlocked: Shortcuts.features(
                                this.props.planStatus,
                                this.props.config,
                                this.props.service,
                                this.props.editor
                              ).AUTHENTICATION.isBlocked(),
                              isNew: Shortcuts.features(
                                this.props.planStatus,
                                this.props.config,
                                this.props.service,
                                this.props.editor
                              ).AUTHENTICATION.isNew(),
                              action: async () => {
                                this.setState({ isUserMenuLoading: true })
                                signIn({
                                  authWorkerUrl:
                                    this.props.config.urls.authWorkerUrl,
                                  authUrl: this.props.config.urls.authUrl,
                                  platformUrl:
                                    this.props.config.urls.platformUrl,
                                  pluginId: this.props.config.env.pluginId,
                                })
                                  .then(() => {
                                    sendPluginMessage(
                                      {
                                        pluginMessage: {
                                          type: 'POST_MESSAGE',
                                          data: {
                                            type: 'SUCCESS',
                                            message: this.props.t(
                                              'user.welcomeMessage',
                                              {
                                                username:
                                                  this.props.userSession
                                                    .fullName,
                                              }
                                            ),
                                          },
                                        },
                                      },
                                      '*'
                                    )

                                    trackSignInEvent(
                                      this.props.config.env.isMixpanelEnabled,
                                      this.props.userSession.id,
                                      this.props.userIdentity.id,
                                      this.props.planStatus,
                                      this.props.userConsent.find(
                                        (consent) => consent.id === 'mixpanel'
                                      )?.isConsented ?? false
                                    )
                                  })
                                  .finally(() => {
                                    this.setState({ isUserMenuLoading: false })
                                  })
                                  .catch((error) => {
                                    sendPluginMessage(
                                      {
                                        pluginMessage: {
                                          type: 'POST_MESSAGE',
                                          data: {
                                            type: 'ERROR',
                                            message:
                                              error.message ===
                                              'Authentication timeout'
                                                ? this.props.t('error.timeout')
                                                : this.props.t(
                                                    'error.authentication'
                                                  ),
                                          },
                                        },
                                      },
                                      '*'
                                    )
                                  })
                              },
                            },
                          ]),
                      {
                        type: 'SEPARATOR' as const,
                      },
                      {
                        label: this.props.t('user.updateConsent'),
                        type: 'OPTION' as const,
                        isActive: Shortcuts.features(
                          this.props.planStatus,
                          this.props.config,
                          this.props.service,
                          this.props.editor
                        ).USER_CONSENT.isActive(),
                        isBlocked: Shortcuts.features(
                          this.props.planStatus,
                          this.props.config,
                          this.props.service,
                          this.props.editor
                        ).USER_CONSENT.isBlocked(),
                        isNew: Shortcuts.features(
                          this.props.planStatus,
                          this.props.config,
                          this.props.service,
                          this.props.editor
                        ).USER_CONSENT.isNew(),
                        action: () =>
                          this.props.onUpdateConsent({
                            mustUserConsent: true,
                          }),
                      },
                      {
                        label: this.props.t('user.updatePreferences'),
                        type: 'OPTION' as const,
                        isActive: Shortcuts.features(
                          this.props.planStatus,
                          this.props.config,
                          this.props.service,
                          this.props.editor
                        ).USER_PREFERENCES.isActive(),
                        isBlocked: Shortcuts.features(
                          this.props.planStatus,
                          this.props.config,
                          this.props.service,
                          this.props.editor
                        ).USER_PREFERENCES.isBlocked(),
                        isNew: Shortcuts.features(
                          this.props.planStatus,
                          this.props.config,
                          this.props.service,
                          this.props.editor
                        ).USER_PREFERENCES.isNew(),
                        action: () =>
                          this.props.onReOpenPreferences({
                            modalContext: 'PREFERENCES',
                          }),
                      },
                      {
                        label: this.props.t('user.manageLicense'),
                        type: 'OPTION' as const,
                        isActive: Shortcuts.features(
                          this.props.planStatus,
                          this.props.config,
                          this.props.service,
                          this.props.editor
                        ).USER_LICENSE.isActive(),
                        isBlocked: Shortcuts.features(
                          this.props.planStatus,
                          this.props.config,
                          this.props.service,
                          this.props.editor
                        ).USER_LICENSE.isBlocked(),
                        isNew: Shortcuts.features(
                          this.props.planStatus,
                          this.props.config,
                          this.props.service,
                          this.props.editor
                        ).USER_LICENSE.isNew(),
                        action: () =>
                          this.props.onReOpenLicense({
                            modalContext: 'LICENSE',
                          }),
                      },
                    ]}
                    state={this.state.isUserMenuLoading ? 'LOADING' : 'DEFAULT'}
                    alignment="TOP_RIGHT"
                    helper={{
                      label: this.props.t('shortcuts.tooltips.userMenu'),
                      pin: 'TOP',
                    }}
                    selected={this.props.config.lang}
                  />
                </Feature>
                <Menu
                  id="help-support-menu"
                  icon="help"
                  options={[
                    {
                      label: this.props.t('shortcuts.news'),
                      type: 'OPTION',
                      isActive:
                        Shortcuts.features(
                          this.props.planStatus,
                          this.props.config,
                          this.props.service,
                          this.props.editor
                        ).HELP_ANNOUNCEMENTS.isActive() &&
                        this.props.config.env.isNotionEnabled,
                      isBlocked: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).HELP_ANNOUNCEMENTS.isBlocked(),
                      isNew:
                        this.props.announcements.status ===
                        'DISPLAY_ANNOUNCEMENTS_NOTIFICATION'
                          ? true
                          : false,
                      action: () =>
                        this.props.onReOpenAnnouncements({
                          modalContext: 'ANNOUNCEMENTS',
                        }),
                    },
                    {
                      label: this.props.t('shortcuts.onboarding'),
                      type: 'OPTION',
                      isActive:
                        Shortcuts.features(
                          this.props.planStatus,
                          this.props.config,
                          this.props.service,
                          this.props.editor
                        ).HELP_ONBOARDING.isActive() &&
                        this.props.config.env.isNotionEnabled,
                      isBlocked: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).HELP_ONBOARDING.isBlocked(),
                      isNew: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).HELP_ONBOARDING.isNew(),
                      action: () =>
                        this.props.onReOpenOnboarding({
                          modalContext: 'ONBOARDING',
                        }),
                    },
                    {
                      label: this.props.t('shortcuts.email'),
                      type: 'OPTION',
                      isActive: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).HELP_EMAIL.isActive(),
                      isBlocked: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).HELP_EMAIL.isBlocked(),
                      isNew: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).HELP_EMAIL.isNew(),
                      action: () =>
                        sendPluginMessage(
                          {
                            pluginMessage: {
                              type: 'OPEN_IN_BROWSER',
                              data: {
                                url: this.props.config.urls.supportEmail,
                              },
                            },
                          },
                          '*'
                        ),
                    },
                    {
                      label: this.props.t('shortcuts.chat'),
                      type: 'OPTION',
                      isActive: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).HELP_CHAT.isActive(),
                      isBlocked: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).HELP_CHAT.isBlocked(),
                      isNew: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).HELP_CHAT.isNew(),
                      action: () =>
                        this.props.onReOpenChat({
                          modalContext: 'CHAT',
                        }),
                    },
                    {
                      type: 'SEPARATOR',
                    },
                    {
                      label: this.props.t('shortcuts.community'),
                      type: 'OPTION',
                      isActive: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).INVOLVE_COMMUNITY.isActive(),
                      isBlocked: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).INVOLVE_COMMUNITY.isBlocked(),
                      isNew: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).INVOLVE_COMMUNITY.isNew(),
                      action: () =>
                        sendPluginMessage(
                          {
                            pluginMessage: {
                              type: 'OPEN_IN_BROWSER',
                              data: {
                                url: this.props.config.urls.communityUrl,
                              },
                            },
                          },
                          '*'
                        ),
                    },
                    {
                      label: this.props.t('shortcuts.request'),
                      type: 'OPTION',
                      isActive: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).INVOLVE_REQUESTS.isActive(),
                      isBlocked: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).INVOLVE_REQUESTS.isBlocked(),
                      isNew: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).INVOLVE_REQUESTS.isNew(),
                      action: () =>
                        sendPluginMessage(
                          {
                            pluginMessage: {
                              type: 'OPEN_IN_BROWSER',
                              data: {
                                url: this.props.config.urls.requestsUrl,
                              },
                            },
                          },
                          '*'
                        ),
                    },
                    {
                      label: this.props.t('report.title'),
                      type: 'OPTION',
                      isActive:
                        Shortcuts.features(
                          this.props.planStatus,
                          this.props.config,
                          this.props.service,
                          this.props.editor
                        ).INVOLVE_ISSUES.isActive() &&
                        this.props.config.env.isSentryEnabled,
                      isBlocked: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).INVOLVE_ISSUES.isBlocked(),
                      isNew: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).INVOLVE_ISSUES.isNew(),
                      action: () =>
                        this.props.onReOpenReport({
                          modalContext: 'REPORT',
                        }),
                    },
                    {
                      label: this.props.t('shortcuts.feedback'),
                      type: 'OPTION',
                      isActive: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).INVOLVE_FEEDBACK.isActive(),
                      isBlocked: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).INVOLVE_FEEDBACK.isBlocked(),
                      isNew: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).INVOLVE_FEEDBACK.isNew(),
                      action: () =>
                        sendPluginMessage(
                          {
                            pluginMessage: {
                              type: 'OPEN_IN_BROWSER',
                              data: {
                                url: this.props.config.urls.feedbackUrl,
                              },
                            },
                          },
                          '*'
                        ),
                    },
                    {
                      label: this.props.t('shortcuts.repository'),
                      type: 'OPTION',
                      isActive: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).INVOLVE_REPOSITORY.isActive(),
                      isBlocked: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).INVOLVE_REPOSITORY.isBlocked(),
                      isNew: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).INVOLVE_REPOSITORY.isNew(),
                      action: () =>
                        sendPluginMessage(
                          {
                            pluginMessage: {
                              type: 'OPEN_IN_BROWSER',
                              data: {
                                url: this.props.config.urls.repositoryUrl,
                              },
                            },
                          },
                          '*'
                        ),
                    },
                    {
                      type: 'SEPARATOR',
                    },
                    {
                      label: this.props.t('about.title', {
                        pluginName: this.props.config.information.pluginName,
                      }),
                      type: 'OPTION',
                      isActive: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).MORE_ABOUT.isActive(),
                      isBlocked: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).MORE_ABOUT.isBlocked(),
                      isNew: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).MORE_ABOUT.isNew(),
                      action: () =>
                        this.props.onReOpenAbout({
                          modalContext: 'ABOUT',
                        }),
                    },
                    {
                      label: this.props.t('shortcuts.follow'),
                      type: 'OPTION',
                      isActive: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).MORE_NETWORK.isActive(),
                      isBlocked: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).MORE_NETWORK.isBlocked(),
                      isNew: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).MORE_NETWORK.isNew(),
                      action: () =>
                        sendPluginMessage(
                          {
                            pluginMessage: {
                              type: 'OPEN_IN_BROWSER',
                              data: {
                                url: this.props.config.urls.networkUrl,
                              },
                            },
                          },
                          '*'
                        ),
                    },
                    {
                      label: this.props.t('shortcuts.author'),
                      type: 'OPTION',
                      isActive: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).MORE_AUTHOR.isActive(),
                      isBlocked: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).MORE_AUTHOR.isBlocked(),
                      isNew: Shortcuts.features(
                        this.props.planStatus,
                        this.props.config,
                        this.props.service,
                        this.props.editor
                      ).MORE_AUTHOR.isNew(),
                      action: () =>
                        sendPluginMessage(
                          {
                            pluginMessage: {
                              type: 'OPEN_IN_BROWSER',
                              data: {
                                url: this.props.config.urls.authorUrl,
                              },
                            },
                          },
                          '*'
                        ),
                    },
                  ]}
                  alignment="TOP_RIGHT"
                  helper={{
                    label: this.props.t('shortcuts.tooltips.helpMenu'),
                    pin: 'TOP',
                  }}
                  isNew={
                    this.props.announcements.status ===
                    'DISPLAY_ANNOUNCEMENTS_NOTIFICATION'
                      ? true
                      : false
                  }
                />
              </div>
              <Feature
                isActive={Shortcuts.features(
                  this.props.planStatus,
                  this.props.config,
                  this.props.service,
                  this.props.editor
                ).RESIZE_UI.isActive()}
              >
                <div
                  className="box-resizer-grip"
                  onMouseDown={this.onHold.bind(this)}
                  onClick={(e) => {
                    if (e.detail === 2) this.onDoubleClick()
                  }}
                >
                  <Icon
                    type="PICTO"
                    iconName="resize-grip"
                  />
                </div>
              </Feature>
            </>
          }
          leftPartSlot={
            <Feature
              isActive={Shortcuts.features(
                this.props.planStatus,
                this.props.config,
                this.props.service,
                this.props.editor
              ).PRO_PLAN.isActive()}
            >
              <PlanControls {...this.props} />
            </Feature>
          }
          shouldReflow
          border={['TOP']}
        />
      </>
    )
  }
}
