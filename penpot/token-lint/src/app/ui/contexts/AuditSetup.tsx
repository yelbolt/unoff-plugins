import { PureComponent } from 'preact/compat'
import { FeatureStatus } from '@unoff/utils'
import {
  Bar,
  Button,
  Layout,
  Section,
  SectionTitle,
  Select,
  SemanticMessage,
  SimpleItem,
} from '@unoff/ui'
import { WithTranslationProps } from '../components/WithTranslation'
import { WithConfigProps } from '../components/WithConfig'
import { sendPluginMessage } from '../../utils/pluginMessage'
import { TokenCategory } from '../../types/tokens'
import { AuditOptions, AuditScopeKind, RunAuditRequest } from '../../types/audit'
import { BaseProps, Editor, PlanStatus, Service } from '../../types/app'
import {
  $auditRequest,
  $auditStatus,
  $auditProgress,
  $selectionCount,
} from '../../stores/audit'
import { ConfigContextType } from '../../config/ConfigContext'

interface AuditSetupProps
  extends BaseProps, WithConfigProps, WithTranslationProps {
  //
}

interface AuditSetupState {
  scope: AuditScopeKind
  categories: Array<TokenCategory>
  excludeHidden: boolean
  excludeLocked: boolean
  excludeOffBoard: boolean
  selectionCount: number
  isSubmitting: boolean
  wasCancelled: boolean
  cancelledScannedShapes: number
  hadError: boolean
}

const ALL_CATEGORIES: Array<TokenCategory> = [
  'color',
  'spacing',
  'radius',
  'typography',
  'dimension',
]

export default class AuditSetup extends PureComponent<
  AuditSetupProps,
  AuditSetupState
> {
  private unsubscribeSelectionCount: (() => void) | undefined

  static features = (
    planStatus: PlanStatus,
    config: ConfigContextType,
    service: Service,
    editor: Editor
  ) => ({
    RUN_AUDIT: new FeatureStatus({
      features: config.features,
      featureName: 'RUN_AUDIT',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
  })

  private get features() {
    return AuditSetup.features(
      this.props.planStatus,
      this.props.config,
      this.props.service,
      this.props.editor
    )
  }

  constructor(props: AuditSetupProps) {
    super(props)
    const lastRequest = $auditRequest.get()
    const currentStatus = $auditStatus.get()
    const wasCancelled = currentStatus === 'CANCELLED'
    this.state = {
      scope: lastRequest?.scope.kind ?? 'PAGE',
      categories: lastRequest?.categories ?? ALL_CATEGORIES,
      excludeHidden: lastRequest?.options.excludeHidden ?? false,
      excludeLocked: lastRequest?.options.excludeLocked ?? false,
      excludeOffBoard: lastRequest?.options.excludeOffBoard ?? false,
      selectionCount: $selectionCount.get(),
      isSubmitting: false,
      wasCancelled,
      cancelledScannedShapes: wasCancelled
        ? ($auditProgress.get()?.scannedShapes ?? 0)
        : 0,
      hadError: currentStatus === 'ERROR',
    }
  }

  // Lifecycle
  componentDidMount = () => {
    this.unsubscribeSelectionCount = $selectionCount.subscribe((value) => {
      this.setState((previous) => ({
        selectionCount: value,
        scope:
          previous.scope === 'SELECTION' && value === 0 ? 'PAGE' : previous.scope,
      }))
    })
  }

  componentWillUnmount = () => {
    if (this.unsubscribeSelectionCount) this.unsubscribeSelectionCount()
  }

  // Handlers
  handleScopeChange = (e: Event) =>
    this.setState({
      scope: (e.currentTarget as HTMLInputElement).value as AuditScopeKind,
    })

  handleCategoryToggle = (category: TokenCategory) => () => {
    this.setState((previous) => ({
      categories: previous.categories.includes(category)
        ? previous.categories.filter((selected) => selected !== category)
        : [...previous.categories, category],
    }))
  }

  handleToggleExcludeHidden = () =>
    this.setState((previous) => ({ excludeHidden: !previous.excludeHidden }))

  handleToggleExcludeLocked = () =>
    this.setState((previous) => ({ excludeLocked: !previous.excludeLocked }))

  handleToggleExcludeOffBoard = () =>
    this.setState((previous) => ({ excludeOffBoard: !previous.excludeOffBoard }))

  handleRunAudit = () => {
    const options: AuditOptions = {
      excludeHidden: this.state.excludeHidden,
      excludeLocked: this.state.excludeLocked,
      excludeOffBoard: this.state.excludeOffBoard,
    }
    const request: RunAuditRequest = {
      scope: { kind: this.state.scope },
      categories: this.state.categories,
      options,
    }

    this.setState({ isSubmitting: true })
    $auditRequest.set(request)
    sendPluginMessage(
      {
        pluginMessage: { type: 'RUN_AUDIT', data: request },
      },
      '*'
    )
  }

  // Render
  render() {
    const { t } = this.props
    const {
      scope,
      categories,
      excludeHidden,
      excludeLocked,
      excludeOffBoard,
      selectionCount,
      isSubmitting,
      wasCancelled,
      cancelledScannedShapes,
      hadError,
    } = this.state

    return (
      <Layout
        id="audit-setup"
        column={[
          {
            node: (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                }}
              >
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {wasCancelled && (
                    <SemanticMessage
                      type="WARNING"
                      message={t('tokenLint.setup.cancelledNotice', {
                        count: cancelledScannedShapes,
                      })}
                      isAnchored
                    />
                  )}
                  {hadError && (
                    <SemanticMessage
                      type="ERROR"
                      message={t('tokenLint.setup.auditFailedNotice')}
                      isAnchored
                    />
                  )}
                  <Section
                    title={
                      <SimpleItem
                        leftPartSlot={
                          <SectionTitle
                            label={t('tokenLint.setup.scope.title')}
                          />
                        }
                        isListItem={false}
                        alignment="CENTER"
                      />
                    }
                    body={[
                      {
                        node: (
                          <Select
                            id="scope-selection"
                            type="RADIO_BUTTON"
                            name="scope"
                            value="SELECTION"
                            label={t('tokenLint.setup.scope.selection')}
                            isChecked={scope === 'SELECTION'}
                            isDisabled={selectionCount === 0}
                            action={this.handleScopeChange}
                          />
                        ),
                        spacingModifier: 'LARGE',
                      },
                      {
                        node: (
                          <Select
                            id="scope-page"
                            type="RADIO_BUTTON"
                            name="scope"
                            value="PAGE"
                            label={t('tokenLint.setup.scope.page')}
                            isChecked={scope === 'PAGE'}
                            action={this.handleScopeChange}
                          />
                        ),
                        spacingModifier: 'LARGE',
                      },
                      {
                        node: (
                          <Select
                            id="scope-document"
                            type="RADIO_BUTTON"
                            name="scope"
                            value="DOCUMENT"
                            label={t('tokenLint.setup.scope.document')}
                            isChecked={scope === 'DOCUMENT'}
                            action={this.handleScopeChange}
                          />
                        ),
                        spacingModifier: 'LARGE',
                      },
                    ]}
                    border={['BOTTOM']}
                  />
                  <Section
                    title={
                      <SimpleItem
                        leftPartSlot={
                          <SectionTitle
                            label={t('tokenLint.setup.category.title')}
                          />
                        }
                        isListItem={false}
                        alignment="CENTER"
                      />
                    }
                    body={ALL_CATEGORIES.map((category) => ({
                      node: (
                        <Select
                          key={category}
                          id={`category-${category}`}
                          type="CHECK_BOX"
                          name="categories"
                          value={category}
                          label={t(`tokenLint.setup.category.${category}`)}
                          isChecked={categories.includes(category)}
                          action={this.handleCategoryToggle(category)}
                        />
                      ),
                      spacingModifier: 'LARGE',
                    }))}
                    border={['BOTTOM']}
                  />
                  <Section
                    title={
                      <SimpleItem
                        leftPartSlot={
                          <SectionTitle
                            label={t('tokenLint.setup.options.title')}
                          />
                        }
                        isListItem={false}
                        alignment="CENTER"
                      />
                    }
                    body={[
                      {
                        node: (
                          <Select
                            id="exclude-hidden"
                            type="SWITCH_BUTTON"
                            label={t('tokenLint.setup.options.excludeHidden')}
                            helper={{
                              label: t(
                                'tokenLint.setup.options.excludeHiddenHelper'
                              ),
                            }}
                            isChecked={excludeHidden}
                            action={this.handleToggleExcludeHidden}
                          />
                        ),
                        spacingModifier: 'LARGE',
                      },
                      {
                        node: (
                          <Select
                            id="exclude-locked"
                            type="SWITCH_BUTTON"
                            label={t('tokenLint.setup.options.excludeLocked')}
                            helper={{
                              label: t(
                                'tokenLint.setup.options.excludeLockedHelper'
                              ),
                            }}
                            isChecked={excludeLocked}
                            action={this.handleToggleExcludeLocked}
                          />
                        ),
                        spacingModifier: 'LARGE',
                      },
                      {
                        node: (
                          <Select
                            id="exclude-offboard"
                            type="SWITCH_BUTTON"
                            label={t('tokenLint.setup.options.excludeOffBoard')}
                            helper={{
                              label: t(
                                'tokenLint.setup.options.excludeOffBoardHelper'
                              ),
                              type: 'MULTI_LINE',
                            }}
                            isChecked={excludeOffBoard}
                            action={this.handleToggleExcludeOffBoard}
                          />
                        ),
                        spacingModifier: 'LARGE',
                      },
                    ]}
                  />
                </div>
                <Bar
                  rightPartSlot={
                    <Button
                      type="primary"
                      icon="search-large"
                      label={t('tokenLint.setup.cta.runAudit')}
                      isDisabled={categories.length === 0 || isSubmitting}
                      isLoading={isSubmitting}
                      isNew={this.features.RUN_AUDIT.isNew()}
                      action={this.handleRunAudit}
                    />
                  }
                  border={['TOP']}
                />
              </div>
            ),
            typeModifier: 'BLANK',
          },
        ]}
        isFullHeight
        isFullWidth
      />
    )
  }
}
