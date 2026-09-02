import React from 'react'
import { PureComponent } from 'preact/compat'
import { FeatureStatus } from '@unoff/utils'
import { Dialog, FormItem, Input } from '@unoff/ui'
import { WithTranslationProps } from '../../components/WithTranslation'
import { WithConfigProps } from '../../components/WithConfig'
import Feature from '../../components/Feature'
import { sendPluginMessage } from '../../../utils/pluginMessage'
import { BaseProps, Editor, PlanStatus, Service } from '../../../types/app'
import { getSentry } from '../../../external/monitoring'
import { ConfigContextType } from '../../../config/ConfigContext'

interface ReportProps extends BaseProps, WithConfigProps, WithTranslationProps {
  onClose: React.ChangeEventHandler<HTMLInputElement> & (() => void)
}

interface ReportState {
  isPrimaryActionLoading: boolean
  isSecondaryActionLoading: boolean
  userFullName: string
  userEmail: string
  userMessage: string
}

export default class Report extends PureComponent<ReportProps, ReportState> {
  static features = (
    planStatus: PlanStatus,
    config: ConfigContextType,
    service: Service,
    editor: Editor
  ) => ({
    INVOLVE_ISSUES: new FeatureStatus({
      features: config.features,
      featureName: 'INVOLVE_ISSUES',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
  })

  constructor(props: ReportProps) {
    super(props)
    this.state = {
      isPrimaryActionLoading: false,
      isSecondaryActionLoading: false,
      userFullName: '',
      userEmail: '',
      userMessage: '',
    }
  }

  // Handlers
  reportHandler = () => {
    this.setState({ isPrimaryActionLoading: true })
    getSentry()
      .sendFeedback(
        {
          name: this.state.userFullName,
          email: this.state.userEmail,
          message: this.state.userMessage,
          url: this.props.config.urls.platformUrl,
          tags: { platform: this.props.config.env.platform },
        },
        {
          includeReplay: true,
        }
      )
      .then(() => {
        this.setState({
          userFullName: '',
          userEmail: '',
          userMessage: '',
        })
        sendPluginMessage(
          {
            pluginMessage: {
              type: 'POST_MESSAGE',
              data: {
                type: 'SUCCESS',
                message: this.props.t('success.report'),
              },
            },
          },
          '*'
        )
      })
      .finally(() => this.setState({ isPrimaryActionLoading: false }))
      .catch((error: Error) => {
        console.error(error)
        sendPluginMessage(
          {
            pluginMessage: {
              type: 'POST_MESSAGE',
              data: {
                type: 'ERROR',
                message: this.props.t('error.generic'),
              },
            },
          },
          '*'
        )
      })
  } // Render
  render() {
    return (
      <Feature
        isActive={Report.features(
          this.props.planStatus,
          this.props.config,
          this.props.service,
          this.props.editor
        ).INVOLVE_ISSUES.isActive()}
      >
        <Dialog
          title={this.props.t('report.title')}
          pin="RIGHT"
          actions={{
            primary: {
              label: this.props.t('report.cta'),
              state: (() => {
                if (this.state.userMessage === '') return 'DISABLED'
                if (this.state.isPrimaryActionLoading) return 'LOADING'

                return 'DEFAULT'
              })(),
              action: this.reportHandler,
            },
          }}
          onClose={this.props.onClose}
        >
          <div className="dialog__form">
            <div className="dialog__form__item">
              <FormItem
                label={this.props.t('report.fullName.label')}
                id="type-fullname"
                shouldFill
              >
                <Input
                  type="TEXT"
                  id="type-fullname"
                  value={this.state.userFullName}
                  isAutoFocus
                  placeholder={this.props.t('report.fullName.placeholder')}
                  onChange={(e) =>
                    this.setState({
                      userFullName: (e.target as HTMLInputElement).value,
                    })
                  }
                />
              </FormItem>
            </div>
            <div className="dialog__form__item">
              <FormItem
                label={this.props.t('report.email.label')}
                id="type-email"
                shouldFill
              >
                <Input
                  type="TEXT"
                  id="type-email"
                  value={this.state.userEmail}
                  placeholder={this.props.t('report.email.placeholder')}
                  onChange={(e) =>
                    this.setState({
                      userEmail: (e.target as HTMLInputElement).value,
                    })
                  }
                />
              </FormItem>
            </div>
            <div className="dialog__form__item">
              <FormItem
                label={this.props.t('report.message.label')}
                id="type-message"
                shouldFill
                isMultiLine
              >
                <Input
                  type="LONG_TEXT"
                  id="type-message"
                  placeholder={this.props.t('report.message.placeholder')}
                  value={this.state.userMessage}
                  isGrowing
                  onChange={(e) =>
                    this.setState({
                      userMessage: (e.target as HTMLInputElement).value,
                    })
                  }
                />
              </FormItem>
            </div>
          </div>
        </Dialog>
      </Feature>
    )
  }
}
