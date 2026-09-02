import { PureComponent } from 'preact/compat'
import { FeatureStatus } from '@unoff/utils'
import { Dialog, Icon, SemanticMessage, texts } from '@unoff/ui'
import { WithTranslationProps } from '../../components/WithTranslation'
import { WithConfigProps } from '../../components/WithConfig'
import Feature from '../../components/Feature'
import { sendPluginMessage } from '../../../utils/pluginMessage'
import {
  BaseProps,
  AnnouncementsDigest,
  PlanStatus,
  Service,
  Editor,
} from '../../../types/app'
import { trackAnnouncementsEvent } from '../../../external/tracking/eventsTracker'
import getAnnouncements from '../../../external/cms/getAnnouncements'
import { ConfigContextType } from '../../../config/ConfigContext'

interface AnnouncementsProps
  extends BaseProps, WithConfigProps, WithTranslationProps {
  announcements: AnnouncementsDigest
  onCloseAnnouncements: (e: MouseEvent) => void
}

interface AnnouncementsState {
  position: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  announcements: Array<any>
  status: 'LOADING' | 'LOADED' | 'ERROR'
  isImageLoaded: boolean
}

export default class Announcements extends PureComponent<
  AnnouncementsProps,
  AnnouncementsState
> {
  static features = (
    planStatus: PlanStatus,
    config: ConfigContextType,
    service: Service,
    editor: Editor
  ) => ({
    HELP_ANNOUNCEMENTS: new FeatureStatus({
      features: config.features,
      featureName: 'HELP_ANNOUNCEMENTS',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
  })

  constructor(props: AnnouncementsProps) {
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
    getAnnouncements(
      this.props.config.urls.announcementsWorkerUrl,
      this.props.config.env.announcementsDbId,
      this.props.config.env.platform
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

      trackAnnouncementsEvent(
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
      if (
        this.props.announcements.version !== undefined &&
        this.props.announcements.version !== '' &&
        this.props.announcements.version !== null
      )
        sendPluginMessage(
          {
            pluginMessage: {
              type: 'SET_ITEMS',
              items: [
                {
                  key: 'announcements_version',
                  value: this.props.announcements.version,
                },
              ],
            },
          },
          '*'
        )
      this.setState({ position: 0 })
      this.props.onCloseAnnouncements(e as MouseEvent)
    }
  }

  // Render
  render() {
    if (this.state.status === 'LOADING')
      return (
        <Feature
          isActive={Announcements.features(
            this.props.planStatus,
            this.props.config,
            this.props.service,
            this.props.editor
          ).HELP_ANNOUNCEMENTS.isActive()}
        >
          <Dialog
            title={this.props.t('shortcuts.news')}
            isLoading
            onClose={this.props.onCloseAnnouncements}
          />
        </Feature>
      )
    else if (this.state.status === 'ERROR')
      return (
        <Feature
          isActive={Announcements.features(
            this.props.planStatus,
            this.props.config,
            this.props.service,
            this.props.editor
          ).HELP_ANNOUNCEMENTS.isActive()}
        >
          <Dialog
            title={this.props.t('shortcuts.news')}
            isMessage
            onClose={this.props.onCloseAnnouncements}
          >
            <SemanticMessage
              type="WARNING"
              message={this.props.t('error.announcements')}
            />
          </Dialog>
        </Feature>
      )
    else if (this.state.announcements.length === 0)
      return (
        <Feature
          isActive={Announcements.features(
            this.props.planStatus,
            this.props.config,
            this.props.service,
            this.props.editor
          ).HELP_ANNOUNCEMENTS.isActive()}
        >
          <Dialog
            title={this.props.t('shortcuts.news')}
            isMessage
            onClose={(e: MouseEvent) => {
              if (
                this.props.announcements.version !== undefined &&
                this.props.announcements.version !== '' &&
                this.props.announcements.version !== null
              )
                sendPluginMessage(
                  {
                    pluginMessage: {
                      type: 'SET_ITEMS',
                      items: [
                        {
                          key: 'announcements_version',
                          value: this.props.announcements.version,
                        },
                      ],
                    },
                  },
                  '*'
                )
              this.props.onCloseAnnouncements(e)
            }}
          >
            <SemanticMessage
              type="INFO"
              message={this.props.t('info.announcements')}
            />
          </Dialog>
        </Feature>
      )
    else
      return (
        <Feature
          isActive={Announcements.features(
            this.props.planStatus,
            this.props.config,
            this.props.service,
            this.props.editor
          ).HELP_ANNOUNCEMENTS.isActive()}
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
                    ? this.props.t('announcements.cta.next')
                    : this.props.t('announcements.cta.gotIt'),
                isAutofocus: true,
                action: (e: MouseEvent) => this.goNextSlide(e),
              },
              secondary: (() => {
                if (
                  this.state.announcements[this.state.position].properties.URL
                    .url !== null
                )
                  return {
                    label: this.props.t('announcements.cta.learnMore'),
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

                      trackAnnouncementsEvent(
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
              if (
                this.props.announcements.version !== undefined &&
                this.props.announcements.version !== '' &&
                this.props.announcements.version !== null
              )
                sendPluginMessage(
                  {
                    pluginMessage: {
                      type: 'SET_ITEMS',
                      items: [
                        {
                          key: 'announcements_version',
                          value: this.props.announcements.version,
                        },
                      ],
                    },
                  },
                  '*'
                )
              this.props.onCloseAnnouncements(e)
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
