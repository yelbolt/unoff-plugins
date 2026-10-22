import { PureComponent } from 'preact/compat'
import { doClassnames } from '@unoff/utils'
import { FeatureStatus } from '@unoff/utils'
import {
  Button,
  Layout,
  Section,
  SectionTitle,
  Select,
  SimpleItem,
  layouts,
  texts,
} from '@unoff/ui'
import { WithTranslationProps } from '../components/WithTranslation'
import { WithConfigProps } from '../components/WithConfig'
import {
  canDocumentFamily,
  getDocumentedItem,
  getTarget,
  getVariantCounts,
  isFamilyFiltered,
} from '../../utils/annotationRules'
import { BaseProps, Editor, PlanStatus, Service } from '../../types/app'
import {
  DOC_VIEWS,
  DocTarget,
  DocView,
  Grouping,
  PartsDetail,
  SelectionDigest,
} from '../../types/annotations'
import {
  $docSettings,
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
}

const VIEW_KEYS: Record<DocView, string> = {
  ANATOMY: 'anatomy',
  VARIANTS: 'variants',
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
    }
  }

  // Lifecycle
  componentDidMount = () => {
    this.unsubscribeSelection = $selection.subscribe((value) =>
      this.setState({ selection: value })
    )
    this.unsubscribeSettings = $docSettings.subscribe((value) =>
      this.setState({ settings: value })
    )
  }

  componentWillUnmount = () => {
    if (this.unsubscribeSelection) this.unsubscribeSelection()
    if (this.unsubscribeSettings) this.unsubscribeSettings()
  }

  // Helpers
  getTarget = (): DocTarget =>
    getTarget(this.state.selection, this.state.settings)

  // Handlers
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

  LayersChoice = () => {
    const { t } = this.props
    const item = getDocumentedItem(this.state.selection)
    const names = item?.topLevelLayers ?? []

    const describe = (value: PartsDetail): string | null => {
      if (item === null) return null

      const root = item.componentName ?? item.name
      const count = value === 'ALL' ? item.nestedLayerCount : names.length

      if (count === 0) return t('handoff.document.layers.effect.none')
      if (value === 'ALL') return t('handoff.document.layers.effect.ALL', { count })

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
          layouts['stackbar--medium'],
          layouts['stackbar--fill'],
        ])}
        style={{ marginLeft: 'var(--size-pos-large)' }}
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
              {description !== null && <this.Hint label={description} />}
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
                    <this.Hint label={t('handoff.document.target.noFamily')} />
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
        body={DOC_VIEWS.filter((view) => isFamily || view !== 'VARIANTS').map(
          (view) => ({
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
                  <this.Hint
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
          })
        )}
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
              <this.Hint
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

  render() {
    return (
      <Layout
        id="document"
        column={[
          {
            node: (
              <div style={{ height: '100%', overflowY: 'auto' }}>
                {this.TargetSection()}
                {isFamilyFiltered(this.state.selection, this.state.settings) &&
                  this.VariantFilterSection()}
                {this.ViewsSection()}
                {this.getTarget() === 'FAMILY' && this.GroupingSection()}
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
