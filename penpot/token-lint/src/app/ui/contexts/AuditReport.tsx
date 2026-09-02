import { Fragment, PureComponent, createPortal } from 'preact/compat'
import { FeatureStatus, doClassnames } from '@unoff/utils'
import {
  Button,
  Chip,
  Dialog,
  Icon,
  Layout,
  layouts,
  List,
  Section,
  SectionTitle,
  SemanticMessage,
  SimpleItem,
  Tabs,
  texts,
} from '@unoff/ui'
import DeviationTierSection from '../subcontexts/DeviationTierSection'
import { WithTranslationProps } from '../components/WithTranslation'
import { WithConfigProps } from '../components/WithConfig'
import Feature from '../components/Feature'
import { sendPluginMessage } from '../../utils/pluginMessage'
import { buildOccurrenceKey } from '../../utils/occurrenceKey'
import { TokenCategory } from '../../types/tokens'
import {
  ApplySkipReason,
  ApplySkippedItem,
  ApplyTokenRequest,
  AuditReport as AuditReportType,
  ApplyTokenResult,
  CoverageSummary,
  DeviationGroup,
} from '../../types/audit'
import { BaseProps, Editor, PlanStatus, Service } from '../../types/app'
import {
  $appliedGroupIds,
  $appliedOccurrenceKeys,
  $auditReport,
  $lastApplyResult,
  setApplyInProgress,
} from '../../stores/audit'
import { ConfigContextType } from '../../config/ConfigContext'

interface AuditReportProps
  extends BaseProps, WithConfigProps, WithTranslationProps {
  //
}

type CategoryTab = TokenCategory | 'ALL'

const CATEGORY_ORDER: Array<TokenCategory> = [
  'color',
  'spacing',
  'radius',
  'typography',
  'dimension',
]

const COUNT_ONLY_SKIP_REASONS = new Set<ApplySkipReason>([
  'AMBIGUOUS_CANDIDATES',
  'TYPE_INCOMPATIBLE',
])

const SKIP_REASON_ORDER: Array<ApplySkipReason> = [
  'AMBIGUOUS_CANDIDATES',
  'TYPE_INCOMPATIBLE',
  'ALREADY_APPLIED',
  'SHAPE_NOT_FOUND',
  'LOCKED',
  'TIER_NOT_APPLICABLE',
  'WRITE_FAILED',
]

/**
 * Recomputes coverage from what's actually still non-compliant right now,
 * instead of the static figure from the original audit run. `auditable` per
 * category never changes, and every auditable property is either counted
 * compliant at audit time or is exactly one occurrence inside exactly one
 * DeviationGroup, so `compliant = auditable - stillNonCompliant` holds. A
 * group in `appliedGroupIds` contributes 0; otherwise each occurrence is
 * checked against `appliedOccurrenceKeys` individually, since a group can
 * be partially resolved without disappearing from the list yet.
 */
const computeLiveCoverage = (
  report: AuditReportType,
  appliedGroupIds: Set<string>,
  appliedOccurrenceKeys: Set<string>
): CoverageSummary => {
  const liveNonCompliantByCategory: Record<TokenCategory, number> = {
    color: 0,
    spacing: 0,
    radius: 0,
    typography: 0,
    dimension: 0,
  }

  const allGroups = [
    ...report.tiers.exact,
    ...report.tiers.near,
    ...report.tiers.orphan,
  ]

  for (const group of allGroups) {
    if (appliedGroupIds.has(group.id)) continue
    const remaining = group.occurrences.filter(
      (occurrence) =>
        !appliedOccurrenceKeys.has(buildOccurrenceKey(group.id, occurrence))
    ).length
    liveNonCompliantByCategory[group.category] += remaining
  }

  const byCategory = {} as CoverageSummary['byCategory']
  let totalAuditable = 0
  let totalCompliant = 0

  for (const category of CATEGORY_ORDER) {
    const auditable = report.coverage.byCategory[category].auditable
    const compliant = Math.max(0, auditable - liveNonCompliantByCategory[category])
    byCategory[category] = {
      auditable,
      compliant,
      coverageRate: auditable === 0 ? 0 : compliant / auditable,
    }
    totalAuditable += auditable
    totalCompliant += compliant
  }

  return {
    auditableProperties: totalAuditable,
    compliantProperties: totalCompliant,
    coverageRate: totalAuditable === 0 ? 0 : totalCompliant / totalAuditable,
    byCategory,
  }
}

const groupSkippedByReason = (
  skipped: Array<ApplySkippedItem>
): Array<{ reason: ApplySkipReason; items: Array<ApplySkippedItem> }> => {
  const byReason = new Map<ApplySkipReason, Array<ApplySkippedItem>>()
  skipped.forEach((item) => {
    const list = byReason.get(item.reason) ?? []
    list.push(item)
    byReason.set(item.reason, list)
  })
  return SKIP_REASON_ORDER.filter((reason) => byReason.has(reason)).map(
    (reason) => ({
      reason,
      items: byReason.get(reason) as Array<ApplySkippedItem>,
    })
  )
}

interface AuditReportState {
  report: AuditReportType | null
  selectedCategoryTab: CategoryTab
  appliedGroupIds: Set<string>
  appliedOccurrenceKeys: Set<string>
  isBulkConfirmOpen: boolean
  isBulkApplying: boolean
  isBulkApplyingClosed: boolean
  isBulkResultOpen: boolean
  bulkResult: ApplyTokenResult | null
}

export default class AuditReport extends PureComponent<
  AuditReportProps,
  AuditReportState
> {
  private unsubscribeReport: (() => void) | undefined
  private unsubscribeLastApplyResult: (() => void) | undefined
  private unsubscribeAppliedGroupIds: (() => void) | undefined
  private unsubscribeAppliedOccurrenceKeys: (() => void) | undefined

  static features = (
    planStatus: PlanStatus,
    config: ConfigContextType,
    service: Service,
    editor: Editor
  ) => ({
    APPLY_ALL_EXACT_MATCHES: new FeatureStatus({
      features: config.features,
      featureName: 'APPLY_ALL_EXACT_MATCHES',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
  })

  private get features() {
    return AuditReport.features(
      this.props.planStatus,
      this.props.config,
      this.props.service,
      this.props.editor
    )
  }

  constructor(props: AuditReportProps) {
    super(props)
    this.state = {
      report: $auditReport.get(),
      selectedCategoryTab: 'ALL',
      appliedGroupIds: $appliedGroupIds.get(),
      appliedOccurrenceKeys: $appliedOccurrenceKeys.get(),
      isBulkConfirmOpen: false,
      isBulkApplying: false,
      isBulkApplyingClosed: false,
      isBulkResultOpen: false,
      bulkResult: null,
    }
  }

  // Lifecycle
  componentDidMount = () => {
    this.unsubscribeReport = $auditReport.subscribe((value) =>
      this.setState({ report: value })
    )
    // Drives the visible-groups filter below — a fully "Applied" group is
    // dropped from the report entirely instead of lingering with a checkmark.
    this.unsubscribeAppliedGroupIds = $appliedGroupIds.subscribe((value) =>
      this.setState({ appliedGroupIds: value })
    )
    // Drives the live coverage figures — a group can be partially resolved
    // without being fully done yet, so coverage needs this too.
    this.unsubscribeAppliedOccurrenceKeys = $appliedOccurrenceKeys.subscribe(
      (value) => this.setState({ appliedOccurrenceKeys: value })
    )
    this.unsubscribeLastApplyResult = $lastApplyResult.subscribe((result) => {
      if (
        result &&
        result.requestedMode === 'ALL_EXACT_MATCHES' &&
        this.state.isBulkApplying
      ) {
        this.setState({
          isBulkApplying: false,
          isBulkResultOpen: true,
          bulkResult: result,
        })

        if (result.appliedCount > 0)
          sendPluginMessage(
            {
              pluginMessage: {
                type: 'POST_MESSAGE',
                data: {
                  type: 'SUCCESS',
                  message: this.props.t('tokenLint.report.toast.groupApplied', {
                    applied: result.appliedCount,
                  }),
                },
              },
            },
            '*'
          )
        // Nothing left to write — most commonly a group whose occurrences
        // turn out to already be compliant. Worth its own toast rather than
        // staying silent.
        else if (result.announcedCount === 0)
          sendPluginMessage(
            {
              pluginMessage: {
                type: 'POST_MESSAGE',
                data: {
                  type: 'SUCCESS',
                  message: this.props.t(
                    'tokenLint.report.toast.alreadyCompliant'
                  ),
                },
              },
            },
            '*'
          )
        else if (result.skipped.length > 0)
          sendPluginMessage(
            {
              pluginMessage: {
                type: 'POST_MESSAGE',
                data: {
                  type: 'WARNING',
                  message: this.props.t(
                    'tokenLint.report.toast.bulkNoneApplied',
                    {
                      count: result.skipped.length,
                    }
                  ),
                },
              },
            },
            '*'
          )
      }
    })
  }

  componentWillUnmount = () => {
    if (this.unsubscribeReport) this.unsubscribeReport()
    if (this.unsubscribeLastApplyResult) this.unsubscribeLastApplyResult()
    if (this.unsubscribeAppliedGroupIds) this.unsubscribeAppliedGroupIds()
    if (this.unsubscribeAppliedOccurrenceKeys)
      this.unsubscribeAppliedOccurrenceKeys()
  }

  // Handlers
  handleOpenBulkConfirm = () => this.setState({ isBulkConfirmOpen: true })

  handleCloseBulkConfirm = () => this.setState({ isBulkConfirmOpen: false })

  handleConfirmBulkApply = () => {
    const { report } = this.state
    if (!report) return

    this.setState({ isBulkConfirmOpen: false, isBulkApplying: true })
    setApplyInProgress('ALL_EXACT_MATCHES')

    const request: ApplyTokenRequest = {
      mode: 'ALL_EXACT_MATCHES',
      scope: report.scope,
      categories: report.categories,
      options: report.options,
    }

    sendPluginMessage(
      {
        pluginMessage: { type: 'APPLY_ALL_EXACT_MATCHES', data: request },
      },
      '*'
    )
  }

  handleCloseBulkResult = () =>
    this.setState({ isBulkResultOpen: false, bulkResult: null })

  handleCategoryTabChange = (e: Event) =>
    this.setState({
      selectedCategoryTab: (e.currentTarget as HTMLElement).dataset
        .feature as CategoryTab,
    })

  // Direct
  filterGroupsByCategory = (groups: Array<DeviationGroup>) =>
    this.state.selectedCategoryTab === 'ALL'
      ? groups
      : groups.filter(
          (group) => group.category === this.state.selectedCategoryTab
        )

  // Render
  render() {
    const { t } = this.props
    const {
      report,
      selectedCategoryTab,
      appliedGroupIds,
      appliedOccurrenceKeys,
      isBulkConfirmOpen,
      isBulkApplying,
      isBulkResultOpen,
      bulkResult,
    } = this.state

    if (!report)
      return (
        <SemanticMessage
          type="NEUTRAL"
          message={t('tokenLint.report.empty')}
        />
      )

    const liveCoverage = computeLiveCoverage(
      report,
      appliedGroupIds,
      appliedOccurrenceKeys
    )

    // A fully resolved group has nothing left to audit; drop it before any
    // count or list below is built from it.
    const isGroupResolved = (group: DeviationGroup) =>
      appliedGroupIds.has(group.id)
    const visibleTiers = {
      exact: report.tiers.exact.filter((group) => !isGroupResolved(group)),
      near: report.tiers.near.filter((group) => !isGroupResolved(group)),
      orphan: report.tiers.orphan.filter((group) => !isGroupResolved(group)),
    }

    // The bulk banner only covers unambiguous exact groups — a tied group
    // is never auto-elected, and stays visible in the tier list to be
    // resolved one at a time once the user picks a candidate.
    const unambiguousExactGroups = visibleTiers.exact.filter(
      (group) => group.candidateTokens.length <= 1
    )
    const unambiguousOccurrenceCount = unambiguousExactGroups.reduce(
      (sum, group) => sum + group.occurrenceCount,
      0
    )
    const unambiguousGroupCount = unambiguousExactGroups.length

    // Derived from liveCoverage so a partially-resolved group's already-
    // applied occurrences don't keep counting as non-compliant.
    const totalNonCompliantOccurrenceCount =
      liveCoverage.auditableProperties - liveCoverage.compliantProperties

    // Groups actually rendered for the active category tab, computed once
    // so the empty-state check and the tier-section props stay in sync.
    const filteredExactGroups = this.filterGroupsByCategory(visibleTiers.exact)
    const filteredNearGroups = this.filterGroupsByCategory(visibleTiers.near)
    const filteredOrphanGroups = this.filterGroupsByCategory(
      visibleTiers.orphan
    )
    const visibleGroupCountForTab =
      filteredExactGroups.length +
      filteredNearGroups.length +
      filteredOrphanGroups.length

    // Coverage scoped to the active tab — used to tell apart the two
    // reasons the list can be empty: nothing auditable of this type exists
    // vs. every occurrence already matches an active token.
    const coverageForTab =
      selectedCategoryTab === 'ALL'
        ? {
            auditable: liveCoverage.auditableProperties,
            compliant: liveCoverage.compliantProperties,
          }
        : liveCoverage.byCategory[selectedCategoryTab]
    const hasNoAuditablePropertiesForTab = coverageForTab.auditable === 0
    const categoryLabel =
      selectedCategoryTab === 'ALL'
        ? ''
        : t(`tokenLint.setup.category.${selectedCategoryTab}`)

    const categoryTabs = [
      {
        id: 'ALL',
        label: t('tokenLint.report.category.all'),
        isUpdated: false,
      },
      ...CATEGORY_ORDER.filter((category) =>
        report.categories.includes(category)
      ).map((category) => ({
        id: category,
        label: t(`tokenLint.setup.category.${category}`),
        isUpdated: false,
      })),
    ]

    return (
      <>
        <Layout
          id="audit-report"
          column={[
            {
              node: (
                <>
                  <Section
                    title={
                      <SimpleItem
                        leftPartSlot={
                          <div className={layouts['snackbar--tight']}>
                            <Icon
                              type="PICTO"
                              iconName="list-detailed"
                            />
                            <SectionTitle
                              label={t('tokenLint.report.coverage.title')}
                              helper={t('tokenLint.report.coverage.helperText')}
                            />
                          </div>
                        }
                        isListItem={false}
                      />
                    }
                    body={[
                      {
                        node: (
                          <div className={layouts['stackbar--tight']}>
                            <div
                              className={doClassnames([
                                layouts['snackbar--tight'],
                                layouts['snackbar--baseline'],
                              ])}
                            >
                              <span
                                className={doClassnames([
                                  texts.type,
                                  texts['type--xlarge'],
                                  texts['type--bold'],
                                ])}
                              >
                                {t('tokenLint.report.coverage.rate', {
                                  rate: Math.round(
                                    liveCoverage.coverageRate * 100
                                  ),
                                })}
                              </span>
                              <span
                                className={doClassnames([
                                  texts.type,
                                  texts['type--secondary'],
                                ])}
                              >
                                {t(
                                  'tokenLint.report.coverage.nonCompliantCount',
                                  {
                                    count: totalNonCompliantOccurrenceCount,
                                  }
                                )}
                              </span>
                            </div>
                            <div
                              className={doClassnames([
                                layouts['snackbar--tight'],
                                layouts['snackbar--wrap'],
                              ])}
                              style={{ padding: 'var(--size-pos-xxsmall) 0' }}
                            >
                              {(
                                Object.entries(
                                  liveCoverage.byCategory
                                ) as Array<[string, { coverageRate: number }]>
                              ).map(([category, stat]) => (
                                <Chip
                                  key={category}
                                  isSolo
                                >
                                  {t(`tokenLint.setup.category.${category}`)} —{' '}
                                  {Math.round(stat.coverageRate * 100)}%
                                </Chip>
                              ))}
                            </div>
                          </div>
                        ),
                        spacingModifier: 'LARGE',
                      },
                      {
                        node: (
                          <Tabs
                            tabs={categoryTabs}
                            active={selectedCategoryTab}
                            isFlex
                            maxVisibleTabs={6}
                            action={this.handleCategoryTabChange}
                          />
                        ),
                        spacingModifier: 'LARGE',
                      },
                    ]}
                  />
                  {visibleGroupCountForTab > 0 ? (
                    <List
                      isFullHeight
                      isFullWidth
                      isTopBorderEnabled
                    >
                      <DeviationTierSection
                        {...this.props}
                        tier="EXACT"
                        groups={filteredExactGroups}
                        scope={report.scope}
                        categories={report.categories}
                        options={report.options}
                      />
                      <DeviationTierSection
                        {...this.props}
                        tier="NEAR"
                        groups={filteredNearGroups}
                        scope={report.scope}
                        categories={report.categories}
                        options={report.options}
                      />
                      <DeviationTierSection
                        {...this.props}
                        tier="ORPHAN"
                        groups={filteredOrphanGroups}
                        scope={report.scope}
                        categories={report.categories}
                        options={report.options}
                      />
                    </List>
                  ) : (
                    <List
                      isFullHeight
                      isFullWidth
                      isTopBorderEnabled
                      isMessage
                    >
                      <SemanticMessage
                        type={
                          hasNoAuditablePropertiesForTab ? 'NEUTRAL' : 'SUCCESS'
                        }
                        message={
                          hasNoAuditablePropertiesForTab
                            ? selectedCategoryTab === 'ALL'
                              ? t('tokenLint.report.emptyFilter.noAuditableAll')
                              : t(
                                  'tokenLint.report.emptyFilter.noAuditableCategory',
                                  { category: categoryLabel }
                                )
                            : selectedCategoryTab === 'ALL'
                              ? t(
                                  'tokenLint.report.emptyFilter.fullyCompliantAll'
                                )
                              : t(
                                  'tokenLint.report.emptyFilter.fullyCompliantCategory',
                                  { category: categoryLabel }
                                )
                        }
                      />
                    </List>
                  )}
                  <Feature
                    isActive={
                      unambiguousGroupCount > 0 &&
                      this.features.APPLY_ALL_EXACT_MATCHES.isActive() &&
                      !this.state.isBulkApplyingClosed
                    }
                  >
                    <SemanticMessage
                      type="SUCCESS"
                      message={t('tokenLint.report.applyAll.description', {
                        count: unambiguousOccurrenceCount,
                        groups: unambiguousGroupCount,
                      })}
                      actionsSlot={
                        <>
                          <Button
                            type="primary"
                            icon="draft"
                            label={t('tokenLint.report.applyAll.cta')}
                            isLoading={isBulkApplying}
                            isNew={this.features.APPLY_ALL_EXACT_MATCHES.isNew()}
                            action={this.handleOpenBulkConfirm}
                          />
                          <Feature isActive={!this.state.isBulkApplyingClosed}>
                            <Button
                              type="icon"
                              icon="close"
                              action={() =>
                                this.setState({ isBulkApplyingClosed: true })
                              }
                            />
                          </Feature>
                        </>
                      }
                      isAnchored
                      orientation="VERTICAL"
                    />
                  </Feature>
                </>
              ),
              typeModifier: 'BLANK',
            },
          ]}
          isFullHeight
          isFullWidth
        />

        <Feature isActive={isBulkConfirmOpen}>
          {document.getElementById('modal') &&
            createPortal(
              <Dialog
                title={t('tokenLint.report.applyAll.confirmTitle')}
                actions={{
                  primary: {
                    label: t('tokenLint.report.applyAll.confirmCta'),
                    state: unambiguousGroupCount === 0 ? 'DISABLED' : 'DEFAULT',
                    isAutofocus: true,
                    action: this.handleConfirmBulkApply,
                  },
                  secondary: {
                    label: t('tokenLint.report.applyAll.cancelCta'),
                    action: this.handleCloseBulkConfirm,
                  },
                }}
                onClose={this.handleCloseBulkConfirm}
              >
                <div className="dialog__text">
                  <p className={doClassnames([texts.type, 'popup__text'])}>
                    {t('tokenLint.report.apply.confirmCount', {
                      count: unambiguousOccurrenceCount,
                      groups: unambiguousGroupCount,
                    })}
                  </p>
                </div>
              </Dialog>,
              document.getElementById('modal') ?? document.createElement('app')
            )}
        </Feature>

        <Feature isActive={isBulkResultOpen && bulkResult !== null}>
          {bulkResult &&
            document.getElementById('modal') &&
            createPortal(
              <Dialog
                title={t('tokenLint.report.applyAll.resultTitle')}
                actions={{
                  primary: {
                    label: t('tokenLint.report.applyAll.resultClose'),
                    isAutofocus: true,
                    action: this.handleCloseBulkResult,
                  },
                }}
                onClose={this.handleCloseBulkResult}
              >
                <div className="dialog__text">
                  <p className={texts.type}>
                    {bulkResult.announcedCount === 0 &&
                    bulkResult.skipped.length === 0
                      ? t('tokenLint.report.applyAll.resultAlreadyCompliant')
                      : t('tokenLint.report.applyAll.resultSummary', {
                          applied: bulkResult.appliedCount,
                          announced: bulkResult.announcedCount,
                        })}
                  </p>
                  {bulkResult.skipped.length > 0 && (
                    <List>
                      {groupSkippedByReason(bulkResult.skipped).map(
                        ({ reason, items }) =>
                          COUNT_ONLY_SKIP_REASONS.has(reason) ? (
                            <SimpleItem
                              key={reason}
                              leftPartSlot={
                                <span className={texts.type}>
                                  {t(
                                    `tokenLint.report.applyAll.skippedSummary.${reason}`,
                                    { count: items.length }
                                  )}
                                </span>
                              }
                              isListItem
                            />
                          ) : (
                            <Fragment key={reason}>
                              <SimpleItem
                                leftPartSlot={
                                  <span
                                    className={doClassnames([
                                      texts.type,
                                      texts['type--bold'],
                                    ])}
                                  >
                                    {t(
                                      'tokenLint.report.applyAll.skippedGroupHeader',
                                      {
                                        count: items.length,
                                        reason: t(
                                          `tokenLint.report.apply.skippedReason.${reason}`
                                        ),
                                      }
                                    )}
                                  </span>
                                }
                                isListItem
                              />
                              {items.map((item, index) => (
                                <SimpleItem
                                  key={`${item.shapeId}-${item.propertyPath}-${index}`}
                                  leftPartSlot={
                                    <span
                                      className={doClassnames([
                                        texts.type,
                                        texts['type--secondary'],
                                      ])}
                                    >
                                      {item.shapeName}
                                    </span>
                                  }
                                  isListItem
                                  alignment="CENTER"
                                />
                              ))}
                            </Fragment>
                          )
                      )}
                    </List>
                  )}
                </div>
              </Dialog>,
              document.getElementById('modal') ?? document.createElement('app')
            )}
        </Feature>
      </>
    )
  }
}
