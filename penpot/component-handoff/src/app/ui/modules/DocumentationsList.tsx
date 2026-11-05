import { PureComponent } from 'preact/compat'
import { doClassnames } from '@unoff/utils'
import {
  Button,
  Chip,
  Menu,
  Section,
  SectionTitle,
  SimpleItem,
  layouts,
  texts,
} from '@unoff/ui'
import { WithTranslationProps } from '../components/WithTranslation'
import { formatContractSummary } from '../../utils/contractSummary'
import { copyWithNotice } from '../../utils/clipboard'
import { GeneratedRow, buildGeneratedRows } from '../../utils/annotationRules'
import { sendAnnotationAction } from '../../utils/annotationActions'
import { buildAgentInstructions } from '../../utils/agentInstructions'
import { DocumentationsStatusData } from '../../types/annotations'
import { $documentationsStatus, $pendingAction } from '../../stores/annotations'

interface DocumentationsListState {
  status: DocumentationsStatusData
  pendingAction: string | null
}

export default class DocumentationsList extends PureComponent<
  WithTranslationProps,
  DocumentationsListState
> {
  private unsubscribeStatus: (() => void) | undefined
  private unsubscribePending: (() => void) | undefined

  constructor(props: WithTranslationProps) {
    super(props)
    this.state = {
      status: $documentationsStatus.get(),
      pendingAction: $pendingAction.get(),
    }
  }

  componentDidMount = () => {
    this.unsubscribeStatus = $documentationsStatus.subscribe((value) =>
      this.setState({ status: value })
    )
    this.unsubscribePending = $pendingAction.subscribe((value) =>
      this.setState({ pendingAction: value })
    )
  }

  componentWillUnmount = () => {
    if (this.unsubscribeStatus) this.unsubscribeStatus()
    if (this.unsubscribePending) this.unsubscribePending()
  }

  handleLocate = (docId: string) => () =>
    sendAnnotationAction('LOCATE_DOCUMENTATION', { docId })

  handleUpdate = (row: GeneratedRow) => () => {
    if (row.updateWith === 'DOCUMENTATION' && row.documentation !== null)
      sendAnnotationAction('UPDATE_DOCUMENTATIONS', {
        docIds: [row.documentation.docId],
      })
    else if (row.contract !== null)
      sendAnnotationAction('UPDATE_CONTRACTS', { keys: [row.contract.key] })
  }

  handleCopyContract = (key: string) => () =>
    sendAnnotationAction('GET_CONTRACT', { key })

  handleCopyInstructions = (key: string) => () =>
    void copyWithNotice(
      buildAgentInstructions(key),
      'handoff.copy.instructionsCopied',
      this.props.t
    )

  handleRemoveContract = (key: string) => () =>
    sendAnnotationAction('REMOVE_CONTRACT', { key })

  Hint = (props: { label: string }) => (
    <span className={doClassnames([texts.type, texts['type--secondary']])}>
      {props.label}
    </span>
  )

  Item = (row: GeneratedRow) => {
    const { t } = this.props
    const { pendingAction } = this.state
    const { documentation, contract } = row
    const isOrphan = documentation === null
    const source = (documentation ?? contract) as NonNullable<
      typeof documentation | typeof contract
    >
    const missing = source.missing
    const isBusy = pendingAction !== null
    const needsDocumentationUpdate =
      documentation !== null &&
      (documentation.outdated || documentation.missing)
    const generatedAt = source.generatedAt
    const lines = [
      [
        t(`handoff.documentations.kind.${source.target}`),
        documentation !== null
          ? (documentation.boardName ?? t('handoff.selection.noBoard'))
          : null,
        t('handoff.documentations.generated', {
          date: new Date(generatedAt).toLocaleDateString(),
        }),
      ]
        .filter((part): part is string => part !== null)
        .join(' · '),
      contract !== null
        ? `${t('handoff.documentations.contractLabel')} · ${formatContractSummary(contract.summary, t)}`
        : null,
    ].filter((line): line is string => line !== null)

    return (
      <div
        key={row.id}
        className={layouts['snackbar--large']}
        style={{ justifyContent: 'space-between' }}
      >
        <div
          className={doClassnames([
            layouts['stackbar--tight'],
            layouts['stackbar--fill'],
          ])}
          style={{ minWidth: 0 }}
        >
          <div className={layouts['snackbar--medium']}>
            <span className={doClassnames([texts.type, texts['type--bold']])}>
              {source.name}
            </span>
            {isOrphan && (
              <Chip state="INACTIVE">
                {t('handoff.documentations.tag.CONTRACT')}
              </Chip>
            )}
            {missing ? (
              <Chip state="INACTIVE">
                {t('handoff.documentations.missing')}
              </Chip>
            ) : row.outdated ? (
              <Chip>{t('handoff.documentations.outdated')}</Chip>
            ) : null}
          </div>
          {lines.map((line) => (
            <this.Hint
              key={line}
              label={line}
            />
          ))}
        </div>
        <div
          className={layouts['snackbar--medium']}
          style={{ flexShrink: 0 }}
        >
          {contract !== null && !missing && (
            <Menu
              id={`contract-menu-${contract.key}`}
              type="ICON"
              icon="draft"
              alignment="BOTTOM_RIGHT"
              helper={{ label: t('handoff.documentations.contractMenu') }}
              options={[
                {
                  type: 'OPTION',
                  label: t('handoff.documentations.copy'),
                  action: this.handleCopyContract(contract.key),
                },
                {
                  type: 'OPTION',
                  label: t('handoff.documentations.copyInstructions'),
                  action: this.handleCopyInstructions(contract.key),
                },
              ]}
            />
          )}
          {documentation !== null && !missing && (
            <Button
              type="icon"
              icon="target"
              helper={{ label: t('handoff.documentations.locate') }}
              action={this.handleLocate(documentation.docId)}
            />
          )}
          {(row.updateWith !== null || needsDocumentationUpdate) && (
            <Button
              type="secondary"
              label={t(
                documentation !== null && documentation.missing
                  ? 'handoff.documentations.remove'
                  : 'handoff.documentations.update'
              )}
              isDisabled={isBusy}
              isLoading={
                pendingAction === 'UPDATE_DOCUMENTATIONS' ||
                pendingAction === 'UPDATE_CONTRACTS'
              }
              action={this.handleUpdate(row)}
            />
          )}
          {isOrphan && contract !== null && (
            <Button
              type={contract.missing ? 'secondary' : 'icon'}
              icon={contract.missing ? undefined : 'trash'}
              label={
                contract.missing
                  ? t('handoff.documentations.remove')
                  : undefined
              }
              helper={{ label: t('handoff.documentations.removeContract') }}
              isDisabled={isBusy}
              isLoading={pendingAction === 'REMOVE_CONTRACT'}
              action={this.handleRemoveContract(contract.key)}
            />
          )}
        </div>
      </div>
    )
  }

  render() {
    const { t } = this.props
    const rows = buildGeneratedRows(this.state.status)

    return (
      <Section
        title={
          <SimpleItem
            leftPartSlot={
              <SectionTitle label={t('handoff.documentations.title')} />
            }
            isListItem={false}
            alignment="CENTER"
          />
        }
        body={
          rows.length === 0
            ? [
                {
                  node: <this.Hint label={t('handoff.documentations.empty')} />,
                  spacingModifier: 'LARGE' as const,
                },
              ]
            : rows.map((row) => ({
                node: this.Item(row),
                spacingModifier: 'LARGE' as const,
              }))
        }
      />
    )
  }
}
