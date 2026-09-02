import React from 'react'
import { PureComponent } from 'preact/compat'
import { FeatureStatus } from '@unoff/utils'
import { Dialog } from '@unoff/ui'
import { WithTranslationProps } from '../../components/WithTranslation'
import { WithConfigProps } from '../../components/WithConfig'
import Feature from '../../components/Feature'
import { BaseProps, Editor, PlanStatus, Service } from '../../../types/app'
import { ConfigContextType } from '../../../config/ConfigContext'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Tawk_API?: any
    Tawk_LoadStart?: Date
  }
}

interface ChatProps extends BaseProps, WithConfigProps, WithTranslationProps {
  onClose: React.ChangeEventHandler<HTMLInputElement> & (() => void)
}

export default class Chat extends PureComponent<ChatProps> {
  static features = (
    planStatus: PlanStatus,
    config: ConfigContextType,
    service: Service,
    editor: Editor
  ) => ({
    HELP_CHAT: new FeatureStatus({
      features: config.features,
      featureName: 'HELP_CHAT',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
  })

  componentDidMount() {
    const s1 = document.createElement('script')
    s1.async = true
    s1.src = 'https://embed.tawk.to/680b8b6e6b4e0c1911f5d5ad/1itj2ssvj'
    s1.charset = 'UTF-8'
    s1.setAttribute('crossorigin', '*')
    document.head.appendChild(s1)

    // Initialiser l'API Tawk
    window.Tawk_API = window.Tawk_API || {}
    window.Tawk_LoadStart = new Date()
    window.Tawk_API.embedded = 'tawk_680b8b6e6b4e0c1911f5d5ad'
  }

  // Render
  render() {
    return (
      <Feature
        isActive={Chat.features(
          this.props.planStatus,
          this.props.config,
          this.props.service,
          this.props.editor
        ).HELP_CHAT.isActive()}
      >
        <Dialog
          title={this.props.t('shortcuts.chat')}
          pin="RIGHT"
          onClose={this.props.onClose}
        >
          <div
            id="tawk_680b8b6e6b4e0c1911f5d5ad"
            style={{
              width: '100%',
              height: '100%',
            }}
          ></div>
        </Dialog>
      </Feature>
    )
  }
}
