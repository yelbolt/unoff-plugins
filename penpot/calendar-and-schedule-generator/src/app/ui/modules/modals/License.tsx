import React from 'react'
import { PureComponent } from 'preact/compat'
import { FeatureStatus } from '@unoff/utils'
import {
  Button,
  Dialog,
  FormItem,
  Input,
  Message,
  SemanticMessage,
  SimpleItem,
} from '@unoff/ui'
import { WithTranslationProps } from '../../components/WithTranslation'
import { WithConfigProps } from '../../components/WithConfig'
import Feature from '../../components/Feature'
import { sendPluginMessage } from '../../../utils/pluginMessage'
import { PluginMessageData } from '../../../types/messages'
import { BaseProps, Editor, PlanStatus, Service } from '../../../types/app'
import validateUserLicenseKey from '../../../external/license/validateUserLicenseKey '
import desactivateUserLicenseKey from '../../../external/license/desactivateUserLicenseKey'
import activateUserLicenseKey from '../../../external/license/activateUserLicenseKey'
import { ConfigContextType } from '../../../config/ConfigContext'

interface LicenseProps
  extends BaseProps, WithConfigProps, WithTranslationProps {
  onClose: React.ChangeEventHandler<HTMLInputElement> & (() => void)
}

interface LicenseState {
  isPrimaryActionLoading: boolean
  isSecondaryActionLoading: boolean
  hasLicense: boolean
  licenseStatus: 'READY' | 'ERROR' | 'VALID'
  checkingButtonStatus: 'DEFAULT' | 'VALID' | 'UNVALID'
  userLicenseKey: string
  userInstanceId: string
  userInstanceName: string
}

export default class License extends PureComponent<LicenseProps, LicenseState> {
  private theme: string | null

  static features = (
    planStatus: PlanStatus,
    config: ConfigContextType,
    service: Service,
    editor: Editor
  ) => ({
    USER_LICENSE: new FeatureStatus({
      features: config.features,
      featureName: 'USER_LICENSE',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
  })

  constructor(props: LicenseProps) {
    super(props)
    this.state = {
      isPrimaryActionLoading: false,
      isSecondaryActionLoading: false,
      hasLicense: false,
      licenseStatus: 'READY',
      checkingButtonStatus: 'DEFAULT',
      userLicenseKey: '',
      userInstanceId: '',
      userInstanceName: '',
    }
    this.theme = document.documentElement.getAttribute('data-theme')
  }

  // Lifecycle
  componentDidMount = () => {
    sendPluginMessage(
      {
        pluginMessage: {
          type: 'GET_ITEMS',
          items: [
            'user_license_key',
            'user_license_instance_id',
            'user_license_instance_name',
          ],
        },
      },
      '*'
    )
    window.addEventListener(
      'platformMessage',
      this.handleMessage as EventListener
    )
  }

  componentWillUnmount = () => {
    window.removeEventListener(
      'platformMessage',
      this.handleMessage as EventListener
    )
  }

  // Handlers
  handleMessage = (e: CustomEvent<PluginMessageData>) => {
    const path = e.detail

    const actions: {
      [action: string]: () => void
    } = {
      GET_ITEM_USER_LICENSE_KEY: () => {
        if (
          path.data.value !== null &&
          path.data.value !== undefined &&
          path.data.value !== ''
        )
          this.setState({ userLicenseKey: path.data.value, hasLicense: true })
        else this.setState({ userLicenseKey: '', hasLicense: false })
      },
      GET_ITEM_USER_LICENSE_INSTANCE_ID: () => {
        if (
          path.data.value !== null &&
          path.data.value !== undefined &&
          path.data.value !== '' &&
          this.state.userLicenseKey !== ''
        )
          this.setState({ userInstanceId: path.data.value, hasLicense: true })
        else this.setState({ userInstanceId: '', hasLicense: false })
      },
      GET_ITEM_USER_LICENSE_INSTANCE_NAME: () => {
        if (
          path.data.value !== null &&
          path.data.value !== undefined &&
          path.data.value !== ''
        )
          this.setState({ userInstanceName: path.data.value })
      },
      DEFAULT: () => null,
    }

    return actions[path.type ?? 'DEFAULT']?.()
  }

  // Direct Actions
  onActivateLicense = () => {
    if (!this.state.hasLicense)
      return {
        label: this.props.t('user.license.cta.activate'),
        state:
          !this.isValidLicenseKeyFormat(this.state.userLicenseKey) ||
          this.state.userLicenseKey === '' ||
          this.state.userInstanceName === ''
            ? ('DISABLED' as const)
            : this.state.isPrimaryActionLoading
              ? ('LOADING' as const)
              : ('DEFAULT' as const),
        action: () => {
          this.setState({ isPrimaryActionLoading: true })
          activateUserLicenseKey({
            corsWorkerUrl: this.props.config.urls.corsWorkerUrl,
            storeApiUrl: this.props.config.urls.storeApiUrl,
            licenseKey: this.state.userLicenseKey,
            instanceName: this.state.userInstanceName,
            platform: this.props.config.env.platform,
          })
            .then((data) => {
              this.setState({
                userLicenseKey: data.license_key,
                userInstanceId: data.instance_id,
                userInstanceName: data.instance_name,
                licenseStatus: 'VALID',
              })
              sendPluginMessage(
                {
                  pluginMessage: {
                    type: 'WELCOME_TO_PRO',
                  },
                },
                '*'
              )
            })
            .finally(() => {
              this.setState({ isPrimaryActionLoading: false })
            })
            .catch(() => {
              this.setState({
                licenseStatus: 'ERROR',
              })
            })
        },
      }

    return undefined
  }

  onDesactivateLicense = () => {
    if (this.state.licenseStatus === 'ERROR' && this.state.hasLicense)
      return {
        label: this.props.t('user.license.cta.unlinkLocally'),
        action: () => {
          sendPluginMessage(
            {
              pluginMessage: {
                type: 'DELETE_ITEMS',
                items: [
                  'user_license_key',
                  'user_license_instance_id',
                  'user_license_instance_name',
                ],
              },
            },
            '*'
          )
          this.setState({
            userLicenseKey: '',
            userInstanceId: '',
            hasLicense: false,
            licenseStatus: 'READY',
          })
        },
      }
    else if (this.state.licenseStatus !== 'ERROR' && this.state.hasLicense)
      return {
        label: this.props.t('user.license.cta.unlink'),
        state: this.state.isPrimaryActionLoading
          ? ('LOADING' as const)
          : ('DEFAULT' as const),
        action: () => {
          this.setState({ isPrimaryActionLoading: true })
          desactivateUserLicenseKey({
            corsWorkerUrl: this.props.config.urls.corsWorkerUrl,
            storeApiUrl: this.props.config.urls.storeApiUrl,
            licenseKey: this.state.userLicenseKey,
            instanceId: this.state.userInstanceId,
          })
            .then(() => {
              sendPluginMessage(
                {
                  pluginMessage: {
                    type: 'POST_MESSAGE',
                    data: {
                      type: 'SUCCESS',
                      message: this.props.t('success.unlinkedLicense', {
                        licenseKey: this.state.userInstanceName,
                      }),
                    },
                  },
                },
                '*'
              )
              sendPluginMessage(
                {
                  pluginMessage: {
                    type: 'LEAVE_PRO_PLAN',
                  },
                },
                '*'
              )
              this.setState({
                userLicenseKey: '',
                userInstanceId: '',
                hasLicense: false,
              })
            })
            .finally(() => {
              this.setState({
                isPrimaryActionLoading: false,
              })
            })
            .catch(() => {
              this.setState({
                licenseStatus: 'ERROR',
              })
            })
        },
      }

    return undefined
  }

  isValidLicenseKeyFormat = (key: string): boolean => {
    const licenseKeyRegex =
      /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i
    return licenseKeyRegex.test(key)
  }

  // Render
  render() {
    let modalPadding, messagePadding

    switch (this.theme) {
      case 'figma':
        modalPadding = 'var(--size-pos-xxsmall) 0'
        messagePadding =
          '0 var(--size-pos-xsmall) var(--size-pos-xxxsmall) var(--size-pos-xsmall)'
        break
      case 'penpot':
        modalPadding = 'var(--size-pos-xxsmall) var(--size-pos-xsmall)'
        messagePadding =
          '0 var(--size-pos-xsmall) var(--size-pos-xxsmall) var(--size-pos-xsmall)'
        break
      case 'sketch':
        modalPadding = 'var(--size-pos-xsmall) var(--size-pos-xsmall)'
        messagePadding =
          '0 var(--size-pos-xsmall) var(--size-pos-xxsmall) var(--size-pos-xsmall)'
        break
      case 'framer':
        modalPadding = 'var(--size-pos-xsmall) var(--size-pos-xxxsmall)'
        messagePadding =
          '0 var(--size-pos-xsmall) var(--size-pos-xxsmall) var(--size-pos-xsmall)'
        break
      default:
        modalPadding = '0'
        messagePadding = '0'
    }

    return (
      <Feature
        isActive={License.features(
          this.props.planStatus,
          this.props.config,
          this.props.service,
          this.props.editor
        ).USER_LICENSE.isActive()}
      >
        <Dialog
          title={this.props.t('user.manageLicense')}
          actions={{
            primary: this.onActivateLicense(),
            destructive: this.onDesactivateLicense(),
            secondary: (() => {
              if (this.state.hasLicense)
                return {
                  label: this.props.t('user.license.cta.manage'),
                  action: () => {
                    sendPluginMessage(
                      {
                        pluginMessage: {
                          type: 'OPEN_IN_BROWSER',
                          data: {
                            url: this.props.config.urls.storeManagementUrl,
                          },
                        },
                      },
                      '*'
                    )
                  },
                }
              return undefined
            })(),
          }}
          onClose={this.props.onClose}
        >
          {!this.state.hasLicense && (
            <div className="dialog__form">
              {this.state.licenseStatus === 'READY' && (
                <SemanticMessage
                  type="INFO"
                  message={this.props.t('user.license.messages.activate')}
                />
              )}
              {this.state.licenseStatus === 'ERROR' && (
                <SemanticMessage
                  type="ERROR"
                  message={this.props.t('error.activatedLicense')}
                />
              )}
              <FormItem
                label={this.props.t('user.license.key.label')}
                id="type-license-key"
                shouldFill
              >
                <Input
                  type="TEXT"
                  id="type-license-key"
                  value={this.state.userLicenseKey}
                  placeholder={this.props.t('user.license.key.placeholder')}
                  isAutoFocus
                  onChange={(e) =>
                    this.setState({
                      userLicenseKey:
                        (e.target as HTMLInputElement)?.value ?? '',
                    })
                  }
                />
              </FormItem>
              <FormItem
                label={this.props.t('user.license.name.label')}
                id="type-instance-name"
                helper={{
                  type: 'INFO',
                  message: this.props.t('user.license.name.helper'),
                }}
                shouldFill
              >
                <Input
                  type="TEXT"
                  id="type-instance-name"
                  value={this.state.userInstanceName}
                  placeholder={this.props.t('user.license.name.placeholder')}
                  onChange={(e) =>
                    this.setState({
                      userInstanceName:
                        (e.target as HTMLInputElement)?.value ?? '',
                    })
                  }
                />
              </FormItem>
            </div>
          )}
          {this.state.hasLicense && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: modalPadding,
              }}
            >
              {this.state.licenseStatus === 'ERROR' && (
                <div
                  style={{
                    padding: messagePadding,
                  }}
                >
                  <SemanticMessage
                    type="ERROR"
                    message={this.props.t('error.unlinkedLicense', {
                      licenseKey: this.state.userInstanceName,
                    })}
                  />
                </div>
              )}
              <SimpleItem
                leftPartSlot={
                  <Message
                    icon="key"
                    messages={[
                      `${this.state.userLicenseKey} ${this.state.userInstanceName !== '' ? `(${this.state.userInstanceName})` : ''}`,
                    ]}
                  />
                }
                rightPartSlot={
                  <Button
                    type="secondary"
                    icon={
                      this.state.checkingButtonStatus === 'VALID'
                        ? 'check'
                        : this.state.checkingButtonStatus === 'UNVALID'
                          ? 'close'
                          : 'refresh'
                    }
                    label={
                      this.state.checkingButtonStatus === 'VALID'
                        ? this.props.t('user.license.messages.active')
                        : this.state.checkingButtonStatus === 'UNVALID'
                          ? this.props.t('user.license.messages.unactive')
                          : this.props.t('user.license.cta.validate')
                    }
                    isLoading={this.state.isSecondaryActionLoading}
                    action={() => {
                      this.setState({ isSecondaryActionLoading: true })
                      validateUserLicenseKey({
                        corsWorkerUrl: this.props.config.urls.corsWorkerUrl,
                        storeApiUrl: this.props.config.urls.storeApiUrl,
                        licenseKey: this.state.userLicenseKey,
                        instanceId: this.state.userInstanceId,
                      })
                        .then(() => {
                          this.setState({
                            licenseStatus: 'VALID',
                            checkingButtonStatus: 'VALID',
                          })
                          sendPluginMessage(
                            {
                              pluginMessage: {
                                type: 'ENABLE_PRO_PLAN',
                              },
                            },
                            '*'
                          )
                        })
                        .finally(() => {
                          this.setState({
                            isSecondaryActionLoading: false,
                          })
                          setTimeout(() => {
                            this.setState({
                              checkingButtonStatus: 'DEFAULT',
                            })
                          }, 2000)
                        })
                        .catch(() => {
                          this.setState({
                            licenseStatus: 'ERROR',
                            checkingButtonStatus: 'UNVALID',
                          })
                          sendPluginMessage(
                            {
                              pluginMessage: {
                                type: 'LEAVE_PRO_PLAN',
                              },
                            },
                            '*'
                          )
                        })
                    }}
                  />
                }
                isListItem={false}
                alignment="CENTER"
              />
            </div>
          )}
        </Dialog>
      </Feature>
    )
  }
}
