import { PureComponent } from 'preact/compat'
import { FeatureStatus } from '@unoff/utils'
import { Bar, Tabs } from '@unoff/ui'
import Welcome from '../contexts/Welcome'
import Examples from '../contexts/Examples'
import { WithTranslationProps } from '../components/WithTranslation'
import { WithConfigProps } from '../components/WithConfig'
import { setContexts } from '../../utils/setContexts'
import { PluginMessageData } from '../../types/messages'
import {
  BaseProps,
  Context,
  ContextItem,
  PlanStatus,
  Service,
  Editor,
} from '../../types/app'
import { ConfigContextType } from '../../config/ConfigContext'

interface TemplateProps
  extends BaseProps, WithConfigProps, WithTranslationProps {
  //
}

interface TemplateState {
  context: Context | ''
  isPrimaryLoading: boolean
  isSecondaryLoading: boolean
}

export default class Template extends PureComponent<
  TemplateProps,
  TemplateState
> {
  private contexts: Array<ContextItem>
  private theme: string | null

  static features = (
    planStatus: PlanStatus,
    config: ConfigContextType,
    service: Service,
    editor: Editor
  ) => ({
    MY_FEATURE: new FeatureStatus({
      features: config.features,
      featureName: 'MY_FEATURE',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
  })

  private get features() {
    return Template.features(
      this.props.planStatus,
      this.props.config,
      this.props.service,
      this.props.editor
    )
  }

  constructor(props: TemplateProps) {
    super(props)
    this.contexts = setContexts(
      ['WELCOME', 'EXAMPLES'],
      props.planStatus,
      props.config.features,
      props.editor,
      props.service,
      props.t
    )
    this.state = {
      context: this.contexts[0] !== undefined ? this.contexts[0].id : '',
      isPrimaryLoading: false,
      isSecondaryLoading: false,
    }
    this.theme = document.documentElement.getAttribute('data-theme')
  }

  // Lifecycle
  componentDidMount = () => {
    window.addEventListener(
      'platformMessage',
      this.handleMessage as EventListener
    )
  }

  componentDidUpdate(previousProps: Readonly<TemplateProps>): void {
    if (previousProps.t !== this.props.t) {
      this.contexts = setContexts(
        ['WELCOME', 'EXAMPLES'],
        this.props.planStatus,
        this.props.config.features,
        this.props.editor,
        this.props.service,
        this.props.t
      )

      this.forceUpdate()
    }
  }

  componentWillUnmount = () => {
    window.removeEventListener(
      'platformMessage',
      this.handleMessage as EventListener
    )
  }

  // Handlers
  handleMessage = (e: CustomEvent<PluginMessageData>) => {
    const path = e.detail

    const actions: {
      [action: string]: () => void
    } = {
      STOP_LOADER: () => {
        this.setState({
          isPrimaryLoading: false,
          isSecondaryLoading: false,
        })
      },
      DEFAULT: () => null,
    }

    return actions[path.type ?? 'DEFAULT']?.()
  }

  navHandler = (e: Event) =>
    this.setState({
      context: (e.currentTarget as HTMLElement).dataset.feature as Context,
    })

  // Renders
  render() {
    let fragment
    let isFlex = true

    switch (this.theme) {
      case 'figma':
        isFlex = false
        break
      case 'penpot':
        isFlex = true
        break
      case 'sketch':
        isFlex = false
        break
      case 'framer':
        isFlex = true
        break
      default:
        isFlex = true
    }

    switch (this.state.context) {
      case 'WELCOME': {
        fragment = <Welcome {...this.props} />
        break
      }
      case 'EXAMPLES': {
        fragment = <Examples {...this.props} />
        break
      }
    }

    return (
      <>
        <Bar
          leftPartSlot={
            <Tabs
              tabs={this.contexts}
              active={this.state.context ?? ''}
              isFlex={isFlex}
              maxVisibleTabs={2}
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
