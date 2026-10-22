import { PureComponent } from 'preact/compat'
import { Button, SemanticMessage } from '@unoff/ui'
import { WithTranslationProps } from '../components/WithTranslation'
import { sendAnnotationAction } from '../../utils/annotationActions'
import { $documentationsStatus, $pendingAction } from '../../stores/annotations'

interface OutdatedBannerState {
  outdatedCount: number
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
      outdatedCount: $documentationsStatus.get().outdatedCount,
      pendingAction: $pendingAction.get(),
    }
  }

  // Lifecycle
  componentDidMount = () => {
    this.unsubscribeStatus = $documentationsStatus.subscribe((value) =>
      this.setState({ outdatedCount: value.outdatedCount })
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
  handleUpdateAll = () =>
    sendAnnotationAction('UPDATE_DOCUMENTATIONS', { docIds: 'OUTDATED' })

  // Render
  render() {
    const { t } = this.props
    const { outdatedCount, pendingAction } = this.state

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
            isLoading={pendingAction === 'UPDATE_DOCUMENTATIONS'}
            action={this.handleUpdateAll}
          />
        }
        isAnchored
      />
    )
  }
}
