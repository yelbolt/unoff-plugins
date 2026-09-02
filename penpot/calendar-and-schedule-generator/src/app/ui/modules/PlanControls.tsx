import { PureComponent } from 'preact/compat'
import { doClassnames, FeatureStatus } from '@unoff/utils'
import { Button, Chip, IconChip, layouts, texts } from '@unoff/ui'
import { WithTranslationProps } from '../components/WithTranslation'
import { WithConfigProps } from '../components/WithConfig'
import Feature from '../components/Feature'
import { sendPluginMessage } from '../../utils/pluginMessage'
import { BaseProps, Editor, PlanStatus, Service } from '../../types/app'
import { $creditsCount } from '../../stores/credits'
import { getTolgee } from '../../external/translation'
import { ConfigContextType } from '../../config/ConfigContext'
import type { ComponentChildren } from 'preact'

interface PlanControlsState {
  creditsCount: number
}

interface PlanControlsProps
  extends BaseProps, WithConfigProps, WithTranslationProps {
  trialRemainingTime: number
  creditsRenewalDate: number
}

export default class PlanControls extends PureComponent<
  PlanControlsProps,
  PlanControlsState
> {
  private subscribeCredits: (() => void) | null = null

  static features = (
    planStatus: PlanStatus,
    config: ConfigContextType,
    service: Service,
    editor: Editor
  ) => ({
    INVOLVE_FEEDBACK: new FeatureStatus({
      features: config.features,
      featureName: 'INVOLVE_FEEDBACK',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    MY_FEE: new FeatureStatus({
      features: config.features,
      featureName: 'MY_FEE',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
  })

  constructor(props: PlanControlsProps) {
    super(props)
    this.state = {
      creditsCount: $creditsCount.value,
    }
  }

  // Lifecycle
  componentDidMount = () => {
    this.subscribeCredits = $creditsCount.subscribe((value) => {
      let adjustedValue = value
      if (adjustedValue < 0) adjustedValue = 0
      this.setState({ creditsCount: adjustedValue })
    })
  }

  componentWillUnmount = () => {
    if (this.subscribeCredits) this.subscribeCredits()
  }

  // Templates
  Fees = (): ComponentChildren => {
    return (
      <ul className="list-item">
        {PlanControls.features(
          this.props.planStatus,
          this.props.config,
          this.props.service,
          this.props.editor
        ).MY_FEE.isActive() && (
          <li>
            {this.props.t('plan.credits.fees.myFee', {
              fee: this.props.config.fees.myFee,
            })}
          </li>
        )}
      </ul>
    )
  }

  RemainingTime = () => (
    <div
      className={doClassnames([
        texts.type,
        texts['type--secondary'],
        texts['type--truncated'],
        layouts['snackbar--tight'],
      ])}
    >
      <span>{this.props.t('separator')}</span>
      {Math.ceil(this.props.trialRemainingTime) > 72 && (
        <span>
          {this.props.t('plan.trialTimeDays', {
            count:
              Math.ceil(this.props.trialRemainingTime) > 72
                ? Math.ceil(this.props.trialRemainingTime / 24).toString()
                : Math.ceil(this.props.trialRemainingTime).toString(),
          })}
        </span>
      )}
      {Math.ceil(this.props.trialRemainingTime) <= 72 &&
        Math.ceil(this.props.trialRemainingTime) >= 0 && (
          <span>
            {this.props.t('plan.trialTimeHours', {
              count: Math.ceil(this.props.trialRemainingTime).toString(),
            })}
          </span>
        )}
    </div>
  )

  RemainingCredits = () => {
    return (
      <Feature isActive={this.props.config.plan.isCreditsEnabled}>
        <div
          className={doClassnames([
            texts.type,
            texts['type--secondary'],
            layouts['snackbar--tight'],
          ])}
        >
          <span>{this.props.t('separator')}</span>
          <span>
            {this.props.t('plan.credits.amount', {
              count: Math.ceil(this.state.creditsCount).toString(),
            })}
          </span>
          <IconChip
            iconType="PICTO"
            iconName="info"
            text={this.Fees()}
            pin="TOP"
            type="MULTI_LINE"
          />
          {this.state.creditsCount === 0 && (
            <IconChip
              iconType="PICTO"
              iconName="warning"
              text={this.props.t('plan.credits.renew', {
                date: new Date(this.props.creditsRenewalDate).toLocaleString(
                  getTolgee().getLanguage(),
                  {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }
                ),
              })}
              pin="TOP"
              type="MULTI_LINE"
            />
          )}
        </div>
      </Feature>
    )
  }

  EndedTrial = () => (
    <div
      className={doClassnames([
        texts.type,
        texts['type--secondary'],
        layouts['snackbar--tight'],
      ])}
    >
      <span>{this.props.t('separator')}</span>
      <div className={doClassnames([texts['type--truncated']])}>
        <span>{this.props.t('plan.trialEnded')}</span>
      </div>
    </div>
  )

  trialFeedback = () => (
    <Feature
      isActive={PlanControls.features(
        this.props.planStatus,
        this.props.config,
        this.props.service,
        this.props.editor
      ).INVOLVE_FEEDBACK.isActive()}
    >
      <div
        className={doClassnames([
          texts.type,
          texts['type--secondary'],
          layouts['snackbar--tight'],
        ])}
      >
        <span>{this.props.t('separator')}</span>
        <Button
          type="tertiary"
          label={this.props.t('plan.trialFeedback')}
          isBlocked={PlanControls.features(
            this.props.planStatus,
            this.props.config,
            this.props.service,
            this.props.editor
          ).INVOLVE_FEEDBACK.isBlocked()}
          isNew={PlanControls.features(
            this.props.planStatus,
            this.props.config,
            this.props.service,
            this.props.editor
          ).INVOLVE_FEEDBACK.isNew()}
          action={() =>
            sendPluginMessage(
              {
                pluginMessage: {
                  type: 'OPEN_IN_BROWSER',
                  data: {
                    url: this.props.config.urls.trialFeedbackUrl,
                  },
                },
              },
              '*'
            )
          }
        />
      </div>
    </Feature>
  )

  FreePlan = () => (
    <div
      className={doClassnames([
        layouts['snackbar--tight'],
        layouts['snackbar--left'],
        layouts['snackbar--wrap'],
      ])}
    >
      <Button
        type="alternative"
        size="small"
        icon="lock-off"
        label={this.props.t('plan.getPro')}
        action={() =>
          sendPluginMessage({ pluginMessage: { type: 'GET_PRO' } }, '*')
        }
      />
      <Chip>{this.props.t('pricing.discount.amount')}</Chip>
      <this.RemainingCredits />
    </div>
  )

  TrialPlan = () => (
    <div
      className={doClassnames([
        layouts['snackbar--tight'],
        layouts['snackbar--left'],
        layouts['snackbar--wrap'],
      ])}
    >
      <Button
        type="alternative"
        size="small"
        icon="lock-off"
        label={this.props.t('plan.tryPro')}
        action={() => {
          this.props.config.plan.isTrialEnabled
            ? sendPluginMessage({ pluginMessage: { type: 'GET_TRIAL' } }, '*')
            : sendPluginMessage({ pluginMessage: { type: 'GET_PRO' } }, '*')
        }}
      />
      <this.RemainingCredits />
    </div>
  )

  PendingTrial = () => (
    <div
      className={doClassnames([
        layouts['snackbar--tight'],
        layouts['snackbar--left'],
        layouts['snackbar--wrap'],
      ])}
    >
      <Button
        type="alternative"
        size="small"
        icon="lock-off"
        label={this.props.t('plan.getPro')}
        action={() =>
          sendPluginMessage({ pluginMessage: { type: 'GET_PRO' } }, '*')
        }
      />
      <this.RemainingTime />
    </div>
  )

  ExpiredTrial = () => (
    <div
      className={doClassnames([
        layouts['snackbar--tight'],
        layouts['snackbar--left'],
        layouts['snackbar--wrap'],
      ])}
    >
      <Button
        type="alternative"
        size="small"
        icon="lock-off"
        label={this.props.t('plan.getPro')}
        action={() =>
          sendPluginMessage({ pluginMessage: { type: 'GET_PRO' } }, '*')
        }
      />
      <this.RemainingCredits />
      <this.EndedTrial />
      <this.trialFeedback />
    </div>
  )

  // Render
  render() {
    if (this.props.config.plan.isTrialEnabled)
      return (
        <div className={doClassnames(['pro-zone', layouts['snackbar--tight']])}>
          {this.props.trialStatus === 'UNUSED' &&
            this.props.planStatus === 'UNPAID' && <this.TrialPlan />}
          {this.props.trialStatus === 'PENDING' &&
            this.props.planStatus === 'PAID' && <this.PendingTrial />}
          {this.props.trialStatus === 'EXPIRED' &&
            this.props.planStatus === 'UNPAID' && <this.ExpiredTrial />}
        </div>
      )
    else if (this.props.config.plan.isProEnabled)
      return (
        <div className={doClassnames(['pro-zone', layouts['snackbar--tight']])}>
          {this.props.planStatus === 'UNPAID' &&
            this.props.trialStatus === 'UNUSED' && <this.FreePlan />}
        </div>
      )
    else return null
  }
}
