import { PureComponent } from 'preact/compat'
import { FeatureStatus, doClassnames } from '@unoff/utils'
import { Bar, Button, Icon, layouts, SectionTitle, texts } from '@unoff/ui'
import AuditSetup from '../contexts/AuditSetup'
import AuditReport from '../contexts/AuditReport'
import { WithTranslationProps } from '../components/WithTranslation'
import { WithConfigProps } from '../components/WithConfig'
import Feature from '../components/Feature'
import { sendPluginMessage } from '../../utils/pluginMessage'
import { AuditProgress } from '../../types/audit'
import { BaseProps, Editor, PlanStatus, Service } from '../../types/app'
import {
  $auditProgress,
  $auditStatus,
  AuditStatus,
  resetAuditToSetup,
} from '../../stores/audit'
import { ConfigContextType } from '../../config/ConfigContext'

interface AuditServiceProps
  extends BaseProps, WithConfigProps, WithTranslationProps {
  //
}

type AuditView = 'SETUP' | 'RUNNING' | 'REPORT'

interface AuditServiceState {
  status: AuditStatus
  progress: AuditProgress | null
}

export default class AuditService extends PureComponent<
  AuditServiceProps,
  AuditServiceState
> {
  private unsubscribeStatus: (() => void) | undefined
  private unsubscribeProgress: (() => void) | undefined

  static features = (
    planStatus: PlanStatus,
    config: ConfigContextType,
    service: Service,
    editor: Editor
  ) => ({
    AUDIT_SETUP: new FeatureStatus({
      features: config.features,
      featureName: 'AUDIT_SETUP',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    AUDIT_REPORT: new FeatureStatus({
      features: config.features,
      featureName: 'AUDIT_REPORT',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
  })

  private get features() {
    return AuditService.features(
      this.props.planStatus,
      this.props.config,
      this.props.service,
      this.props.editor
    )
  }

  constructor(props: AuditServiceProps) {
    super(props)
    this.state = {
      status: $auditStatus.get(),
      progress: $auditProgress.get(),
    }
  }

  // Lifecycle
  componentDidMount = () => {
    this.unsubscribeStatus = $auditStatus.subscribe((value) =>
      this.setState({ status: value })
    )
    this.unsubscribeProgress = $auditProgress.subscribe((value) =>
      this.setState({ progress: value })
    )
  }

  componentWillUnmount = () => {
    if (this.unsubscribeStatus) this.unsubscribeStatus()
    if (this.unsubscribeProgress) this.unsubscribeProgress()
  }

  // Handlers
  handleCancel = () =>
    sendPluginMessage(
      {
        pluginMessage: { type: 'CANCEL_AUDIT' },
      },
      '*'
    )

  handleBackToSetup = () => resetAuditToSetup()

  // Direct
  deriveView = (status: AuditStatus): AuditView => {
    switch (status) {
      case 'RUNNING':
        return 'RUNNING'
      case 'COMPLETED':
        return 'REPORT'
      default:
        return 'SETUP'
    }
  }

  // Render
  render() {
    const view = this.deriveView(this.state.status)
    const { progress } = this.state

    let title = this.props.t('tokenLint.service.title.setup')
    if (view === 'RUNNING') title = this.props.t('tokenLint.service.title.running')
    if (view === 'REPORT') title = this.props.t('tokenLint.service.title.report')

    let fragment
    switch (view) {
      case 'SETUP': {
        fragment = (
          <Feature isActive={this.features.AUDIT_SETUP.isActive()}>
            <AuditSetup {...this.props} />
          </Feature>
        )
        break
      }
      case 'RUNNING': {
        fragment = (
          <div
            className={layouts.centered}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--size-pos-xsmall)',
            }}
          >
            <Icon type="PICTO" iconName="spinner" />
            <span className={texts.type}>
              {this.props.t('tokenLint.running.progress', {
                scanned: progress?.scannedShapes ?? 0,
                total: progress?.totalShapesEstimate ?? 0,
              })}
            </span>
            <span className={doClassnames([texts.type, texts['type--secondary']])}>
              {this.props.t('tokenLint.running.deviations', {
                count: progress?.deviationsFoundSoFar ?? 0,
              })}
            </span>
          </div>
        )
        break
      }
      case 'REPORT': {
        fragment = (
          <Feature isActive={this.features.AUDIT_REPORT.isActive()}>
            <AuditReport {...this.props} />
          </Feature>
        )
        break
      }
    }

    return (
      <>
        <Bar
          leftPartSlot={
            <div className={layouts.snackbar}>
              {view === 'REPORT' && (
                <Button
                  type="icon"
                  icon="back"
                  helper={{ label: this.props.t('tokenLint.service.cta.back') }}
                  action={this.handleBackToSetup}
                />
              )}
              <SectionTitle
                label={title}
                indicator={
                  view === 'RUNNING' ? progress?.scannedShapes : undefined
                }
              />
            </div>
          }
          rightPartSlot={
            view === 'RUNNING' ? (
              <Button
                type="secondary"
                label={this.props.t('tokenLint.service.cta.cancel')}
                action={this.handleCancel}
              />
            ) : undefined
          }
          border={['BOTTOM']}
        />
        <section className="context">{fragment}</section>
      </>
    )
  }
}
