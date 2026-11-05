import { PureComponent } from 'preact/compat'
import { doClassnames } from '@unoff/utils'
import { FeatureStatus } from '@unoff/utils'
import {
  Button,
  Chip,
  Layout,
  Section,
  SectionTitle,
  SemanticMessage,
  Select,
  SimpleItem,
  layouts,
  texts,
} from '@unoff/ui'
import { WithTranslationProps } from '../components/WithTranslation'
import { WithConfigProps } from '../components/WithConfig'
import {
  LARGE_VOLUME_THRESHOLD,
  estimateContractVolume,
  estimateVisualVolume,
} from '../../utils/outputVolume'
import { formatContractSummary } from '../../utils/contractSummary'
import { copyWithNotice } from '../../utils/clipboard'
import {
  canDocumentFamily,
  getDocumentedItem,
  getSelectionBlocker,
  getTarget,
  getVariantCounts,
  isFamilyFiltered,
} from '../../utils/annotationRules'
import { sendAnnotationAction } from '../../utils/annotationActions'
import { buildAgentInstructions } from '../../utils/agentInstructions'
import { BaseProps, Editor, PlanStatus, Service } from '../../types/app'
import {
  ContractSettings,
  ContractStatus,
  DOC_VIEWS,
  DocTarget,
  DocView,
  Grouping,
  PartsDetail,
  SelectionDigest,
  contractKey,
} from '../../types/annotations'
import {
  $contractSettings,
  $docSettings,
  $documentationsStatus,
  $selection,
  DocSettings,
  updateDocSettings,
} from '../../stores/annotations'
import { ConfigContextType } from '../../config/ConfigContext'

interface DocumentProps
  extends BaseProps, WithConfigProps, WithTranslationProps {
  //
}

interface DocumentState {
  selection: SelectionDigest
  settings: DocSettings
  contracts: Array<ContractStatus>
  contractSettings: ContractSettings
}

const VIEW_KEYS: Record<DocView, string> = {
  ANATOMY: 'anatomy',
  VARIANTS: 'variants',
  PROPS: 'props',
  MEASUREMENTS: 'measurements',
  COLORS: 'colors',
}

const TARGETS: Array<DocTarget> = ['COMPONENT', 'FAMILY']

const LAYERS: Array<PartsDetail> = ['MAIN', 'ALL']

const GROUPINGS: Array<Grouping> = ['MERGED', 'SPLIT']

const MAX_LAYER_NAMES = 4

export default class Documentation extends PureComponent<
  DocumentProps,
  DocumentState
> {
  private unsubscribeSelection: (() => void) | undefined
  private unsubscribeSettings: (() => void) | undefined
  private unsubscribeContractSettings: (() => void) | undefined
  private unsubscribeStatus: (() => void) | undefined

  static features = (
    planStatus: PlanStatus,
    config: ConfigContextType,
    service: Service,
    editor: Editor
  ) => ({
    GENERATE_DOCUMENTATION: new FeatureStatus({
      features: config.features,
      featureName: 'GENERATE_DOCUMENTATION',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
  })

  constructor(props: DocumentProps) {
    super(props)
    this.state = {
      selection: $selection.get(),
      settings: $docSettings.get(),
      contracts: $documentationsStatus.get().contracts,
      contractSettings: $contractSettings.get(),
    }
  }

  // Lifecycle
  // Nothing is requested from the Canvas here: the stored contract of the
  // selection comes from the status list, which the Canvas already pushes.
  componentDidMount = () => {
    this.unsubscribeSelection = $selection.subscribe((value) =>
      this.setState({ selection: value })
    )
    this.unsubscribeSettings = $docSettings.subscribe((value) =>
      this.setState({ settings: value })
    )
    this.unsubscribeContractSettings = $contractSettings.subscribe((value) =>
      this.setState({ contractSettings: value })
    )
    this.unsubscribeStatus = $documentationsStatus.subscribe((value) =>
      this.setState({ contracts: value.contracts })
    )
  }

  componentWillUnmount = () => {
    if (this.unsubscribeSelection) this.unsubscribeSelection()
    if (this.unsubscribeSettings) this.unsubscribeSettings()
    if (this.unsubscribeContractSettings) this.unsubscribeContractSettings()
    if (this.unsubscribeStatus) this.unsubscribeStatus()
  }

  // Helpers
  getTarget = (): DocTarget =>
    getTarget(this.state.selection, this.state.settings)

  getStoredContract = (): ContractStatus | null => {
    const id = getDocumentedItem(this.state.selection)?.targetIds[
      this.getTarget()
    ]

    return id
      ? (this.state.contracts.find(
          (contract) => contract.key === contractKey(id)
        ) ?? null)
      : null
  }

  // Handlers
  handleOutputToggle = (output: 'documentation' | 'contract') => () =>
    updateDocSettings((previous) => ({
      outputs: {
        ...previous.outputs,
        [output]: !previous.outputs[output],
      },
    }))

  handleAutoUpdateToggle = () => {
    // Applies and persists as changed: no save button, no confirmation.
    const next: ContractSettings = {
      ...this.state.contractSettings,
      autoUpdate: !this.state.contractSettings.autoUpdate,
    }
    $contractSettings.set(next)
    sendAnnotationAction('SET_CONTRACT_SETTINGS', next)
  }

  // The copy follows CONTRACT_LOADED (handled in App.tsx).
  handleCopyContract = () => {
    const stored = this.getStoredContract()
    if (stored !== null)
      sendAnnotationAction('GET_CONTRACT', { key: stored.key })
  }

  handleCopyInstructions = () =>
    void copyWithNotice(
      buildAgentInstructions(),
      'handoff.copy.instructionsCopied',
      this.props.t
    )

  handleValueToggle = (property: string, value: string) => () =>
    updateDocSettings((previous) => {
      const hidden = previous.unticked[property] ?? []

      return {
        unticked: {
          ...previous.unticked,
          [property]: hidden.includes(value)
            ? hidden.filter((candidate) => candidate !== value)
            : [...hidden, value],
        },
      }
    })

  handlePropertyAll = (property: string) => () =>
    updateDocSettings((previous) => ({
      unticked: { ...previous.unticked, [property]: [] },
    }))

  handlePropertyNone = (property: string, values: Array<string>) => () =>
    updateDocSettings((previous) => ({
      unticked: { ...previous.unticked, [property]: [...values] },
    }))

  handleTargetChange = (target: DocTarget) => () =>
    updateDocSettings({ target })

  handleViewToggle = (view: DocView) => () =>
    updateDocSettings((previous) => ({
      views: previous.views.includes(view)
        ? previous.views.filter((selected) => selected !== view)
        : DOC_VIEWS.filter(
            (candidate) =>
              candidate === view || previous.views.includes(candidate)
          ),
    }))

  // Renders
  Hint = (props: { label: string }) => (
    <span className={doClassnames([texts.type, texts['type--secondary']])}>
      {props.label}
    </span>
  )

  // Secondary text under a control: offset to align with the label text.
  Description = (props: { label: string }) => (
    <div className="handoff-description">
      <this.Hint label={props.label} />
    </div>
  )

  Warning = (props: { message: string }) => (
    <SemanticMessage
      type="WARNING"
      message={props.message}
    />
  )

  VisualWarning = () => {
    const { t } = this.props
    const { selection, settings } = this.state
    const count = estimateVisualVolume(selection, settings)
    if (count < LARGE_VOLUME_THRESHOLD) return null

    const suggestions = [
      this.getTarget() === 'FAMILY'
        ? t('handoff.document.warning.fewerVariants')
        : null,
      settings.depth === 'ALL'
        ? t('handoff.document.warning.directLayers')
        : null,
    ].filter((part): part is string => part !== null)

    return (
      <this.Warning
        message={[
          t('handoff.document.warning.large', { count }),
          ...suggestions,
        ].join(' ')}
      />
    )
  }

  ContractWarning = () => {
    const { t } = this.props
    const count = estimateContractVolume(
      this.state.selection,
      this.state.settings
    )
    if (count < LARGE_VOLUME_THRESHOLD) return null

    return (
      <this.Warning
        message={[
          t('handoff.document.warning.large', { count }),
          t('handoff.document.warning.wholeFamily'),
        ].join(' ')}
      />
    )
  }

  LayersChoice = () => {
    const { t } = this.props
    const item = getDocumentedItem(this.state.selection)
    const names = item?.topLevelLayers ?? []

    const describe = (value: PartsDetail): string | null => {
      if (item === null) return null

      const root = item.componentName ?? item.name
      const count = value === 'ALL' ? item.nestedLayerCount : names.length

      if (count === 0) return t('handoff.document.layers.effect.none')
      if (value === 'ALL')
        return t('handoff.document.layers.effect.ALL', { count })

      const rest = names.length - MAX_LAYER_NAMES

      return t('handoff.document.layers.effect.MAIN', {
        count,
        root,
        names:
          names.slice(0, MAX_LAYER_NAMES).join(', ') +
          (rest > 0 ? `, +${rest}` : ''),
      })
    }

    return (
      <div
        role="radiogroup"
        aria-label={t('handoff.document.layers.title')}
        className={doClassnames([
          'handoff-suboption',
          layouts['stackbar--large'],
          layouts['stackbar--fill'],
        ])}
      >
        <this.Hint label={t('handoff.document.layers.title')} />
        {LAYERS.map((value) => {
          const description = describe(value)

          return (
            <div
              key={value}
              className={doClassnames([
                layouts['stackbar--tight'],
                layouts['stackbar--fill'],
              ])}
            >
              <Select
                id={`layers-${value}`}
                type="RADIO_BUTTON"
                name="layers"
                value={value}
                label={t(`handoff.document.layers.${value}`)}
                isChecked={this.state.settings.depth === value}
                action={() => updateDocSettings({ depth: value })}
              />
              {description !== null && <this.Description label={description} />}
            </div>
          )
        })}
      </div>
    )
  }

  TargetSection = () => {
    const { t } = this.props
    const item = getDocumentedItem(this.state.selection)
    const target = this.getTarget()

    return (
      <Section
        title={
          <SimpleItem
            leftPartSlot={
              <SectionTitle label={t('handoff.document.target.title')} />
            }
            isListItem={false}
            alignment="CENTER"
          />
        }
        body={[
          ...TARGETS.map((value) => ({
            node: (
              <Select
                key={value}
                id={`target-${value}`}
                type="RADIO_BUTTON"
                name="target"
                value={value}
                label={t(`handoff.document.target.${value}`)}
                isChecked={target === value}
                isDisabled={value === 'FAMILY' && !canDocumentFamily(item)}
                action={this.handleTargetChange(value)}
              />
            ),
            spacingModifier: 'LARGE' as const,
          })),
          ...(!canDocumentFamily(item)
            ? [
                {
                  node: (
                    <this.Description
                      label={t('handoff.document.target.noFamily')}
                    />
                  ),
                  spacingModifier: 'LARGE' as const,
                },
              ]
            : []),
        ]}
        border={['BOTTOM']}
      />
    )
  }

  VariantFilterSection = () => {
    const { t } = this.props
    const item = getDocumentedItem(this.state.selection)
    const { matching, total } = getVariantCounts(
      this.state.selection,
      this.state.settings
    )

    return (
      <Section
        title={
          <SimpleItem
            leftPartSlot={
              <SectionTitle label={t('handoff.document.variantFilter.title')} />
            }
            rightPartSlot={
              <this.Hint
                label={t('handoff.document.variantFilter.counter', {
                  matching,
                  total,
                })}
              />
            }
            isListItem={false}
            alignment="CENTER"
          />
        }
        body={(item?.variantProperties ?? []).map((property) => ({
          node: (
            <div
              key={property.name}
              className={doClassnames([
                layouts['stackbar--tight'],
                layouts['stackbar--fill'],
              ])}
            >
              <div
                className={layouts['snackbar--large']}
                style={{ justifyContent: 'space-between' }}
              >
                <this.Hint label={property.name} />
                <div className={layouts['snackbar--tight']}>
                  <Button
                    type="tertiary"
                    size="small"
                    label={t('handoff.document.variantFilter.all')}
                    action={this.handlePropertyAll(property.name)}
                  />
                  <span className={texts.type}>{t('separator')}</span>
                  <Button
                    type="tertiary"
                    size="small"
                    label={t('handoff.document.variantFilter.none')}
                    action={this.handlePropertyNone(
                      property.name,
                      property.values
                    )}
                  />
                </div>
              </div>
              <div
                className={doClassnames([
                  layouts['stackbar--tight'],
                  layouts['stackbar--fill'],
                ])}
              >
                {property.values.map((value) => (
                  <Select
                    key={value}
                    id={`variant-${property.name}-${value}`}
                    type="CHECK_BOX"
                    name={`variant-${property.name}`}
                    value={value}
                    label={value}
                    isChecked={
                      !(
                        this.state.settings.unticked[property.name] ?? []
                      ).includes(value)
                    }
                    action={this.handleValueToggle(property.name, value)}
                  />
                ))}
              </div>
            </div>
          ),
          spacingModifier: 'LARGE' as const,
        }))}
        border={['BOTTOM']}
      />
    )
  }

  ViewsSection = () => {
    const { t } = this.props
    const { views } = this.state.settings
    const isFamily = this.getTarget() === 'FAMILY'

    return (
      <Section
        title={
          <SimpleItem
            leftPartSlot={
              <SectionTitle label={t('handoff.document.views.title')} />
            }
            isListItem={false}
            alignment="CENTER"
          />
        }
        body={[
          ...DOC_VIEWS.filter(
            (view) => isFamily || (view !== 'VARIANTS' && view !== 'PROPS')
          ).map((view) => ({
            node: (
              <div
                key={view}
                className={doClassnames([
                  layouts['stackbar--large'],
                  layouts['stackbar--fill'],
                ])}
              >
                <div
                  className={doClassnames([
                    layouts['stackbar--tight'],
                    layouts['stackbar--fill'],
                  ])}
                >
                  <Select
                    id={`view-${view}`}
                    type="CHECK_BOX"
                    name="views"
                    value={view}
                    label={t(`handoff.document.views.${VIEW_KEYS[view]}.label`)}
                    isChecked={views.includes(view)}
                    action={this.handleViewToggle(view)}
                  />
                  <this.Description
                    label={t(
                      `handoff.document.views.${VIEW_KEYS[view]}.description`
                    )}
                  />
                </div>
                {view === 'ANATOMY' && views.includes('ANATOMY') && (
                  <this.LayersChoice />
                )}
              </div>
            ),
            spacingModifier: 'LARGE' as const,
          })),
          {
            node: this.VisualWarning(),
            spacingModifier: 'LARGE' as const,
          },
        ]}
        border={['BOTTOM']}
      />
    )
  }

  GroupingSection = () => {
    const { t } = this.props

    return (
      <Section
        title={
          <SimpleItem
            leftPartSlot={
              <SectionTitle label={t('handoff.document.grouping.title')} />
            }
            isListItem={false}
            alignment="CENTER"
          />
        }
        body={GROUPINGS.map((value) => ({
          node: (
            <div
              key={value}
              className={doClassnames([
                layouts['stackbar--tight'],
                layouts['stackbar--fill'],
              ])}
            >
              <Select
                id={`grouping-${value}`}
                type="RADIO_BUTTON"
                name="grouping"
                value={value}
                label={t(`handoff.document.grouping.${value}.label`)}
                isChecked={this.state.settings.grouping === value}
                action={() => updateDocSettings({ grouping: value })}
              />
              <this.Description
                label={t(`handoff.document.grouping.${value}.description`)}
              />
            </div>
          ),
          spacingModifier: 'LARGE' as const,
        }))}
        border={['BOTTOM']}
      />
    )
  }

  OutputsSection = () => {
    const { t } = this.props
    const { outputs } = this.state.settings
    const OUTPUTS: Array<{
      output: 'documentation' | 'contract'
      key: string
    }> = [
      { output: 'documentation', key: 'visual' },
      { output: 'contract', key: 'contract' },
    ]

    return (
      <Section
        title={
          <SimpleItem
            leftPartSlot={
              <SectionTitle label={t('handoff.document.outputs.title')} />
            }
            isListItem={false}
            alignment="CENTER"
          />
        }
        body={OUTPUTS.map(({ output, key }) => ({
          node: (
            <div
              key={output}
              className={doClassnames([
                layouts['stackbar--tight'],
                layouts['stackbar--fill'],
              ])}
            >
              <Select
                id={`output-${output}`}
                type="SWITCH_BUTTON"
                name="outputs"
                value={output}
                label={t(`handoff.document.outputs.${key}.title`)}
                isChecked={outputs[output]}
                action={this.handleOutputToggle(output)}
              />
              <this.Description
                label={t(`handoff.document.outputs.${key}.description`)}
              />
            </div>
          ),
          spacingModifier: 'LARGE' as const,
        }))}
        border={['BOTTOM']}
      />
    )
  }

  ContractSection = () => {
    const { t } = this.props
    const { selection, contractSettings } = this.state
    const hasBlocker = getSelectionBlocker('CONTRACT', selection) !== null
    const stored = this.getStoredContract()

    return (
      <Section
        title={
          <SimpleItem
            leftPartSlot={
              <SectionTitle
                label={t('handoff.document.outputs.contract.title')}
              />
            }
            isListItem={false}
            alignment="CENTER"
          />
        }
        body={[
          // A selection blocker is already stated in the header message.
          ...(hasBlocker
            ? []
            : [
                {
                  node:
                    stored !== null ? (
                      <div
                        className={doClassnames([
                          layouts['stackbar--tight'],
                          layouts['stackbar--fill'],
                        ])}
                      >
                        <this.Hint
                          label={formatContractSummary(stored.summary, t)}
                        />
                        <div className={layouts['snackbar--medium']}>
                          <this.Hint
                            label={t('handoff.documentations.generated', {
                              date: new Date(
                                stored.generatedAt
                              ).toLocaleDateString(),
                            })}
                          />
                          {stored.outdated && !stored.missing && (
                            <Chip>{t('handoff.documentations.outdated')}</Chip>
                          )}
                        </div>
                      </div>
                    ) : (
                      <this.Hint label={t('handoff.document.contract.none')} />
                    ),
                  spacingModifier: 'LARGE' as const,
                },
              ]),
          {
            node: (
              <div
                className={doClassnames([
                  layouts['stackbar--tight'],
                  layouts['stackbar--fill'],
                ])}
              >
                <Select
                  id="contract-auto-update"
                  type="SWITCH_BUTTON"
                  name="contract-auto-update"
                  value="autoUpdate"
                  label={t('handoff.document.contract.autoUpdate.label')}
                  isChecked={contractSettings.autoUpdate}
                  action={this.handleAutoUpdateToggle}
                />
                <this.Description
                  label={t('handoff.document.contract.autoUpdate.hint')}
                />
              </div>
            ),
            spacingModifier: 'LARGE' as const,
          },
          {
            node: (
              <div className={layouts['snackbar--medium']}>
                <Button
                  type="secondary"
                  label={t('handoff.document.contract.copyContract')}
                  isDisabled={stored === null || hasBlocker}
                  action={this.handleCopyContract}
                />
                <Button
                  type="secondary"
                  label={t('handoff.document.contract.copyInstructions')}
                  action={this.handleCopyInstructions}
                />
              </div>
            ),
            spacingModifier: 'LARGE' as const,
          },
          {
            node: this.ContractWarning(),
            spacingModifier: 'LARGE' as const,
          },
        ]}
        border={['BOTTOM']}
      />
    )
  }

  render() {
    const { outputs } = this.state.settings

    return (
      <Layout
        id="document"
        column={[
          {
            node: (
              <div style={{ height: '100%', overflowY: 'auto' }}>
                {this.TargetSection()}
                {this.OutputsSection()}
                {outputs.documentation && (
                  <>
                    {isFamilyFiltered(
                      this.state.selection,
                      this.state.settings
                    ) && this.VariantFilterSection()}
                    {this.ViewsSection()}
                    {this.getTarget() === 'FAMILY' && this.GroupingSection()}
                  </>
                )}
                {outputs.contract && this.ContractSection()}
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
