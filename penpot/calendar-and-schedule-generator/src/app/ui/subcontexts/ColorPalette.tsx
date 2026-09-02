import { PureComponent } from 'preact/compat'
import { FeatureStatus } from '@unoff/utils'
import { Bar, Button, Input, Layout, SemanticMessage } from '@unoff/ui'
import { WithTranslationProps } from '../components/WithTranslation'
import { WithConfigProps } from '../components/WithConfig'
import Feature from '../components/Feature'
import { sendPluginMessage } from '../../utils/pluginMessage'
import { BaseProps, Editor, PlanStatus, Service } from '../../types/app'
import { ConfigContextType } from '../../config/ConfigContext'

interface ColorPaletteProps
  extends BaseProps, WithConfigProps, WithTranslationProps {}

interface ColorPaletteState {
  inputValue: string
}

export default class ColorPalette extends PureComponent<
  ColorPaletteProps,
  ColorPaletteState
> {
  static features = (
    planStatus: PlanStatus,
    config: ConfigContextType,
    service: Service,
    editor: Editor
  ) => ({
    GENERATE_COLOR_PALETTE: new FeatureStatus({
      features: config.features,
      featureName: 'GENERATE_COLOR_PALETTE',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
  })

  private get features() {
    return ColorPalette.features(
      this.props.planStatus,
      this.props.config,
      this.props.service,
      this.props.editor
    )
  }

  constructor(props: ColorPaletteProps) {
    super(props)
    this.state = {
      inputValue: '#8F87F7',
    }
  }

  // Handlers
  handleInputChange = (e: Event) => {
    const value = (e.target as HTMLInputElement).value
    this.setState({
      inputValue: value,
    })
  }

  handleGenerate = () => {
    sendPluginMessage(
      {
        pluginMessage: {
          type: 'GENERATE_COLOR_PALETTE',
          data: { baseColor: this.state.inputValue },
        },
      },
      '*'
    )
  }

  // Render
  render() {
    const { inputValue } = this.state

    return (
      <Layout
        id="color-palette"
        column={[
          {
            node: (
              <Feature
                isActive={this.features.GENERATE_COLOR_PALETTE.isActive()}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                  }}
                >
                  <Bar
                    leftPartSlot={
                      <Input
                        type="COLOR"
                        value={inputValue}
                        placeholder={this.props.t(
                          'template.colorPalette.input.placeholder'
                        )}
                        onChange={this.handleInputChange}
                        onBlur={this.handleInputChange}
                      />
                    }
                    rightPartSlot={
                      <Button
                        type="primary"
                        icon="draft"
                        label={this.props.t(
                          'template.colorPalette.cta.generate'
                        )}
                        isNew={this.features.GENERATE_COLOR_PALETTE.isNew()}
                        action={this.handleGenerate}
                      />
                    }
                    border={['BOTTOM']}
                  />
                  <SemanticMessage
                    type="NEUTRAL"
                    message={this.props.t('template.colorPalette.empty')}
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
