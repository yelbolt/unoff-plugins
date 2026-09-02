import React from 'react'
import { PureComponent } from 'preact/compat'
import { doClassnames, FeatureStatus } from '@unoff/utils'
import {
  Dialog,
  Layout,
  layouts,
  Section,
  SectionTitle,
  SimpleItem,
  texts,
} from '@unoff/ui'
import Icon from '../Icon'
import { WithTranslationProps } from '../../components/WithTranslation'
import { WithConfigProps } from '../../components/WithConfig'
import Feature from '../../components/Feature'
import { BaseProps, Editor, PlanStatus, Service } from '../../../types/app'
import { ConfigContextType } from '../../../config/ConfigContext'

interface AboutProps extends BaseProps, WithConfigProps, WithTranslationProps {
  onClose: React.ChangeEventHandler<HTMLInputElement> & (() => void)
}

export default class About extends PureComponent<AboutProps> {
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

  // Templates
  QuickInfo = () => {
    return (
      <Section
        body={[
          {
            node: (
              <div className={layouts['stackbar--medium']}>
                <div className={layouts['snackbar--large']}>
                  <Icon size={32} />
                  <div>
                    <span
                      className={doClassnames([
                        texts.type,
                        texts['type--xlarge'],
                      ])}
                    >
                      {this.props.config.information.pluginName}
                    </span>
                    <div className={layouts.snackbar}>
                      <span className={texts.type}>
                        {this.props.t('about.information.version', {
                          version: this.props.config.versions.pluginVersion,
                        })}
                      </span>
                      <Feature
                        isActive={
                          About.features(
                            this.props.planStatus,
                            this.props.config,
                            this.props.service,
                            this.props.editor
                          ).PRO_PLAN.isActive() &&
                          this.props.config.plan.isProEnabled
                        }
                      >
                        <span className={texts.type}>
                          {this.props.t('separator')}
                        </span>
                        {this.props.config.env.isDev ? (
                          <span className={texts.type}>
                            {this.props.t('plan.dev')}
                          </span>
                        ) : (
                          <span className={texts.type}>
                            {this.props.planStatus === 'UNPAID'
                              ? this.props.t('plan.free')
                              : this.props.planStatus === 'PAID' &&
                                  this.props.trialStatus === 'PENDING'
                                ? this.props.t('plan.trial')
                                : this.props.t('plan.pro')}
                          </span>
                        )}
                      </Feature>
                    </div>
                  </div>
                </div>
                <div className={layouts.stackbar}>
                  <span
                    className={texts.type}
                    dangerouslySetInnerHTML={{
                      __html: this.props.t(
                        'about.information.creator.sentence',
                        {
                          author: `<a href='${this.props.config.urls.authorUrl}' target='_blank' rel='noreferrer'>${this.props.config.information.authorName}</a>`,
                        }
                      ),
                    }}
                  />
                  <span className={texts.type}>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: this.props.t(
                          'about.information.sourceCode.sentence',
                          {
                            license: `<a href='${this.props.config.urls.licenseUrl}' target='_blank' rel='noreferrer'>${this.props.config.information.licenseName}</a>`,
                          }
                        ),
                      }}
                    />
                  </span>
                  <span className={texts.type}>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: this.props.t(
                          'about.information.contribution.sentence',
                          {
                            repository: `<a href='${this.props.config.urls.repositoryUrl}' target='_blank' rel='noreferrer'>${this.props.config.information.repositoryName}</a>`,
                          }
                        ),
                      }}
                    />
                  </span>
                </div>
              </div>
            ),
            spacingModifier: 'LARGE',
          },
        ]}
        border={['BOTTOM']}
      />
    )
  }

  Attributions = () => {
    const attributions = [
      {
        key: 'preact',
        template: 'about.attributions.preact.sentence',
        values: {
          preact: `<a href='https://preactjs.com/' target='_blank' rel='noreferrer'>${this.props.t('about.attributions.preact.preact')}</a>`,
        },
      },
      {
        key: 'supabase',
        template: 'about.attributions.supabase.sentence',
        values: {
          supabase: `<a href='https://supabase.com/' target='_blank' rel='noreferrer'>${this.props.t('about.attributions.supabase.supabase')}</a>`,
        },
      },
      {
        key: 'unoff',
        template: 'about.attributions.unoff.sentence',
        values: {
          unoff: `<a href='https://github.com/a-ng-d/unoff-ui' target='_blank' rel='noreferrer'>${this.props.t('about.attributions.unoff.unoff')}</a>`,
          author: `<a href='https://github.com/a-ng-d' target='_blank' rel='noreferrer'>${this.props.t('about.attributions.unoff.author')}</a>`,
        },
      },
      {
        key: 'vite',
        template: 'about.attributions.vite.sentence',
        values: {
          vite: `<a href='https://vitejs.dev/' target='_blank' rel='noreferrer'>${this.props.t('about.attributions.vite.vite')}</a>`,
        },
      },
    ]

    return (
      <Section
        title={
          <SimpleItem
            leftPartSlot={
              <SectionTitle label={this.props.t('about.attributions.title')} />
            }
            isListItem={false}
            alignment="CENTER"
          />
        }
        body={attributions.map((attr) => ({
          node: (
            <span
              className={texts.type}
              dangerouslySetInnerHTML={{
                __html: this.props.t(
                  attr.template,
                  attr.values as unknown as Record<string, string>
                ),
              }}
            />
          ),
          spacingModifier: 'LARGE',
        }))}
      />
    )
  }

  // Render
  render() {
    return (
      <Feature
        isActive={About.features(
          this.props.planStatus,
          this.props.config,
          this.props.service,
          this.props.editor
        ).PRO_PLAN.isActive()}
      >
        <Dialog
          title={this.props.t('about.title', {
            pluginName: this.props.config.information.pluginName,
          })}
          pin="RIGHT"
          onClose={this.props.onClose}
        >
          <Layout
            id="about"
            column={[
              {
                node: (
                  <>
                    <this.QuickInfo />
                    <this.Attributions />
                  </>
                ),
              },
            ]}
            isFullWidth
          />
        </Dialog>
      </Feature>
    )
  }
}
