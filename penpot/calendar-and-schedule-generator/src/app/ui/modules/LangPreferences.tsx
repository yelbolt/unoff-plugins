import { PureComponent } from 'preact/compat'
import { FeatureStatus } from '@unoff/utils'
import {
  Dropdown,
  FormItem,
  Section,
  SectionTitle,
  SimpleItem,
} from '@unoff/ui'
import { TolgeeInstance, useTolgee } from '@tolgee/react'
import { WithTranslationProps } from '../components/WithTranslation'
import { WithConfigProps } from '../components/WithConfig'
import Feature from '../components/Feature'
import { sendPluginMessage } from '../../utils/pluginMessage'
import { Language } from '../../types/translations'
import { BaseProps, Editor, PlanStatus, Service } from '../../types/app'
import { updateUserConsent } from '../../stores/consent'
import { trackLanguageEvent } from '../../external/tracking/eventsTracker'
import { ConfigContextType } from '../../config/ConfigContext'

interface LangPreferencesProps
  extends BaseProps, WithConfigProps, WithTranslationProps {
  isLast?: boolean
}

interface LangPreferencesState {
  userLanguage: Language
}

export default class LangPreferences extends PureComponent<
  LangPreferencesProps,
  LangPreferencesState
> {
  static features = (
    planStatus: PlanStatus,
    config: ConfigContextType,
    service: Service,
    editor: Editor
  ) => ({
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
  })

  static defaultProps = {
    isLast: false,
  }

  constructor(props: LangPreferencesProps) {
    super(props)
  }

  // Handlers
  changeUserLanguageHandler = (lang: Language, tolgee: TolgeeInstance) => {
    tolgee.changeLanguage(lang).then(() => {
      updateUserConsent(this.props.t)
    })

    sendPluginMessage(
      {
        pluginMessage: {
          type: 'UPDATE_LANGUAGE',
          data: {
            lang: lang,
          },
        },
      },
      '*'
    )

    trackLanguageEvent(
      this.props.config.env.isMixpanelEnabled,
      this.props.userSession.id,
      this.props.userIdentity.id,
      this.props.planStatus,
      this.props.userConsent.find((consent) => consent.id === 'mixpanel')
        ?.isConsented ?? false,
      { lang: lang }
    )
  }

  // Render
  render() {
    const tolgee = useTolgee(['language'])

    return (
      <Feature
        isActive={LangPreferences.features(
          this.props.planStatus,
          this.props.config,
          this.props.service,
          this.props.editor
        ).USER_LANGUAGE.isActive()}
      >
        <Section
          title={
            <SimpleItem
              leftPartSlot={
                <SectionTitle label={this.props.t('user.language.title')} />
              }
              isListItem={false}
              alignment="CENTER"
            />
          }
          body={[
            {
              node: (
                <FormItem
                  id="user-language"
                  label={this.props.t('user.language.label')}
                  shouldFill
                >
                  <Dropdown
                    id="user-language"
                    options={[
                      {
                        label: this.props.t('user.language.englishUS'),
                        value: 'en-US',
                        type: 'OPTION' as const,
                        isActive: LangPreferences.features(
                          this.props.planStatus,
                          this.props.config,
                          this.props.service,
                          this.props.editor
                        ).USER_LANGUAGE_EN_US.isActive(),
                        isBlocked: LangPreferences.features(
                          this.props.planStatus,
                          this.props.config,
                          this.props.service,
                          this.props.editor
                        ).USER_LANGUAGE_EN_US.isBlocked(),
                        isNew: LangPreferences.features(
                          this.props.planStatus,
                          this.props.config,
                          this.props.service,
                          this.props.editor
                        ).USER_LANGUAGE_EN_US.isNew(),
                        action: () =>
                          this.changeUserLanguageHandler('en-US', tolgee),
                      },
                      {
                        label: this.props.t('user.language.frenchFR'),
                        value: 'fr-FR',
                        type: 'OPTION' as const,
                        isActive: LangPreferences.features(
                          this.props.planStatus,
                          this.props.config,
                          this.props.service,
                          this.props.editor
                        ).USER_LANGUAGE_FR_FR.isActive(),
                        isBlocked: LangPreferences.features(
                          this.props.planStatus,
                          this.props.config,
                          this.props.service,
                          this.props.editor
                        ).USER_LANGUAGE_FR_FR.isBlocked(),
                        isNew: LangPreferences.features(
                          this.props.planStatus,
                          this.props.config,
                          this.props.service,
                          this.props.editor
                        ).USER_LANGUAGE_FR_FR.isNew(),
                        action: () =>
                          this.changeUserLanguageHandler('fr-FR', tolgee),
                      },
                    ]}
                    selected={tolgee.getLanguage() as Language}
                    isBlocked={LangPreferences.features(
                      this.props.planStatus,
                      this.props.config,
                      this.props.service,
                      this.props.editor
                    ).USER_LANGUAGE.isBlocked()}
                    isNew={LangPreferences.features(
                      this.props.planStatus,
                      this.props.config,
                      this.props.service,
                      this.props.editor
                    ).USER_LANGUAGE.isNew()}
                    isFill
                  />
                </FormItem>
              ),
            },
          ]}
          border={!this.props.isLast ? ['BOTTOM'] : undefined}
        />
      </Feature>
    )
  }
}
