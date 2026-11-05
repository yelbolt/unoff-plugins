import { PureComponent } from 'preact/compat'
import { Button, SemanticMessage } from '@unoff/ui'
import { WithTranslationProps } from '../components/WithTranslation'
import { GeneratedRow, buildGeneratedRows } from '../../utils/annotationRules'
import { sendAnnotationAction } from '../../utils/annotationActions'
import { $documentationsStatus, $pendingAction } from '../../stores/annotations'

interface OutdatedBannerState {
  rows: Array<GeneratedRow>
  pendingAction: string | null
}

export default class OutdatedBanner extends PureComponent<
  WithTranslationProps,
  OutdatedBannerState
> {
  private unsubscribeStatus: (() => void) | undefined
  private unsubscribePending: (() => void) | undefined

  constructor(props: WithTranslationProps) {
    super(props)
    this.state = {
      rows: buildGeneratedRows($documentationsStatus.get()),
      pendingAction: $pendingAction.get(),
    }
  }

  componentDidMount = () => {
    this.unsubscribeStatus = $documentationsStatus.subscribe((value) =>
      this.setState({ rows: buildGeneratedRows(value) })
    )
    this.unsubscribePending = $pendingAction.subscribe((value) =>
      this.setState({ pendingAction: value })
    )
  }

  componentWillUnmount = () => {
    if (this.unsubscribeStatus) this.unsubscribeStatus()
    if (this.unsubscribePending) this.unsubscribePending()
  }

  // A documentation update rewrites its contract too: a contract is updated on
  // its own only when its documentation is current (or not on the page).
  handleUpdateAll = () => {
    const { rows } = this.state
    const docIds = rows
      .filter((row) => row.updateWith === 'DOCUMENTATION')
      .map((row) => (row.documentation as { docId: string }).docId)
    const keys = rows
      .filter((row) => row.updateWith === 'CONTRACT')
      .map((row) => (row.contract as { key: string }).key)

    if (docIds.length > 0)
      sendAnnotationAction('UPDATE_DOCUMENTATIONS', { docIds })
    if (keys.length > 0) sendAnnotationAction('UPDATE_CONTRACTS', { keys })
  }

  render() {
    const { t } = this.props
    const { rows, pendingAction } = this.state
    const outdatedCount = rows.filter((row) => row.outdated).length

    if (outdatedCount === 0) return null

    return (
      <SemanticMessage
        type="INFO"
        message={t(
          outdatedCount === 1
            ? 'handoff.documentations.banner.one'
            : 'handoff.documentations.banner.other',
          { count: outdatedCount }
        )}
        actionsSlot={
          <Button
            type="primary"
            label={t('handoff.documentations.updateAll')}
            isDisabled={pendingAction !== null}
            isLoading={
              pendingAction === 'UPDATE_DOCUMENTATIONS' ||
              pendingAction === 'UPDATE_CONTRACTS'
            }
            action={this.handleUpdateAll}
          />
        }
        isAnchored
      />
    )
  }
}
