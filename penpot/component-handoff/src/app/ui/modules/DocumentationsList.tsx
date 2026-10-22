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
import { sendAnnotationAction } from '../../utils/annotationActions'
import {
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

  // Renders
  Hint = (props: { label: string }) => (
    <span className={doClassnames([texts.type, texts['type--secondary']])}>
      {props.label}
    </span>
  )

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

    return (
      <div
        key={item.docId}
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
          <div
            className={layouts['snackbar--medium']}
          >
            <span className={doClassnames([texts.type, texts['type--bold']])}>
              {item.name}
            </span>
            {item.missing ? (
              <Chip state="INACTIVE">
                {t('handoff.documentations.missing')}
              </Chip>
            ) : item.outdated ? (
              <Chip>{t('handoff.documentations.outdated')}</Chip>
            ) : null}
          </div>
          <this.Hint label={details} />
        </div>
        <div
          className={layouts['snackbar--medium']}
          style={{ flexShrink: 0 }}
        >
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
        </div>
      </div>
    )
  }

  render() {
    const { t } = this.props
    const { items } = this.state.status

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
          items.length === 0
            ? [
                {
                  node: <this.Hint label={t('handoff.documentations.empty')} />,
                  spacingModifier: 'LARGE' as const,
                },
              ]
            : items.map((item) => ({
                node: this.Item(item),
                spacingModifier: 'LARGE' as const,
              }))
        }
      />
    )
  }
}
