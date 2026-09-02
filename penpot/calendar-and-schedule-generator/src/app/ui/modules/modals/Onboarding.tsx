import { PureComponent } from 'preact/compat'
import { FeatureStatus } from '@unoff/utils'
import { Dialog, Icon, SemanticMessage, texts } from '@unoff/ui'
import { WithTranslationProps } from '../../components/WithTranslation'
import { WithConfigProps } from '../../components/WithConfig'
import Feature from '../../components/Feature'
import { sendPluginMessage } from '../../../utils/pluginMessage'
import { BaseProps, Editor, PlanStatus, Service } from '../../../types/app'
import { trackOnboardingEvent } from '../../../external/tracking/eventsTracker'
import getOnboarding from '../../../external/cms/getOnboarding'
import { ConfigContextType } from '../../../config/ConfigContext'

interface OnboardingProps
  extends BaseProps, WithConfigProps, WithTranslationProps {
  onCloseOnboarding: (e: MouseEvent) => void
}

interface OnboardingState {
  position: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  announcements: Array<any>
  status: 'LOADING' | 'LOADED' | 'ERROR'
  isImageLoaded: boolean
}

export default class Onboarding extends PureComponent<
  OnboardingProps,
  OnboardingState
> {
  static features = (
    planStatus: PlanStatus,
    config: ConfigContextType,
    service: Service,
    editor: Editor
  ) => ({
    HELP_ONBOARDING: new FeatureStatus({
      features: config.features,
      featureName: 'HELP_ONBOARDING',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
  })

  constructor(props: OnboardingProps) {
    super(props)
    this.state = {
      position: 0,
      announcements: [],
      status: 'LOADING',
      isImageLoaded: false,
    }
  }

  // Lifecycle
  componentDidMount = () => {
    getOnboarding(
      this.props.config.urls.announcementsWorkerUrl,
      this.props.config.env.onboardingDbId,
      this.props.config.env.platform,
      this.props.config.env.editor
    )
      .then((announcements) => {
        this.setState({ announcements, status: 'LOADED' })
      })
      .catch((error) => {
        console.error(error)
        this.setState({ status: 'ERROR' })
      })
  }

  // Direct Actions
  goNextSlide = (e: MouseEvent) => {
    if (this.state.position + 1 < this.state.announcements.length) {
      this.setState({ position: this.state.position + 1, isImageLoaded: false })

      trackOnboardingEvent(
        this.props.config.env.isMixpanelEnabled,
        this.props.userSession.id,
        this.props.userIdentity.id,
        this.props.planStatus,
        this.props.userConsent.find((consent) => consent.id === 'mixpanel')
          ?.isConsented ?? false,
        {
          feature: 'NEXT_STEP',
        }
      )
    } else {
      sendPluginMessage(
        {
          pluginMessage: {
            type: 'SET_ITEMS',
            items: [
              {
                key: 'is_onboarding_read',
                value: 'true',
              },
            ],
          },
        },
        '*'
      )
      this.setState({ position: 0 })
      this.props.onCloseOnboarding(e as MouseEvent)
    }
  }

  // Render
  render() {
    if (this.state.status === 'LOADING')
      return (
        <Feature
          isActive={Onboarding.features(
            this.props.planStatus,
            this.props.config,
            this.props.service,
            this.props.editor
          ).HELP_ONBOARDING.isActive()}
        >
          <Dialog
            title={this.props.t('shortcuts.onboarding')}
            isLoading
            onClose={this.props.onCloseOnboarding}
          />
        </Feature>
      )
    else if (this.state.status === 'ERROR')
      return (
        <Feature
          isActive={Onboarding.features(
            this.props.planStatus,
            this.props.config,
            this.props.service,
            this.props.editor
          ).HELP_ONBOARDING.isActive()}
        >
          <Dialog
            title={this.props.t('shortcuts.onboarding')}
            isMessage
            onClose={this.props.onCloseOnboarding}
          >
            <SemanticMessage
              type="WARNING"
              message={this.props.t('error.onboarding')}
            />
          </Dialog>
        </Feature>
      )
    else if (this.state.announcements.length === 0)
      return (
        <Feature
          isActive={Onboarding.features(
            this.props.planStatus,
            this.props.config,
            this.props.service,
            this.props.editor
          ).HELP_ONBOARDING.isActive()}
        >
          <Dialog
            title={this.props.t('shortcuts.onboarding')}
            isMessage
            onClose={(e: MouseEvent) => {
              sendPluginMessage(
                {
                  pluginMessage: {
                    type: 'SET_ITEMS',
                    items: [
                      {
                        key: 'is_onboarding_read',
                        value: 'true',
                      },
                    ],
                  },
                },
                '*'
              )
              this.props.onCloseOnboarding(e)
            }}
          >
            <SemanticMessage
              type="INFO"
              message={this.props.t('info.onboarding')}
            />
          </Dialog>
        </Feature>
      )
    else
      return (
        <Feature
          isActive={Onboarding.features(
            this.props.planStatus,
            this.props.config,
            this.props.service,
            this.props.editor
          ).HELP_ONBOARDING.isActive()}
        >
          <Dialog
            title={
              this.state.announcements[this.state.position].properties.Title
                .title[0].plain_text
            }
            tag={
              this.state.announcements[this.state.position].properties.Type
                .select.name
            }
            actions={{
              primary: {
                label:
                  this.state.position + 1 < this.state.announcements.length
                    ? this.props.t('onboarding.cta.next')
                    : this.props.t('onboarding.cta.gotIt'),
                isAutofocus: true,
                action: (e: MouseEvent) => this.goNextSlide(e),
              },
              secondary: (() => {
                if (
                  this.state.announcements[this.state.position].properties.URL
                    .url !== null
                )
                  return {
                    label: this.props.t('onboarding.cta.learnMore'),
                    action: () => {
                      sendPluginMessage(
                        {
                          pluginMessage: {
                            type: 'OPEN_IN_BROWSER',
                            data: {
                              url: this.state.announcements[this.state.position]
                                .properties.URL.url,
                            },
                          },
                        },
                        '*'
                      )

                      trackOnboardingEvent(
                        this.props.config.env.isMixpanelEnabled,
                        this.props.userSession.id,
                        this.props.userIdentity.id,
                        this.props.planStatus,
                        this.props.userConsent.find(
                          (consent) => consent.id === 'mixpanel'
                        )?.isConsented ?? false,
                        {
                          feature: 'LEARN_MORE',
                        }
                      )
                    },
                  }
                else return undefined
              })(),
            }}
            indicator={
              this.state.announcements.length > 1
                ? `${this.state.position + 1} of ${this.state.announcements.length}`
                : undefined
            }
            onClose={(e: MouseEvent) => {
              sendPluginMessage(
                {
                  pluginMessage: {
                    type: 'SET_ITEMS',
                    items: [
                      {
                        key: 'is_onboarding_read',
                        value: 'true',
                      },
                    ],
                  },
                },
                '*'
              )
              this.props.onCloseOnboarding(e)
            }}
          >
            <div
              className="dialog__cover"
              style={{
                position: 'relative',
              }}
            >
              {!this.state.isImageLoaded && (
                <div
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    inset: '0 0 0 0',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Icon
                    type="PICTO"
                    iconName="spinner"
                  />
                </div>
              )}
              <img
                src={
                  this.state.announcements[this.state.position].properties.Image
                    .files[0].file.url
                }
                style={{
                  width: '100%',
                  visibility: this.state.isImageLoaded ? 'visible' : 'hidden',
                  aspectRatio: '8 / 5',
                }}
                loading="lazy"
                onLoad={() => this.setState({ isImageLoaded: true })}
              />
            </div>
            <div className="dialog__text">
              <p className={texts.type}>
                {
                  this.state.announcements[this.state.position].properties
                    .Description.rich_text[0].plain_text
                }
              </p>
            </div>
          </Dialog>
        </Feature>
      )
  }
}
