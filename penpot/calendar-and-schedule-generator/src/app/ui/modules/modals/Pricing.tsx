import React from 'react'
import { PureComponent } from 'preact/compat'
import { doClassnames, FeatureStatus } from '@unoff/utils'
import { Button, Card, Dialog, layouts, texts } from '@unoff/ui'
import { WithTranslationProps } from '../../components/WithTranslation'
import { WithConfigProps } from '../../components/WithConfig'
import Feature from '../../components/Feature'
import { sendPluginMessage } from '../../../utils/pluginMessage'
import {
  BaseProps,
  Editor,
  Plans,
  PlanStatus,
  Service,
} from '../../../types/app'
import { trackPricingEvent } from '../../../external/tracking/eventsTracker'
import planb from '../../../content/images/pricing_plan_b.webp'
import plana from '../../../content/images/pricing_plan_a.webp'
import activate from '../../../content/images/pricing_activate_pro.webp'
import { ConfigContextType } from '../../../config/ConfigContext'

interface PricingProps
  extends BaseProps, WithConfigProps, WithTranslationProps {
  plans: Plans
  onClose: React.ChangeEventHandler<HTMLInputElement> & (() => void)
}

interface PricingState {
  myState: boolean
}

export default class Pricing extends PureComponent<PricingProps, PricingState> {
  private theme: string | null

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

  constructor(props: PricingProps) {
    super(props)
    this.theme = document.documentElement.getAttribute('data-theme')
    this.state = {
      myState: false,
    }
  }

  // Lifecycle
  componentDidMount() {
    trackPricingEvent(
      this.props.config.env.isMixpanelEnabled,
      this.props.userSession.id,
      this.props.userIdentity.id,
      this.props.planStatus,
      this.props.userConsent.find((consent) => consent.id === 'mixpanel')
        ?.isConsented ?? false,
      { feature: 'VIEW_PRICING' }
    )
  }

  // Templates
  PlanA = () => {
    return (
      <Card
        src={plana}
        title={this.props.t('pricing.planA.title')}
        subtitle={this.props.t('pricing.planA.subtitle')}
        richText={
          <span
            className={texts.type}
            dangerouslySetInnerHTML={{
              __html: this.props.t('pricing.planA.text'),
            }}
          />
        }
        actions={
          <Button
            type="primary"
            label={this.props.t('pricing.planA.cta')}
            action={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation()
              sendPluginMessage(
                {
                  pluginMessage: {
                    type: 'GO_TO_PLAN_A',
                  },
                },
                '*'
              )

              trackPricingEvent(
                this.props.config.env.isMixpanelEnabled,
                this.props.userSession.id,
                this.props.userIdentity.id,
                this.props.planStatus,
                this.props.userConsent.find(
                  (consent) => consent.id === 'mixpanel'
                )?.isConsented ?? false,
                { feature: 'GO_TO_PLAN_A' }
              )
            }}
          />
        }
        shouldFill
        action={() => {
          sendPluginMessage(
            {
              pluginMessage: {
                type: 'GO_TO_PLAN_A',
              },
            },
            '*'
          )

          trackPricingEvent(
            this.props.config.env.isMixpanelEnabled,
            this.props.userSession.id,
            this.props.userIdentity.id,
            this.props.planStatus,
            this.props.userConsent.find((consent) => consent.id === 'mixpanel')
              ?.isConsented ?? false,
            { feature: 'GO_TO_PLAN_A' }
          )
        }}
      />
    )
  }

  PlanB = () => {
    return (
      <Card
        src={planb}
        title={this.props.t('pricing.planB.title')}
        subtitle={this.props.t('pricing.planB.subtitle')}
        richText={
          <span
            className={texts.type}
            dangerouslySetInnerHTML={{
              __html: this.props.t('pricing.planB.text'),
            }}
          />
        }
        actions={
          <Button
            type="primary"
            label={this.props.t('pricing.planB.cta')}
            action={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation()
              sendPluginMessage(
                {
                  pluginMessage: {
                    type: 'GO_TO_PLAN_B',
                  },
                },
                '*'
              )

              trackPricingEvent(
                this.props.config.env.isMixpanelEnabled,
                this.props.userSession.id,
                this.props.userIdentity.id,
                this.props.planStatus,
                this.props.userConsent.find(
                  (consent) => consent.id === 'mixpanel'
                )?.isConsented ?? false,
                { feature: 'GO_TO_PLAN_B' }
              )
            }}
          />
        }
        shouldFill
        action={() => {
          sendPluginMessage(
            {
              pluginMessage: {
                type: 'GO_TO_PLAN_B',
              },
            },
            '*'
          )

          trackPricingEvent(
            this.props.config.env.isMixpanelEnabled,
            this.props.userSession.id,
            this.props.userIdentity.id,
            this.props.planStatus,
            this.props.userConsent.find((consent) => consent.id === 'mixpanel')
              ?.isConsented ?? false,
            { feature: 'GO_TO_PLAN_B' }
          )
        }}
      />
    )
  }

  Activate = () => {
    return (
      <Card
        src={activate}
        title={this.props.t('pricing.activate.title', {
          pluginName: this.props.config.information.pluginName,
        })}
        richText={
          <span className={texts.type}>
            {this.props.t('pricing.activate.text')}
          </span>
        }
        actions={
          <Button
            type="primary"
            label={this.props.t('pricing.activate.cta')}
            action={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation()
              sendPluginMessage(
                {
                  pluginMessage: {
                    type: 'GET_LICENSE',
                  },
                },
                '*'
              )
            }}
          />
        }
        shouldFill
        action={() => {
          sendPluginMessage(
            {
              pluginMessage: {
                type: 'GET_LICENSE',
              },
            },
            '*'
          )
        }}
      />
    )
  }

  // Render
  render() {
    let padding

    switch (this.theme) {
      case 'figma':
        padding = 'var(--size-pos-xxsmall)'
        break
      case 'penpot':
        padding = 'var(--size-pos-xxsmall) var(--size-pos-small)'
        break
      case 'sketch':
        padding = 'var(--size-pos-xxsmall) var(--size-pos-small)'
        break
      case 'framer':
        padding = 'var(--size-pos-xmsmall) var(--size-pos-xmsmall)'
        break
      default:
        padding = 'var(--size-pos-xxsmall)'
    }

    return (
      <Feature
        isActive={Pricing.features(
          this.props.planStatus,
          this.props.config,
          this.props.service,
          this.props.editor
        ).PRO_PLAN.isActive()}
      >
        <Dialog
          title={this.props.t('pricing.title', {
            pluginName: this.props.config.information.pluginName,
          })}
          onClose={this.props.onClose}
        >
          <div
            className={doClassnames([
              layouts['stackbar'],
              layouts['stackbar--tight'],
            ])}
            style={{
              padding: padding,
              alignItems: 'stretch',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection:
                  this.props.documentWidth <= 460 ? 'column' : 'row',
                gap: 'var(--size-pos-xxxsmall)',
                flex: 1,
              }}
            >
              {this.props.plans.map((plan) => {
                switch (plan) {
                  case 'PLAN_A':
                    return <this.PlanA />
                  case 'PLAN_B':
                    return <this.PlanB />
                  case 'ACTIVATE':
                    return <this.Activate />
                  default:
                    return null
                }
              })}
            </div>
          </div>
        </Dialog>
      </Feature>
    )
  }
}
