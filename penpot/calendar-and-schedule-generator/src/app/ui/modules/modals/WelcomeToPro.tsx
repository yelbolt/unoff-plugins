import React from 'react'
import { PureComponent } from 'preact/compat'
import { FeatureStatus } from '@unoff/utils'
import { Dialog, texts } from '@unoff/ui'
import { WithTranslationProps } from '../../components/WithTranslation'
import { WithConfigProps } from '../../components/WithConfig'
import Feature from '../../components/Feature'
import { BaseProps, Editor, PlanStatus, Service } from '../../../types/app'
import wp from '../../../content/images/welcome_pro.webp'
import { ConfigContextType } from '../../../config/ConfigContext'

interface WelcomeToProProps
  extends BaseProps, WithConfigProps, WithTranslationProps {
  onClose: React.ChangeEventHandler<HTMLInputElement> & (() => void)
}

export default class WelcomeToPro extends PureComponent<WelcomeToProProps> {
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
        isActive={WelcomeToPro.features(
          this.props.planStatus,
          this.props.config,
          this.props.service,
          this.props.editor
        ).PRO_PLAN.isActive()}
      >
        <Dialog
          title={this.props.t('proPlan.welcome.title', {
            pluginName: this.props.config.information.pluginName,
          })}
          actions={{
            primary: {
              label: this.props.t('proPlan.welcome.cta'),
              isAutofocus: true,
              action: this.props.onClose,
            },
          }}
          onClose={this.props.onClose}
        >
          <div className="dialog__cover">
            <img
              src={wp}
              style={{
                width: '100%',
              }}
            />
          </div>
          <div className="dialog__text">
            <p className={texts.type}>
              {this.props.t('proPlan.welcome.message')}
            </p>
          </div>
        </Dialog>
      </Feature>
    )
  }
}
