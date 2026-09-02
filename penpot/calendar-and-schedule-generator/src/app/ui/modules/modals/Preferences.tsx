import React from 'react'
import { PureComponent } from 'preact/compat'
import { FeatureStatus } from '@unoff/utils'
import { Dialog, List } from '@unoff/ui'
import LangPreferences from '../LangPreferences'
import { WithTranslationProps } from '../../components/WithTranslation'
import { WithConfigProps } from '../../components/WithConfig'
import Feature from '../../components/Feature'
import { BaseProps, Editor, PlanStatus, Service } from '../../../types/app'
import { ConfigContextType } from '../../../config/ConfigContext'

interface PreferencesProps
  extends BaseProps, WithConfigProps, WithTranslationProps {
  onClose: React.ChangeEventHandler<HTMLInputElement> & (() => void)
}

export default class Preferences extends PureComponent<PreferencesProps> {
  private theme: string | null
  static features = (
    planStatus: PlanStatus,
    config: ConfigContextType,
    service: Service,
    editor: Editor
  ) => ({
    USER_PREFERENCES: new FeatureStatus({
      features: config.features,
      featureName: 'USER_PREFERENCES',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
  })

  constructor(props: PreferencesProps) {
    super(props)
    this.theme = document.documentElement.getAttribute('data-theme')
  }

  // Render
  render() {
    let padding

    switch (this.theme) {
      case 'figma':
        padding = '0'
        break
      case 'penpot':
        padding = '0 var(--size-pos-xxsmall)'
        break
      case 'sketch':
        padding = '0 var(--size-pos-xxsmall)'
        break
      case 'framer':
        padding = '0 var(--size-pos-xxxsmall)'
        break
      default:
        padding = 'var(--size-pos-xxsmall)'
    }

    return (
      <Feature
        isActive={Preferences.features(
          this.props.planStatus,
          this.props.config,
          this.props.service,
          this.props.editor
        ).USER_PREFERENCES.isActive()}
      >
        <Dialog
          title={this.props.t('user.updatePreferences')}
          pin="RIGHT"
          onClose={this.props.onClose}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
            }}
          >
            <List
              padding={padding}
              isFullWidth
              isFullHeight
            >
              <LangPreferences
                {...this.props}
                isLast={true}
              />
            </List>
          </div>
        </Dialog>
      </Feature>
    )
  }
}
