import { PureComponent, createPortal } from 'preact/compat'
import { FeatureStatus, doClassnames } from '@unoff/utils'
import {
  Button,
  Chip,
  ColorChip,
  Dialog,
  Dropdown,
  DropdownOption,
  FormItem,
  Icon,
  IconChip,
  IconList,
  Input,
  layouts,
  List,
  SimpleItem,
  texts,
} from '@unoff/ui'
import { WithTranslationProps } from '../components/WithTranslation'
import { WithConfigProps } from '../components/WithConfig'
import { sendPluginMessage } from '../../utils/pluginMessage'
import {
  buildOccurrenceKey,
  groupIdFromOccurrenceKey,
  isOccurrenceKey,
} from '../../utils/occurrenceKey'
import {
  TokenCategory,
  MatchedToken,
  TokenSetSummary,
} from '../../types/tokens'
import {
  ApplySkipReason,
  ApplyTokenRequest,
  ApplyTokenResult,
  AuditOccurrence,
  AuditOptions,
  AuditScope,
  CreateTokenFailureReason,
  CreateTokenRequest,
  DeviationGroup,
} from '../../types/audit'
import { BaseProps, Editor, PlanStatus, Service } from '../../types/app'
import {
  $activeTokenSets,
  $appliedGroupIds,
  $appliedOccurrenceKeys,
  $applyInProgressId,
  $expandedGroupIds,
  $lastApplyResult,
  $lastTokenCreateResult,
  $selectedTokenIds,
  $tokenCreateInProgressId,
  seedSelectedTokenId,
  setApplyInProgress,
  setSelectedTokenId,
  setTokenCreateInProgress,
  toggleExpandedGroup,
} from '../../stores/audit'
import { ConfigContextType } from '../../config/ConfigContext'
import { roundNumeric } from '../../../utils/numeric'

const pickDefaultCandidate = (
  candidates: MatchedToken[]
): MatchedToken | undefined =>
  candidates.length === 0
    ? undefined
    : [...candidates].sort((a, b) => {
        if (a.tokenName !== b.tokenName)
          return a.tokenName < b.tokenName ? -1 : 1
        return a.tokenId < b.tokenId ? -1 : 1
      })[0]

const formatCandidateValue = (value: string | number): string =>
  typeof value === 'number' ? String(roundNumeric(value)) : value

const slugifyTokenNameSegment = (value: string | number): string =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/^#/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const suggestTokenName = (
  group: Pick<DeviationGroup, 'category' | 'rawValue'>
): string => `${group.category}.${slugifyTokenNameSegment(group.rawValue)}`

// "Create token" has no useful target for a lineHeight-only group — there's
// no discrete Penpot TokenType for lineHeight alone (see auditableProperties.ts).
const isCreateTokenEligible = (group: DeviationGroup): boolean =>
  group.tier !== 'EXACT' && group.occurrences[0]?.propertyPath !== 'lineHeight'

const FILL_PATH = /^fills\[(\d+)]\.fillColor$/
const STROKE_COLOR_PATH = /^strokes\[(\d+)]\.strokeColor$/
const STROKE_WIDTH_PATH = /^strokes\[(\d+)]\.strokeWidth$/

const FLEX_PROPERTY_KEY: Record<string, string> = {
  'flexLayout.rowGap': 'rowGap',
  'flexLayout.columnGap': 'columnGap',
  'flexLayout.topPadding': 'topPadding',
  'flexLayout.rightPadding': 'rightPadding',
  'flexLayout.bottomPadding': 'bottomPadding',
  'flexLayout.leftPadding': 'leftPadding',
}

const CATEGORY_ICON: Record<
  Exclude<TokenCategory, 'color'>,
  { iconType: 'PICTO' | 'LETTER'; iconName: IconList }
> = {
  spacing: {
    iconType: 'PICTO',
    iconName: 'spacing',
  },
  radius: {
    iconType: 'PICTO',
    iconName: 'corner-radius',
  },
  dimension: {
    iconType: 'PICTO',
    iconName: 'curve-linear',
  },
  typography: {
    iconType: 'LETTER',
    iconName: 'T',
  },
}

const SIMPLE_PROPERTY_KEY: Record<string, string> = {
  borderRadius: 'radius',
  width: 'width',
  height: 'height',
  fontSize: 'fontSize',
  fontWeight: 'fontWeight',
  lineHeight: 'lineHeight',
  letterSpacing: 'letterSpacing',
}

const getPropertyLabel = (
  propertyPath: string,
  t: WithTranslationProps['t']
): string => {
  const fillMatch = propertyPath.match(FILL_PATH)
  if (fillMatch)
    return t('tokenLint.report.occurrence.property.fill', {
      index: Number(fillMatch[1]) + 1,
    })

  const strokeColorMatch = propertyPath.match(STROKE_COLOR_PATH)
  if (strokeColorMatch)
    return t('tokenLint.report.occurrence.property.strokeColor', {
      index: Number(strokeColorMatch[1]) + 1,
    })

  const strokeWidthMatch = propertyPath.match(STROKE_WIDTH_PATH)
  if (strokeWidthMatch)
    return t('tokenLint.report.occurrence.property.strokeWidth', {
      index: Number(strokeWidthMatch[1]) + 1,
    })

  if (propertyPath in FLEX_PROPERTY_KEY)
    return t(
      `tokenLint.report.occurrence.property.${FLEX_PROPERTY_KEY[propertyPath]}`
    )

  if (propertyPath in SIMPLE_PROPERTY_KEY)
    return t(
      `tokenLint.report.occurrence.property.${SIMPLE_PROPERTY_KEY[propertyPath]}`
    )

  return propertyPath
}

interface DeviationGroupRowProps
  extends BaseProps, WithConfigProps, WithTranslationProps {
  group: DeviationGroup
  scope: AuditScope
  categories: Array<TokenCategory>
  options: AuditOptions
}

interface DeviationGroupRowState {
  isExpanded: boolean
  isApplied: boolean
  applyInProgressId: string | null
  selectedTokenId: string | null
  appliedOccurrenceKeys: Set<string>
  isCreateTokenDialogOpen: boolean
  tokenNameDraft: string
  tokenCreateInProgressId: string | null
  createTokenError: CreateTokenFailureReason | null
  activeTokenSets: TokenSetSummary[] | null
  selectedSetId: string | null
}

export default class DeviationGroupRow extends PureComponent<
  DeviationGroupRowProps,
  DeviationGroupRowState
> {
  private unsubscribeExpanded: (() => void) | undefined
  private unsubscribeApplied: (() => void) | undefined
  private unsubscribeApplyInProgress: (() => void) | undefined
  private unsubscribeAppliedOccurrenceKeys: (() => void) | undefined
  private unsubscribeTokenCreateInProgress: (() => void) | undefined
  private unsubscribeActiveTokenSets: (() => void) | undefined
  private unsubscribeSelectedTokenId: (() => void) | undefined
  private previousApplyInProgressId: string | null = null
  private previousTokenCreateInProgressId: string | null = null

  static features = (
    planStatus: PlanStatus,
    config: ConfigContextType,
    service: Service,
    editor: Editor
  ) => ({
    APPLY_TOKEN_GROUP: new FeatureStatus({
      features: config.features,
      featureName: 'APPLY_TOKEN_GROUP',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    APPLY_TOKEN: new FeatureStatus({
      features: config.features,
      featureName: 'APPLY_TOKEN',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    CREATE_TOKEN: new FeatureStatus({
      features: config.features,
      featureName: 'CREATE_TOKEN',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
  })

  private get features() {
    return DeviationGroupRow.features(
      this.props.planStatus,
      this.props.config,
      this.props.service,
      this.props.editor
    )
  }

  constructor(props: DeviationGroupRowProps) {
    super(props)
    const { group } = props
    const defaultCandidate = pickDefaultCandidate(group.candidateTokens)
    this.state = {
      isExpanded: $expandedGroupIds.get().has(group.id),
      isApplied: $appliedGroupIds.get().has(group.id),
      applyInProgressId: $applyInProgressId.get(),
      selectedTokenId:
        $selectedTokenIds.get()[group.id] ?? defaultCandidate?.tokenId ?? null,
      appliedOccurrenceKeys: $appliedOccurrenceKeys.get(),
      isCreateTokenDialogOpen: false,
      tokenNameDraft: '',
      tokenCreateInProgressId: $tokenCreateInProgressId.get(),
      createTokenError: null,
      activeTokenSets: $activeTokenSets.get(),
      selectedSetId: null,
    }
  }

  // Lifecycle
  componentDidMount = () => {
    const { group } = this.props
    this.previousApplyInProgressId = $applyInProgressId.get()

    this.unsubscribeExpanded = $expandedGroupIds.subscribe((value) =>
      this.setState({ isExpanded: value.has(group.id) })
    )
    this.unsubscribeApplied = $appliedGroupIds.subscribe((value) =>
      this.setState({ isApplied: value.has(group.id) })
    )
    // Individually-applied occurrences are tracked centrally (see
    // applyTokenApplied in stores/audit.ts); this row just mirrors the store.
    this.unsubscribeAppliedOccurrenceKeys = $appliedOccurrenceKeys.subscribe(
      (value) => this.setState({ appliedOccurrenceKeys: value })
    )
    this.unsubscribeApplyInProgress = $applyInProgressId.subscribe((id) => {
      const previous = this.previousApplyInProgressId
      this.previousApplyInProgressId = id

      if (previous && previous !== id)
        if (previous === group.id) this.notifyApplyOutcome($lastApplyResult.get())
        else if (
          isOccurrenceKey(previous) &&
          groupIdFromOccurrenceKey(previous) === group.id
        )
          this.notifyApplyOutcome($lastApplyResult.get())

      this.setState({ applyInProgressId: id })
    })
    this.previousTokenCreateInProgressId = $tokenCreateInProgressId.get()
    this.unsubscribeTokenCreateInProgress = $tokenCreateInProgressId.subscribe(
      (id) => {
        const previous = this.previousTokenCreateInProgressId
        this.previousTokenCreateInProgressId = id

        if (previous && previous === group.id && previous !== id) {
          const result = $lastTokenCreateResult.get()
          if (result && result.success) {
            this.notifyTokenCreateSuccess(result.token?.tokenName ?? '')
            this.setState({
              isCreateTokenDialogOpen: false,
              tokenNameDraft: '',
              createTokenError: null,
            })
          } else if (result)
            this.setState({
              createTokenError: result.reason ?? 'CREATE_FAILED',
            })
        }

        this.setState({ tokenCreateInProgressId: id })
      }
    )
    // A fresh list arrives every time this row's dialog opens — default to
    // the first set only when nothing's been picked yet.
    this.unsubscribeActiveTokenSets = $activeTokenSets.subscribe((sets) => {
      const nextSets = sets ? [...sets] : null
      this.setState((previousState) => ({
        activeTokenSets: nextSets,
        selectedSetId: previousState.selectedSetId ?? nextSets?.[0]?.id ?? null,
      }))
    })
    // $selectedTokenIds is the single source of truth so it survives a row
    // remount; seed this row's default without clobbering an existing pick.
    const defaultCandidate = pickDefaultCandidate(group.candidateTokens)
    if (defaultCandidate)
      seedSelectedTokenId(group.id, defaultCandidate.tokenId)
    this.unsubscribeSelectedTokenId = $selectedTokenIds.subscribe((value) =>
      this.setState({ selectedTokenId: value[group.id] ?? null })
    )
  }

  componentWillUnmount = () => {
    if (this.unsubscribeExpanded) this.unsubscribeExpanded()
    if (this.unsubscribeApplied) this.unsubscribeApplied()
    if (this.unsubscribeApplyInProgress) this.unsubscribeApplyInProgress()
    if (this.unsubscribeAppliedOccurrenceKeys)
      this.unsubscribeAppliedOccurrenceKeys()
    if (this.unsubscribeTokenCreateInProgress)
      this.unsubscribeTokenCreateInProgress()
    if (this.unsubscribeActiveTokenSets) this.unsubscribeActiveTokenSets()
    if (this.unsubscribeSelectedTokenId) this.unsubscribeSelectedTokenId()
  }

  // Direct
  occurrenceKey = (occurrence: AuditOccurrence) =>
    buildOccurrenceKey(this.props.group.id, occurrence)

  notifyApplySuccess = (appliedCount: number) => {
    sendPluginMessage(
      {
        pluginMessage: {
          type: 'POST_MESSAGE',
          data: {
            type: 'SUCCESS',
            message:
              appliedCount > 1
                ? this.props.t('tokenLint.report.toast.groupApplied', {
                    applied: appliedCount,
                  })
                : this.props.t('tokenLint.report.toast.occurrenceApplied'),
          },
        },
      },
      '*'
    )
  }

  notifyApplyFailure = (reason: ApplySkipReason) => {
    sendPluginMessage(
      {
        pluginMessage: {
          type: 'POST_MESSAGE',
          data: {
            type: 'WARNING',
            message: this.props.t(
              `tokenLint.report.apply.skippedReason.${reason}`
            ),
          },
        },
      },
      '*'
    )
  }

  notifyAlreadyCompliant = () => {
    sendPluginMessage(
      {
        pluginMessage: {
          type: 'POST_MESSAGE',
          data: {
            type: 'SUCCESS',
            message: this.props.t('tokenLint.report.toast.alreadyCompliant'),
          },
        },
      },
      '*'
    )
  }

  // Shared by the group-apply and occurrence-apply branches of the
  // $applyInProgressId subscription below. `announcedCount === 0` with
  // nothing skipped is its own outcome, not a failure — usually a group
  // that's already compliant (see applyTokenApplied's isAlreadyResolved
  // check in stores/audit.ts).
  notifyApplyOutcome = (result: ApplyTokenResult | null) => {
    if (!result) return
    if (result.appliedCount > 0) this.notifyApplySuccess(result.appliedCount)
    else if (result.announcedCount === 0 && result.skipped.length === 0)
      this.notifyAlreadyCompliant()
    else if (result.skipped.length > 0)
      this.notifyApplyFailure(result.skipped[0].reason)
  }

  notifyTokenCreateSuccess = (tokenName: string) => {
    sendPluginMessage(
      {
        pluginMessage: {
          type: 'POST_MESSAGE',
          data: {
            type: 'SUCCESS',
            message: this.props.t(
              'tokenLint.report.group.createToken.success',
              {
                tokenName,
              }
            ),
          },
        },
      },
      '*'
    )
  }

  // Handlers
  handleToggleExpand = () => toggleExpandedGroup(this.props.group.id)

  handleSelectCandidate = (tokenId: string) => () =>
    setSelectedTokenId(this.props.group.id, tokenId)

  handleOpenCreateTokenDialog = () => {
    this.setState({
      isCreateTokenDialogOpen: true,
      tokenNameDraft: suggestTokenName(this.props.group),
      createTokenError: null,
      // Reset the pick — the subscription in componentDidMount repopulates
      // it (to the first set) once the fresh list below comes back, or
      // immediately if $activeTokenSets already held one from an earlier
      // dialog in this session.
      selectedSetId: null,
    })
    sendPluginMessage({ pluginMessage: { type: 'GET_ACTIVE_TOKEN_SETS' } }, '*')
  }

  handleCloseCreateTokenDialog = () =>
    this.setState({ isCreateTokenDialogOpen: false, createTokenError: null })

  handleChangeTokenNameDraft = (e: Event) =>
    this.setState({
      tokenNameDraft: (e.target as HTMLInputElement).value,
      createTokenError: null,
    })

  handleSelectSet = (setId: string) => () =>
    this.setState({ selectedSetId: setId, createTokenError: null })

  handleConfirmCreateToken = () => {
    const { group, scope, categories, options } = this.props
    const name = this.state.tokenNameDraft.trim()
    const { selectedSetId } = this.state
    if (!name || !selectedSetId) return

    setTokenCreateInProgress(group.id)

    const request: CreateTokenRequest = {
      groupId: group.id,
      setId: selectedSetId,
      category: group.category,
      rawValue: group.rawValue,
      propertyPathHint: group.occurrences[0]?.propertyPath ?? '',
      name,
      scope,
      categories,
      options,
    }

    sendPluginMessage(
      { pluginMessage: { type: 'CREATE_TOKEN', data: request } },
      '*'
    )
  }

  handleSelectGroupOnCanvas = () => {
    const { group } = this.props
    sendPluginMessage(
      {
        pluginMessage: {
          type: 'SELECT_LAYERS_ON_CANVAS',
          data: {
            shapeIds: group.occurrences.map((occurrence) => occurrence.shapeId),
          },
        },
      },
      '*'
    )
  }

  handleSelectOccurrenceOnCanvas = (occurrence: AuditOccurrence) => () =>
    sendPluginMessage(
      {
        pluginMessage: {
          type: 'SELECT_LAYERS_ON_CANVAS',
          data: { shapeIds: [occurrence.shapeId] },
        },
      },
      '*'
    )

  handleApply = () => {
    const { group, scope, categories, options } = this.props
    if (!this.state.selectedTokenId) return

    setApplyInProgress(group.id)

    const request: ApplyTokenRequest = {
      mode: 'GROUP',
      tokenId: this.state.selectedTokenId,
      deviationGroupId: group.id,
      scope,
      categories,
      options,
    }

    sendPluginMessage(
      {
        pluginMessage: { type: 'APPLY_TOKEN_GROUP', data: request },
      },
      '*'
    )
  }

  handleApplyOccurrence = (occurrence: AuditOccurrence) => () => {
    const { group, scope, categories, options } = this.props
    if (!this.state.selectedTokenId) return

    const key = this.occurrenceKey(occurrence)
    setApplyInProgress(key)

    const request: ApplyTokenRequest = {
      mode: 'OCCURRENCE',
      tokenId: this.state.selectedTokenId,
      deviationGroupId: group.id,
      occurrenceShapeId: occurrence.shapeId,
      propertyPath: occurrence.propertyPath,
      scope,
      categories,
      options,
    }

    sendPluginMessage(
      {
        pluginMessage: { type: 'APPLY_TOKEN', data: request },
      },
      '*'
    )
  }

  renderCreateTokenButton = () => {
    const { t, group } = this.props
    if (!isCreateTokenEligible(group) || !this.features.CREATE_TOKEN.isActive())
      return null

    return (
      <Button
        type="tertiary"
        size="small"
        icon="plus"
        label={t('tokenLint.report.group.createToken.cta')}
        isNew={this.features.CREATE_TOKEN.isNew()}
        action={this.handleOpenCreateTokenDialog}
      />
    )
  }

  renderProposal = () => {
    const { t, group } = this.props
    const { selectedTokenId } = this.state
    const candidates = group.candidateTokens

    if (candidates.length === 0)
      return (
        <div className={layouts['snackbar--tight']}>
          <span
            className={doClassnames([texts.type, texts['type--secondary']])}
          >
            {t('tokenLint.report.group.noMatchNote')}
          </span>
          {this.renderCreateTokenButton()}
        </div>
      )

    if (candidates.length === 1) {
      const candidate = candidates[0]
      const resolvedValueLabel = formatCandidateValue(candidate.resolvedValue)

      if (group.tier === 'NEAR')
        return (
          <div className={layouts['snackbar--tight']}>
            <span
              className={doClassnames([texts.type, texts['type--secondary']])}
            >
              {t('tokenLint.report.group.nearMatch', {
                tokenName: candidate.tokenName,
                resolvedValue: resolvedValueLabel,
              })}
              {candidate.residual !== undefined &&
                ` (${t('tokenLint.report.group.residual', {
                  value: candidate.residual,
                })})`}
            </span>
            {this.renderCreateTokenButton()}
          </div>
        )

      return (
        <span className={doClassnames([texts.type, texts['type--secondary']])}>
          {t('tokenLint.report.group.candidateConfirmed', {
            tokenName: candidate.tokenName,
            resolvedValue: resolvedValueLabel,
          })}
        </span>
      )
    }

    const candidateOptions: Array<DropdownOption> = candidates.map(
      (candidate) => ({
        type: 'OPTION',
        label: `${candidate.tokenName} (${candidate.setName})`,
        value: candidate.tokenId,
        shortcut: formatCandidateValue(candidate.resolvedValue),
        action: this.handleSelectCandidate(candidate.tokenId),
      })
    )
    const selectedCandidate =
      candidates.find((candidate) => candidate.tokenId === selectedTokenId) ??
      candidates[0]

    return (
      <Dropdown
        id={`token-pick-${group.id}`}
        options={candidateOptions}
        selected={selectedTokenId ?? candidates[0]?.tokenId ?? ''}
        helper={{
          label: t('tokenLint.report.group.resolvedValueHelper', {
            value: formatCandidateValue(selectedCandidate.resolvedValue),
          }),
        }}
      />
    )
  }

  // Render
  render() {
    const { t, group } = this.props
    const {
      isExpanded,
      isApplied,
      applyInProgressId,
      selectedTokenId,
      appliedOccurrenceKeys,
      isCreateTokenDialogOpen,
      tokenNameDraft,
      tokenCreateInProgressId,
      createTokenError,
      activeTokenSets,
      selectedSetId,
    } = this.state
    const isApplying = applyInProgressId === group.id
    // Individually-applied occurrences are removed from view entirely; the
    // header count follows the same live total.
    const remainingOccurrences = group.occurrences.filter(
      (occurrence) => !appliedOccurrenceKeys.has(this.occurrenceKey(occurrence))
    )

    return (
      <>
        <SimpleItem
          leftPartSlot={
            <div className={layouts['snackbar--medium']}>
              {group.category === 'color' ? (
                <ColorChip color={String(group.rawValue)} />
              ) : (
                <Icon
                  type={CATEGORY_ICON[group.category].iconType}
                  iconName={CATEGORY_ICON[group.category].iconName}
                  iconLetter={
                    group.category === 'typography'
                      ? CATEGORY_ICON[group.category].iconName
                      : undefined
                  }
                />
              )}
              <span className={texts.type}>{String(group.rawValue)}</span>
              <Chip>
                {t('tokenLint.report.group.occurrenceCount', {
                  count: remainingOccurrences.length,
                })}
              </Chip>
              {group.instanceOverrideCount > 0 && (
                <IconChip
                  iconType="PICTO"
                  iconName="warning"
                  text={t('tokenLint.report.group.instanceOverrideCount', {
                    count: group.instanceOverrideCount,
                  })}
                />
              )}
              {group.mainComponentCount > 0 && (
                <IconChip
                  iconType="PICTO"
                  iconName="warning"
                  text={t('tokenLint.report.group.mainComponentCount', {
                    count: group.mainComponentCount,
                  })}
                />
              )}
            </div>
          }
          rightPartSlot={
            <div className={layouts['snackbar--tight']}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {isApplied && (
                  <Chip
                    state="ON_BACKGROUND"
                    leftSlot={
                      <Icon
                        type="PICTO"
                        iconName="check"
                      />
                    }
                  >
                    {t('tokenLint.report.group.applied')}
                  </Chip>
                )}
                {group.tier === 'EXACT' &&
                  !isApplied &&
                  this.features.APPLY_TOKEN_GROUP.isActive() && (
                    <Button
                      type="icon"
                      icon="check"
                      helper={{ label: t('tokenLint.report.group.cta.apply') }}
                      isLoading={isApplying}
                      isDisabled={!selectedTokenId}
                      isNew={this.features.APPLY_TOKEN_GROUP.isNew()}
                      action={this.handleApply}
                    />
                  )}
              </div>
              <Button
                type="icon"
                icon="group"
                helper={{ label: t('tokenLint.report.group.cta.selectAll') }}
                action={this.handleSelectGroupOnCanvas}
              />
              <Button
                type="icon"
                icon={isExpanded ? 'chevron-up' : 'chevron-down'}
                helper={{ label: t('tokenLint.report.group.cta.expand') }}
                action={this.handleToggleExpand}
              />
            </div>
          }
          isListItem={false}
          alignment="CENTER"
        />

        <SimpleItem
          leftPartSlot={this.renderProposal()}
          isListItem={false}
          alignment="CENTER"
        />

        {isExpanded && (
          <List padding="0 0 0 var(--size-pos-xsmall)">
            {remainingOccurrences.map((occurrence) => {
              const key = this.occurrenceKey(occurrence)
              const isOccurrenceApplying = applyInProgressId === key

              return (
                <SimpleItem
                  key={key}
                  leftPartSlot={
                    <div
                      className={doClassnames([
                        layouts['snackbar--tight'],
                        layouts['snackbar--baseline'],
                      ])}
                    >
                      <span className={texts.type}>{occurrence.shapeName}</span>
                      <span
                        className={doClassnames([
                          texts.type,
                          texts['type--secondary'],
                          texts['type--small'],
                        ])}
                      >
                        {getPropertyLabel(occurrence.propertyPath, t)}
                      </span>
                    </div>
                  }
                  rightPartSlot={
                    <div className={layouts['snackbar--tight']}>
                      <Chip>
                        {t(
                          `tokenLint.report.ownership.${occurrence.ownership}`
                        )}
                      </Chip>
                      <Button
                        type="icon"
                        icon="target"
                        helper={{
                          label: t(
                            'tokenLint.report.group.cta.selectOccurrence'
                          ),
                        }}
                        action={this.handleSelectOccurrenceOnCanvas(occurrence)}
                      />
                      {group.tier === 'EXACT' &&
                        this.features.APPLY_TOKEN.isActive() && (
                          <Button
                            type="icon"
                            icon="check"
                            helper={{
                              label: t(
                                'tokenLint.report.group.cta.applyOccurrence'
                              ),
                            }}
                            isLoading={isOccurrenceApplying}
                            isDisabled={!selectedTokenId}
                            isNew={this.features.APPLY_TOKEN.isNew()}
                            action={this.handleApplyOccurrence(occurrence)}
                          />
                        )}
                    </div>
                  }
                  isListItem
                  alignment="CENTER"
                />
              )
            })}
          </List>
        )}

        {isCreateTokenDialogOpen &&
          document.getElementById('modal') &&
          (() => {
            // null = not fetched yet; [] = fetched and genuinely no active set.
            const hasNoActiveSets =
              activeTokenSets !== null && activeTokenSets.length === 0
            const setOptions: Array<DropdownOption> = (
              activeTokenSets ?? []
            ).map((set) => ({
              type: 'OPTION',
              label: set.name,
              value: set.id,
              action: this.handleSelectSet(set.id),
            }))

            return createPortal(
              <Dialog
                title={t('tokenLint.report.group.createToken.dialogTitle')}
                actions={{
                  primary: {
                    label: t('tokenLint.report.group.createToken.confirmCta'),
                    state:
                      tokenCreateInProgressId === group.id
                        ? 'LOADING'
                        : tokenNameDraft.trim() === '' ||
                            !selectedSetId ||
                            hasNoActiveSets
                          ? 'DISABLED'
                          : 'DEFAULT',
                    action: this.handleConfirmCreateToken,
                  },
                  secondary: {
                    label: t('tokenLint.report.group.createToken.cancelCta'),
                    action: this.handleCloseCreateTokenDialog,
                  },
                }}
                onClose={this.handleCloseCreateTokenDialog}
              >
                <div className={'dialog__form'}>
                  <p className={texts.type}>
                    {t('tokenLint.report.group.createToken.description', {
                      rawValue: String(group.rawValue),
                    })}
                  </p>
                  <FormItem
                    id="create-token-set"
                    label={t('tokenLint.report.group.createToken.setLabel')}
                    isBaseline={hasNoActiveSets}
                    shouldFill
                  >
                    {hasNoActiveSets ? (
                      <p
                        className={doClassnames([
                          texts.type,
                          texts['type--secondary'],
                        ])}
                      >
                        {t(
                          'tokenLint.report.group.createToken.failure.NO_ACTIVE_SET'
                        )}
                      </p>
                    ) : (
                      <Dropdown
                        id={`create-token-set`}
                        options={setOptions}
                        selected={selectedSetId ?? ''}
                        isFill
                      />
                    )}
                  </FormItem>
                  <FormItem
                    id={`create-token-name`}
                    label={t('tokenLint.report.group.createToken.nameLabel')}
                    shouldFill
                  >
                    <Input
                      id={`create-token-name`}
                      type="TEXT"
                      value={tokenNameDraft}
                      placeholder={t(
                        'tokenLint.report.group.createToken.namePlaceholder'
                      )}
                      isAutoFocus
                      state={createTokenError ? 'ERROR' : 'DEFAULT'}
                      onChange={this.handleChangeTokenNameDraft}
                    />
                  </FormItem>
                  {createTokenError && (
                    <p
                      className={doClassnames([
                        texts.type,
                        texts['type--secondary'],
                      ])}
                    >
                      {t(
                        `tokenLint.report.group.createToken.failure.${createTokenError}`
                      )}
                    </p>
                  )}
                </div>
              </Dialog>,
              document.getElementById('modal') ?? document.createElement('app')
            )
          })()}
      </>
    )
  }
}
