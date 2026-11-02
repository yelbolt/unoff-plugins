import { PureComponent } from 'preact/compat'
import { doClassnames } from '@unoff/utils'
import {
  Button,
  Chip,
  Section,
  SectionTitle,
  SimpleItem,
  layouts,
  texts,
} from '@unoff/ui'
import { WithTranslationProps } from '../components/WithTranslation'
import { formatContractSummary } from '../../utils/contractSummary'
import { sendAnnotationAction } from '../../utils/annotationActions'
import {
  ContractStatus,
  DocumentationsStatusData,
  DocumentationStatus,
} from '../../types/annotations'
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

  // Lifecycle
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

  // Handlers
  handleLocate = (docId: string) => () =>
    sendAnnotationAction('LOCATE_DOCUMENTATION', { docId })

  handleUpdate = (docId: string) => () =>
    sendAnnotationAction('UPDATE_DOCUMENTATIONS', { docIds: [docId] })

  handleCopyContract = (key: string) => () =>
    sendAnnotationAction('GET_CONTRACT', { key })

  handleUpdateContract = (key: string) => () =>
    sendAnnotationAction('UPDATE_CONTRACTS', { keys: [key] })

  handleRemoveContract = (key: string) => () =>
    sendAnnotationAction('REMOVE_CONTRACT', { key })

  // Renders
  Hint = (props: { label: string }) => (
    <span className={doClassnames([texts.type, texts['type--secondary']])}>
      {props.label}
    </span>
  )

  Row = (props: {
    id: string
    kind: 'DOCUMENTATION' | 'CONTRACT'
    name: string
    outdated: boolean
    missing: boolean
    details: string
    actions: preact.ComponentChildren
  }) => {
    const { t } = this.props

    return (
      <div
        key={props.id}
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
              {props.name}
            </span>
            <Chip state="INACTIVE">
              {t(`handoff.documentations.tag.${props.kind}`)}
            </Chip>
            {props.missing ? (
              <Chip state="INACTIVE">
                {t('handoff.documentations.missing')}
              </Chip>
            ) : props.outdated ? (
              <Chip>{t('handoff.documentations.outdated')}</Chip>
            ) : null}
          </div>
          <this.Hint label={props.details} />
        </div>
        <div className={layouts['snackbar--medium']} style={{ flexShrink: 0 }}>
          {props.actions}
        </div>
      </div>
    )
  }

  Item = (item: DocumentationStatus) => {
    const { t } = this.props
    const { pendingAction } = this.state
    const needsUpdate = item.outdated || item.missing
    const details = [
      t(`handoff.documentations.kind.${item.target}`),
      item.boardName ?? t('handoff.selection.noBoard'),
      t('handoff.documentations.generated', {
        date: new Date(item.generatedAt).toLocaleDateString(),
      }),
    ].join(' · ')

    return this.Row({
      id: `documentation-${item.docId}`,
      kind: 'DOCUMENTATION',
      name: item.name,
      outdated: item.outdated,
      missing: item.missing,
      details,
      actions: (
        <>
          {!item.missing && (
            <Button
              type="icon"
              icon="target"
              helper={{
                label: t('handoff.documentations.locate'),
              }}
              action={this.handleLocate(item.docId)}
            />
          )}
          {needsUpdate && (
            <Button
              type="secondary"
              label={t(
                item.missing
                  ? 'handoff.documentations.remove'
                  : 'handoff.documentations.update'
              )}
              isDisabled={pendingAction !== null}
              isLoading={pendingAction === 'UPDATE_DOCUMENTATIONS'}
              action={this.handleUpdate(item.docId)}
            />
          )}
        </>
      ),
    })
  }

  // A contract has no shape on the canvas: no locate action.
  ContractItem = (item: ContractStatus) => {
    const { t } = this.props
    const { pendingAction } = this.state
    const details = [
      t(`handoff.documentations.kind.${item.target}`),
      formatContractSummary(item.summary, t),
      t('handoff.documentations.generated', {
        date: new Date(item.generatedAt).toLocaleDateString(),
      }),
    ].join(' · ')

    return this.Row({
      id: `contract-${item.key}`,
      kind: 'CONTRACT',
      name: item.name,
      outdated: item.outdated,
      missing: item.missing,
      details,
      actions: (
        <>
          <Button
            type="icon"
            icon="copy"
            helper={{
              label: t('handoff.documentations.copy'),
            }}
            isDisabled={pendingAction !== null}
            action={this.handleCopyContract(item.key)}
          />
          {item.outdated && !item.missing && (
            <Button
              type="secondary"
              label={t('handoff.documentations.update')}
              isDisabled={pendingAction !== null}
              isLoading={pendingAction === 'UPDATE_CONTRACTS'}
              action={this.handleUpdateContract(item.key)}
            />
          )}
          <Button
            type={item.missing ? 'secondary' : 'icon'}
            icon={item.missing ? undefined : 'trash'}
            label={
              item.missing ? t('handoff.documentations.remove') : undefined
            }
            helper={{
              label: t('handoff.documentations.removeContract'),
            }}
            isDisabled={pendingAction !== null}
            isLoading={pendingAction === 'REMOVE_CONTRACT'}
            action={this.handleRemoveContract(item.key)}
          />
        </>
      ),
    })
  }

  render() {
    const { t } = this.props
    const { items, contracts } = this.state.status
    const isEmpty = items.length === 0 && contracts.length === 0

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
          isEmpty
            ? [
                {
                  node: <this.Hint label={t('handoff.documentations.empty')} />,
                  spacingModifier: 'LARGE' as const,
                },
              ]
            : [
                ...items.map((item) => ({
                  node: this.Item(item),
                  spacingModifier: 'LARGE' as const,
                })),
                ...contracts.map((item) => ({
                  node: this.ContractItem(item),
                  spacingModifier: 'LARGE' as const,
                })),
              ]
        }
      />
    )
  }
}
