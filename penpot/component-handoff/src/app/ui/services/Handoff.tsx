import { PureComponent } from 'preact/compat'
import { FeatureStatus } from '@unoff/utils'
import { Bar, Tabs } from '@unoff/ui'
import SelectionHeader from '../modules/SelectionHeader'
import Style from '../contexts/Style'
import Generated from '../contexts/Generated'
import Documentation from '../contexts/Document'
import { WithTranslationProps } from '../components/WithTranslation'
import { WithConfigProps } from '../components/WithConfig'
import Feature from '../components/Feature'
import { setContexts } from '../../utils/setContexts'
import {
  BaseProps,
  Context,
  ContextItem,
  Editor,
  PlanStatus,
  Service,
} from '../../types/app'
import { $documentationsStatus } from '../../stores/annotations'
import { ConfigContextType } from '../../config/ConfigContext'

interface HandoffProps
  extends BaseProps, WithConfigProps, WithTranslationProps {
  //
}

interface HandoffState {
  context: Context | ''
  outdatedCount: number
}

const CONTEXT_LIST: Array<Context> = [
  'DOCUMENTATION',
  'GENERATED',
  'OPTIONS',
]

export default class Handoff extends PureComponent<
  HandoffProps,
  HandoffState
> {
  private contexts: Array<ContextItem>
  private theme: string | null
  private unsubscribeStatus: (() => void) | undefined

  static features = (
    planStatus: PlanStatus,
    config: ConfigContextType,
    service: Service,
    editor: Editor
  ) => ({
    DOCUMENTATION: new FeatureStatus({
      features: config.features,
      featureName: 'DOCUMENTATION',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    GENERATED: new FeatureStatus({
      features: config.features,
      featureName: 'GENERATED',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    OPTIONS: new FeatureStatus({
      features: config.features,
      featureName: 'OPTIONS',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
  })

  private get features() {
    return Handoff.features(
      this.props.planStatus,
      this.props.config,
      this.props.service,
      this.props.editor
    )
  }

  constructor(props: HandoffProps) {
    super(props)
    this.contexts = setContexts(
      CONTEXT_LIST,
      props.planStatus,
      props.config.features,
      props.editor,
      props.service,
      props.t
    )
    this.state = {
      context: this.contexts[0] !== undefined ? this.contexts[0].id : '',
      outdatedCount: $documentationsStatus.get().outdatedCount,
    }
    this.theme = document.documentElement.getAttribute('data-theme')
  }

  // Lifecycle
  componentDidMount = () => {
    this.unsubscribeStatus = $documentationsStatus.subscribe((value) =>
      this.setState({ outdatedCount: value.outdatedCount })
    )
  }

  componentWillUnmount = () => {
    if (this.unsubscribeStatus) this.unsubscribeStatus()
  }

  componentDidUpdate(previousProps: Readonly<HandoffProps>): void {
    if (previousProps.t !== this.props.t) {
      this.contexts = setContexts(
        CONTEXT_LIST,
        this.props.planStatus,
        this.props.config.features,
        this.props.editor,
        this.props.service,
        this.props.t
      )

      this.forceUpdate()
    }
  }

  // Handlers
  navHandler = (e: Event) =>
    this.setState({
      context: (e.currentTarget as HTMLElement).dataset.feature as Context,
    })

  // Render
  render() {
    const isFlex = this.theme !== 'figma' && this.theme !== 'sketch'
    let fragment

    switch (this.state.context) {
      case 'DOCUMENTATION': {
        fragment = (
          <Feature isActive={this.features.DOCUMENTATION.isActive()}>
            <SelectionHeader {...this.props} />
            <Documentation {...this.props} />
          </Feature>
        )
        break
      }
      case 'GENERATED': {
        fragment = (
          <Feature isActive={this.features.GENERATED.isActive()}>
            <Generated t={this.props.t} />
          </Feature>
        )
        break
      }
      case 'OPTIONS': {
        fragment = (
          <Feature isActive={this.features.OPTIONS.isActive()}>
            <Style {...this.props} />
          </Feature>
        )
        break
      }
    }

    return (
      <>
        <Bar
          leftPartSlot={
            <Tabs
              tabs={this.contexts.map((context) =>
                context.id === 'GENERATED' && this.state.outdatedCount > 0
                  ? {
                      ...context,
                      label: this.props.t('handoff.contexts.generatedCount', {
                        count: this.state.outdatedCount,
                      }),
                      isUpdated: true,
                    }
                  : context
              )}
              active={this.state.context ?? ''}
              isFlex={isFlex}
              maxVisibleTabs={3}
              action={this.navHandler}
            />
          }
          border={['BOTTOM']}
        />
        <section className="context">{fragment}</section>
      </>
    )
  }
}
