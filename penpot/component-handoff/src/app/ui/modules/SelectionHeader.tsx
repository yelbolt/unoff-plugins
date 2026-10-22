import { PureComponent } from 'preact/compat'
import { doClassnames } from '@unoff/utils'
import { Button, Chip, Section, SemanticMessage, layouts, texts } from '@unoff/ui'
import Documentation from '../contexts/Document'
import { WithTranslationProps } from '../components/WithTranslation'
import { WithConfigProps } from '../components/WithConfig'
import {
  getDocumentedItem,
  getEffectiveViews,
  getSelectionBlocker,
  getTarget,
  getVariantFilter,
  hasNoVariant,
} from '../../utils/annotationRules'
import { getRefusalMessage } from '../../utils/annotationNotifications'
import { sendAnnotationAction } from '../../utils/annotationActions'
import { BaseProps } from '../../types/app'
import { SelectionDigest, SelectionItem } from '../../types/annotations'
import {
  $docSettings,
  $pendingAction,
  $selection,
  DocSettings,
} from '../../stores/annotations'

interface SelectionHeaderProps
  extends BaseProps, WithConfigProps, WithTranslationProps {
  //
}

interface SelectionHeaderState {
  selection: SelectionDigest
  settings: DocSettings
  pendingAction: string | null
  showValues: boolean
}

export default class SelectionHeader extends PureComponent<
  SelectionHeaderProps,
  SelectionHeaderState
> {
  private unsubscribeSelection: (() => void) | undefined
  private unsubscribeSettings: (() => void) | undefined
  private unsubscribePending: (() => void) | undefined

  constructor(props: SelectionHeaderProps) {
    super(props)
    this.state = {
      selection: $selection.get(),
      settings: $docSettings.get(),
      pendingAction: $pendingAction.get(),
      showValues: false,
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
    this.unsubscribePending = $pendingAction.subscribe((value) =>
      this.setState({ pendingAction: value })
    )
  }

  componentWillUnmount = () => {
    if (this.unsubscribeSelection) this.unsubscribeSelection()
    if (this.unsubscribeSettings) this.unsubscribeSettings()
    if (this.unsubscribePending) this.unsubscribePending()
  }

  // Helpers
  getSelectionLabel = (): string => {
    const { t } = this.props
    const { count } = this.state.selection
    const item = getDocumentedItem(this.state.selection)

    if (count === 0) return t('handoff.selection.none')
    if (item === null) return t('handoff.selection.multiple', { count })

    switch (item.componentKind) {
      case 'FAMILY':
        return t('handoff.selection.family', {
          name: item.familyName ?? item.name,
          count: item.variantCount,
        })
      case 'VARIANT':
        return t('handoff.selection.variant', {
          family: item.familyName ?? item.name,
          values: item.variantValues
            ? Object.entries(item.variantValues)
                .map(([property, value]) => `${property}=${value}`)
                .join(', ')
            : (item.componentName ?? item.name),
        })
      case 'MAIN':
        return t('handoff.selection.component', {
          name: item.componentName ?? item.name,
        })
      case 'COPY':
        return t('handoff.selection.copy', {
          name: item.componentName ?? item.name,
        })
      case 'BOARD':
        return t('handoff.selection.boardKind', { name: item.name })
      default:
        return t('handoff.selection.other', {
          name: item.name,
          type: item.type,
        })
    }
  }

  getBlocker = () => getSelectionBlocker('DOCUMENTATION', this.state.selection)

  // A generated documentation is flagged by a chip, not by a message.
  isDocumentation = (): boolean => this.state.selection.containsAnnotation

  // One information message at most, by priority: blocker, no variant, no
  // view, existing documentation, rotation. Never two messages for the same
  // condition.
  getMessage = (): string | null => {
    const { t } = this.props
    const { selection, settings } = this.state
    const blocker = this.getBlocker()

    if (this.isDocumentation()) return null
    if (blocker !== null) return getRefusalMessage(blocker, t)
    if (hasNoVariant(selection, settings))
      return getRefusalMessage('NO_VARIANT', t)
    if (getEffectiveViews(selection, settings).length === 0)
      return getRefusalMessage('NO_VIEW', t)
    if (selection.annotatedCount > 0) return t('handoff.selection.annotated')
    if (selection.items.some((entry) => entry.isRotated))
      return t('handoff.selection.rotated')

    return null
  }

  handleGenerate = () => {
    const { selection, settings } = this.state
    const target = getTarget(selection, settings)

    sendAnnotationAction('GENERATE_DOCUMENTATION', {
      target,
      views: getEffectiveViews(selection, settings),
      depth: settings.depth,
      grouping: target === 'FAMILY' ? settings.grouping : 'MERGED',
      variantFilter: getVariantFilter(selection, settings),
    })
  }

  // Renders
  Secondary = (props: { children: string; title?: string }) => (
    <span
      className={doClassnames([texts.type, texts['type--secondary']])}
      title={props.title}
    >
      {props.children}
    </span>
  )

  VariantProperties = (item: SelectionItem) => {
    const { t } = this.props
    const { showValues } = this.state
    const summary = item.variantProperties
      .map((property) =>
        t('handoff.selection.properties.summary', {
          name: property.name,
          count: property.values.length,
        })
      )
      .join('  ·  ')

    return (
      <div
        className={doClassnames([layouts['stackbar--tight'], layouts['stackbar--fill']])}
      >
        <this.Secondary
          title={item.variantProperties
            .map((property) => `${property.name}: ${property.values.join(', ')}`)
            .join('\n')}
        >
          {summary}
        </this.Secondary>
        <div>
          <Button
            type="tertiary"
            label={t(
              showValues
                ? 'handoff.selection.properties.hide'
                : 'handoff.selection.properties.show'
            )}
            action={() => this.setState({ showValues: !showValues })}
          />
        </div>
        {showValues &&
          item.variantProperties.map((property) => (
            <this.Secondary key={property.name}>
              {`${property.name}: ${property.values.join(', ')}`}
            </this.Secondary>
          ))}
      </div>
    )
  }

  render() {
    const { t } = this.props
    const { selection, settings, pendingAction } = this.state
    const item = getDocumentedItem(selection)
    const message = this.getMessage()
    const features = Documentation.features(
      this.props.planStatus,
      this.props.config,
      this.props.service,
      this.props.editor
    )
    const isBlocked =
      this.getBlocker() !== null ||
      getEffectiveViews(selection, settings).length === 0 ||
      hasNoVariant(selection, settings) ||
      pendingAction !== null

    return (
      <>
        {message !== null && (
          <SemanticMessage type="INFO" message={message} isAnchored />
        )}
        <Section
          body={[
            {
              node: (
                <div
                  className={layouts['snackbar--large']}
                >
                  <span
                    className={doClassnames([texts.type, texts['type--bold']])}
                    data-testid="selection-label"
                  >
                    {this.getSelectionLabel()}
                  </span>
                  {this.isDocumentation() && (
                    <Chip>{t('handoff.selection.documentation')}</Chip>
                  )}
                </div>
              ),
              spacingModifier: 'LARGE' as const,
            },
            ...(item !== null && item.variantProperties.length > 0
              ? [
                  {
                    node: this.VariantProperties(item),
                    spacingModifier: 'LARGE' as const,
                  },
                ]
              : []),
            {
              node: (
                <this.Secondary>
                  {selection.boardName !== null
                    ? t('handoff.selection.board', {
                        board: selection.boardName,
                      })
                    : t('handoff.selection.noBoard')}
                </this.Secondary>
              ),
              spacingModifier: 'LARGE' as const,
            },
            {
              node: (
                <Button
                  type="primary"
                  label={t('handoff.document.cta.generate')}
                  isDisabled={isBlocked}
                  isLoading={pendingAction === 'GENERATE_DOCUMENTATION'}
                  isNew={features.GENERATE_DOCUMENTATION.isNew()}
                  action={this.handleGenerate}
                />
              ),
              spacingModifier: 'LARGE' as const,
            },
            ...(message === null && !isBlocked
              ? [
                  {
                    node: (
                      <this.Secondary>
                        {t('handoff.document.footer.hint')}
                      </this.Secondary>
                    ),
                    spacingModifier: 'LARGE' as const,
                  },
                ]
              : []),
          ]}
          border={['BOTTOM']}
        />
      </>
    )
  }
}
