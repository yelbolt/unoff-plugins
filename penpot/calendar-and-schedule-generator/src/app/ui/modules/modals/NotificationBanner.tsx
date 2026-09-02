import React from 'react'
import { PureComponent } from 'preact/compat'
import { FeatureStatus } from '@unoff/utils'
import { Notification } from '@unoff/ui'
import { WithTranslationProps } from '../../components/WithTranslation'
import { WithConfigProps } from '../../components/WithConfig'
import Feature from '../../components/Feature'
import { NotificationMessage } from '../../../types/messages'
import { BaseProps, Editor, PlanStatus, Service } from '../../../types/app'
import { ConfigContextType } from '../../../config/ConfigContext'

interface NotificationBannerProps
  extends BaseProps, WithConfigProps, WithTranslationProps {
  notification: NotificationMessage
  onClose: React.ChangeEventHandler<HTMLInputElement> & (() => void)
}

export default class NotificationBanner extends PureComponent<NotificationBannerProps> {
  static features = (
    planStatus: PlanStatus,
    config: ConfigContextType,
    service: Service,
    editor: Editor
  ) => ({
    NOTIFICATIONS: new FeatureStatus({
      features: config.features,
      featureName: 'NOTIFICATIONS',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
  })

  // Render
  render() {
    return (
      <Feature
        isActive={NotificationBanner.features(
          this.props.planStatus,
          this.props.config,
          this.props.service,
          this.props.editor
        ).NOTIFICATIONS.isActive()}
      >
        <Notification
          type={this.props.notification.type || 'INFO'}
          message={this.props.notification.message}
          timer={this.props.notification.timer}
          onClose={this.props.onClose}
        />
      </Feature>
    )
  }
}
