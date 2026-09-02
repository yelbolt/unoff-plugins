import { PureComponent } from 'preact/compat'
import { FeatureStatus } from '@unoff/utils'
import {
  Bar,
  Button,
  Layout,
  List,
  SemanticMessage,
  SimpleItem,
  texts,
} from '@unoff/ui'
import { WithTranslationProps } from '../components/WithTranslation'
import { WithConfigProps } from '../components/WithConfig'
import Feature from '../components/Feature'
import { sendPluginMessage } from '../../utils/pluginMessage'
import { BaseProps, Editor, PlanStatus, Service } from '../../types/app'
import { ConfigContextType } from '../../config/ConfigContext'

interface LayerInspectorProps
  extends BaseProps, WithConfigProps, WithTranslationProps {}

interface LayerInfo {
  name: string
  type: string
  width: number
  height: number
  x: number
  y: number
  fill?: string
  opacity: number
}

interface LayerInspectorState {
  layerInfo: LayerInfo | null
  hasRequested: boolean
}

export default class LayerInspector extends PureComponent<
  LayerInspectorProps,
  LayerInspectorState
> {
  private messageHandler: ((e: Event) => void) | null = null

  static features = (
    planStatus: PlanStatus,
    config: ConfigContextType,
    service: Service,
    editor: Editor
  ) => ({
    INSPECT_SELECTION: new FeatureStatus({
      features: config.features,
      featureName: 'INSPECT_SELECTION',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
  })

  private get features() {
    return LayerInspector.features(
      this.props.planStatus,
      this.props.config,
      this.props.service,
      this.props.editor
    )
  }

  constructor(props: LayerInspectorProps) {
    super(props)
    this.state = {
      layerInfo: null,
      hasRequested: false,
    }
  }

  // Lifecycle
  componentDidMount = () => {
    this.messageHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.type === 'SET_SELECTION_INFO')
        this.setState({ layerInfo: detail.data, hasRequested: true })
    }
    window.addEventListener('platformMessage', this.messageHandler)
  }

  componentWillUnmount = () => {
    if (this.messageHandler)
      window.removeEventListener('platformMessage', this.messageHandler)
  }

  // Handlers
  handleInspect = () => {
    this.setState({ hasRequested: true })
    sendPluginMessage(
      {
        pluginMessage: { type: 'GET_SELECTION' },
      },
      '*'
    )
  }

  // Render
  render() {
    const { layerInfo, hasRequested } = this.state

    const properties = layerInfo
      ? [
          {
            key: 'name',
            label: this.props.t('template.layerInspector.properties.name'),
            value: layerInfo.name,
          },
          {
            key: 'type',
            label: this.props.t('template.layerInspector.properties.type'),
            value: layerInfo.type,
          },
          {
            key: 'width',
            label: this.props.t('template.layerInspector.properties.width'),
            value: `${layerInfo.width}`,
          },
          {
            key: 'height',
            label: this.props.t('template.layerInspector.properties.height'),
            value: `${layerInfo.height}`,
          },
          {
            key: 'x',
            label: this.props.t('template.layerInspector.properties.x'),
            value: `${layerInfo.x}`,
          },
          {
            key: 'y',
            label: this.props.t('template.layerInspector.properties.y'),
            value: `${layerInfo.y}`,
          },
          ...(layerInfo.fill
            ? [
                {
                  key: 'fill',
                  label: this.props.t(
                    'template.layerInspector.properties.fill'
                  ),
                  value: layerInfo.fill.toUpperCase(),
                  swatch: layerInfo.fill,
                },
              ]
            : []),
          {
            key: 'opacity',
            label: this.props.t('template.layerInspector.properties.opacity'),
            value: `${layerInfo.opacity}%`,
          },
        ]
      : []

    return (
      <Layout
        id="layer-inspector"
        column={[
          {
            node: (
              <Feature isActive={this.features.INSPECT_SELECTION.isActive()}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                  }}
                >
                  {!hasRequested && (
                    <SemanticMessage
                      type="NEUTRAL"
                      message={this.props.t('template.layerInspector.empty')}
                    />
                  )}
                  {hasRequested && !layerInfo && (
                    <SemanticMessage
                      type="WARNING"
                      message={this.props.t(
                        'template.layerInspector.noSelection'
                      )}
                      isAnchored
                    />
                  )}
                  {layerInfo && (
                    <List>
                      {properties.map((prop) => (
                        <SimpleItem
                          key={prop.key}
                          leftPartSlot={
                            <span
                              className={`${texts.type} ${texts['type--secondary']}`}
                            >
                              {prop.label}
                            </span>
                          }
                          rightPartSlot={
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--size-pos-xxsmall)',
                              }}
                            >
                              {'swatch' in prop && prop.swatch && (
                                <div
                                  style={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: 2,
                                    background: prop.swatch,
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                              <span className={texts.type}>{prop.value}</span>
                            </div>
                          }
                          alignment="CENTER"
                          isListItem
                        />
                      ))}
                    </List>
                  )}
                  <Bar
                    rightPartSlot={
                      <Button
                        type="primary"
                        icon="target"
                        label={this.props.t(
                          'template.layerInspector.cta.inspect'
                        )}
                        isNew={this.features.INSPECT_SELECTION.isNew()}
                        action={this.handleInspect}
                      />
                    }
                    border={['TOP']}
                  />
                </div>
              </Feature>
            ),
            typeModifier: 'BLANK',
          },
        ]}
        isFullHeight
        isFullWidth
      />
    )
  }
}
