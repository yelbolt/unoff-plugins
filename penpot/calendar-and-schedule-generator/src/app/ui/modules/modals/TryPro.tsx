import React from 'react'
import { PureComponent } from 'preact/compat'
import { FeatureStatus } from '@unoff/utils'
import { Dialog, texts } from '@unoff/ui'
import { WithTranslationProps } from '../../components/WithTranslation'
import { WithConfigProps } from '../../components/WithConfig'
import Feature from '../../components/Feature'
import { sendPluginMessage } from '../../../utils/pluginMessage'
import { BaseProps, Editor, PlanStatus, Service } from '../../../types/app'
import tp from '../../../content/images/try_pro.webp'
import { ConfigContextType } from '../../../config/ConfigContext'

interface TryProProps extends BaseProps, WithConfigProps, WithTranslationProps {
  onClose: React.ChangeEventHandler<HTMLInputElement> & (() => void)
}

export default class TryPro extends PureComponent<TryProProps> {
  static features = (
    planStatus: PlanStatus,
    config: ConfigContextType,
    service: Service,
    editor: Editor
  ) => ({
    PRO_PLAN: new FeatureStatus({
      features: config.features,
      featureName: 'PRO_PLAN',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
  })

  // Render
  render() {
    return (
      <Feature
        isActive={TryPro.features(
          this.props.planStatus,
          this.props.config,
          this.props.service,
          this.props.editor
        ).PRO_PLAN.isActive()}
      >
        <Dialog
          title={this.props.t('proPlan.trial.title', {
            hours: this.props.config.plan.trialTime.toString(),
          })}
          actions={{
            primary: {
              label: this.props.t('proPlan.trial.cta', {
                hours: this.props.config.plan.trialTime.toString(),
              }),
              action: () =>
                sendPluginMessage(
                  {
                    pluginMessage: {
                      type: 'ENABLE_TRIAL',
                      data: {
                        trialTime: this.props.config.plan.trialTime,
                        trialVersion: this.props.config.versions.trialVersion,
                      },
                    },
                  },
                  '*'
                ),
            },
            secondary: {
              label: this.props.t('proPlan.trial.option'),
              action: () =>
                sendPluginMessage({ pluginMessage: { type: 'GET_PRO' } }, '*'),
            },
          }}
          onClose={this.props.onClose}
        >
          <div className="dialog__cover">
            <img
              src={tp}
              style={{
                width: '100%',
              }}
            />
          </div>
          <div className="dialog__text">
            <p className={texts.type}>
              {this.props.t('proPlan.trial.message', {
                hours: this.props.config.plan.trialTime.toString(),
              })}
            </p>
          </div>
        </Dialog>
      </Feature>
    )
  }
}
