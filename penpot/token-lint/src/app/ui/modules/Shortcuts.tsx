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

export default class Shortcuts extends PureComponent<ShortcutsProps, ShortcutsState> {
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
      featureName: 'PRO_PLAN',
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

  private get features() {
    return Shortcuts.features(
      this.props.planStatus,
      this.props.config,
      this.props.service,
      this.props.editor
    )
  }

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
                <Feature isActive={this.features.HELP_DOCUMENTATION.isActive()}>
                  <Button
                    type="icon"
                    icon="repository"
                    helper={{
                      label: this.props.t('shortcuts.tooltips.documentation'),
                      pin: 'TOP',
                    }}
                    isBlocked={this.features.HELP_DOCUMENTATION.isBlocked()}
                    isNew={this.features.HELP_DOCUMENTATION.isNew()}
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
                <Feature isActive={this.features.USER.isActive()}>
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
                                this.features.AUTHENTICATION.isActive() &&
                                this.props.config.env.isSupabaseEnabled,
                              isBlocked:
                                this.features.AUTHENTICATION.isBlocked(),
                              isNew: this.features.AUTHENTICATION.isNew(),
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
                        isActive:
                          this.features.AUTHENTICATION.isActive() &&
                          this.props.config.env.isSupabaseEnabled,
                        isBlocked: this.features.AUTHENTICATION.isBlocked(),
                      },
                      {
                        label: this.props.t('user.updateConsent'),
                        type: 'OPTION' as const,
                        isActive: this.features.USER_CONSENT.isActive(),
                        isBlocked: this.features.USER_CONSENT.isBlocked(),
                        isNew: this.features.USER_CONSENT.isNew(),
                        action: () =>
                          this.props.onUpdateConsent({
                            mustUserConsent: true,
                          }),
                      },
                      {
                        label: this.props.t('user.updatePreferences'),
                        type: 'OPTION' as const,
                        isActive: this.features.USER_PREFERENCES.isActive(),
                        isBlocked: this.features.USER_PREFERENCES.isBlocked(),
                        isNew: this.features.USER_PREFERENCES.isNew(),
                        action: () =>
                          this.props.onReOpenPreferences({
                            modalContext: 'PREFERENCES',
                          }),
                      },
                      {
                        label: this.props.t('user.manageLicense'),
                        type: 'OPTION' as const,
                        isActive: this.features.USER_LICENSE.isActive(),
                        isBlocked: this.features.USER_LICENSE.isBlocked(),
                        isNew: this.features.USER_LICENSE.isNew(),
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
                    isAlwaysExpanded
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
                        this.features.HELP_ANNOUNCEMENTS.isActive() &&
                        this.props.config.env.isNotionEnabled,
                      isBlocked: this.features.HELP_ANNOUNCEMENTS.isBlocked(),
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
                        this.features.HELP_ONBOARDING.isActive() &&
                        this.props.config.env.isNotionEnabled,
                      isBlocked: this.features.HELP_ONBOARDING.isBlocked(),
                      isNew: this.features.HELP_ONBOARDING.isNew(),
                      action: () =>
                        this.props.onReOpenOnboarding({
                          modalContext: 'ONBOARDING',
                        }),
                    },
                    {
                      label: this.props.t('shortcuts.email'),
                      type: 'OPTION',
                      isActive: this.features.HELP_EMAIL.isActive(),
                      isBlocked: this.features.HELP_EMAIL.isBlocked(),
                      isNew: this.features.HELP_EMAIL.isNew(),
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
                      isActive: this.features.HELP_CHAT.isActive(),
                      isBlocked: this.features.HELP_CHAT.isBlocked(),
                      isNew: this.features.HELP_CHAT.isNew(),
                      action: () =>
                        this.props.onReOpenChat({
                          modalContext: 'CHAT',
                        }),
                    },
                    {
                      type: 'SEPARATOR',
                      isActive:
                        this.features.HELP_ANNOUNCEMENTS.isActive() ||
                        this.features.HELP_ONBOARDING.isActive() ||
                        this.features.HELP_EMAIL.isActive() ||
                        this.features.HELP_CHAT.isActive(),
                    },
                    {
                      label: this.props.t('shortcuts.community'),
                      type: 'OPTION',
                      isActive: this.features.INVOLVE_COMMUNITY.isActive(),
                      isBlocked: this.features.INVOLVE_COMMUNITY.isBlocked(),
                      isNew: this.features.INVOLVE_COMMUNITY.isNew(),
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
                      isActive: this.features.INVOLVE_REQUESTS.isActive(),
                      isBlocked: this.features.INVOLVE_REQUESTS.isBlocked(),
                      isNew: this.features.INVOLVE_REQUESTS.isNew(),
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
                        this.features.INVOLVE_ISSUES.isActive() &&
                        this.props.config.env.isSentryEnabled,
                      isBlocked: this.features.INVOLVE_ISSUES.isBlocked(),
                      isNew: this.features.INVOLVE_ISSUES.isNew(),
                      action: () =>
                        this.props.onReOpenReport({
                          modalContext: 'REPORT',
                        }),
                    },
                    {
                      label: this.props.t('shortcuts.feedback'),
                      type: 'OPTION',
                      isActive: this.features.INVOLVE_FEEDBACK.isActive(),
                      isBlocked: this.features.INVOLVE_FEEDBACK.isBlocked(),
                      isNew: this.features.INVOLVE_FEEDBACK.isNew(),
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
                      isActive: this.features.INVOLVE_REPOSITORY.isActive(),
                      isBlocked: this.features.INVOLVE_REPOSITORY.isBlocked(),
                      isNew: this.features.INVOLVE_REPOSITORY.isNew(),
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
                      isActive:
                        this.features.INVOLVE_COMMUNITY.isActive() ||
                        this.features.INVOLVE_REQUESTS.isActive() ||
                        this.features.INVOLVE_ISSUES.isActive() ||
                        this.features.INVOLVE_FEEDBACK.isActive() ||
                        this.features.INVOLVE_REPOSITORY.isActive(),
                    },
                    {
                      label: this.props.t('about.title', {
                        pluginName: this.props.config.information.pluginName,
                      }),
                      type: 'OPTION',
                      isActive: this.features.MORE_ABOUT.isActive(),
                      isBlocked: this.features.MORE_ABOUT.isBlocked(),
                      isNew: this.features.MORE_ABOUT.isNew(),
                      action: () =>
                        this.props.onReOpenAbout({
                          modalContext: 'ABOUT',
                        }),
                    },
                    {
                      label: this.props.t('shortcuts.follow'),
                      type: 'OPTION',
                      isActive: this.features.MORE_NETWORK.isActive(),
                      isBlocked: this.features.MORE_NETWORK.isBlocked(),
                      isNew: this.features.MORE_NETWORK.isNew(),
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
                      isActive: this.features.MORE_AUTHOR.isActive(),
                      isBlocked: this.features.MORE_AUTHOR.isBlocked(),
                      isNew: this.features.MORE_AUTHOR.isNew(),
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
                  isAlwaysExpanded
                />
              </div>
              <Feature isActive={this.features.RESIZE_UI.isActive()}>
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
            <Feature isActive={this.features.PRO_PLAN.isActive()}>
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
