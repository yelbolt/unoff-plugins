import { PureComponent } from 'preact/compat'
import { Button, SemanticMessage } from '@unoff/ui'
import { WithTranslationProps } from '../components/WithTranslation'
import { sendAnnotationAction } from '../../utils/annotationActions'
import { $documentationsStatus, $pendingAction } from '../../stores/annotations'

interface OutdatedBannerState {
  documentations: number
  contracts: number
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
      documentations: $documentationsStatus.get().outdatedCount,
      contracts: $documentationsStatus.get().contractsOutdatedCount,
      pendingAction: $pendingAction.get(),
    }
  }

  // Lifecycle
  componentDidMount = () => {
    this.unsubscribeStatus = $documentationsStatus.subscribe((value) =>
      this.setState({
        documentations: value.outdatedCount,
        contracts: value.contractsOutdatedCount,
      })
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
  // Each kind is updated by its own request, only when it has something outdated.
  handleUpdateAll = () => {
    if (this.state.documentations > 0)
      sendAnnotationAction('UPDATE_DOCUMENTATIONS', { docIds: 'OUTDATED' })
    if (this.state.contracts > 0)
      sendAnnotationAction('UPDATE_CONTRACTS', { keys: 'OUTDATED' })
  }

  // Render
  render() {
    const { t } = this.props
    const { documentations, contracts, pendingAction } = this.state
    const outdatedCount = documentations + contracts

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
