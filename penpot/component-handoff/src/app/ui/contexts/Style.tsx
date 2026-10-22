import { PureComponent } from 'preact/compat'
import { FeatureStatus, doClassnames } from '@unoff/utils'
import {
  Dropdown,
  FormItem,
  Input,
  Layout,
  Section,
  SectionTitle,
  SimpleItem,
  texts,
} from '@unoff/ui'
import { WithTranslationProps } from '../components/WithTranslation'
import { WithConfigProps } from '../components/WithConfig'
import Feature from '../components/Feature'
import { sendAnnotationAction } from '../../utils/annotationActions'
import { BaseProps, Editor, PlanStatus, Service } from '../../types/app'
import {
  AnnotationStyle,
  LabelPlacement,
  ScaleMode,
  Unit,
} from '../../types/annotations'
import { $annotationStyle } from '../../stores/annotations'
import { ConfigContextType } from '../../config/ConfigContext'

interface StyleProps extends BaseProps, WithConfigProps, WithTranslationProps {
  //
}

interface StyleState {
  draft: AnnotationStyle
  textSize: string
  remBase: string
}

const UNITS: Array<Unit> = ['px', 'rem']
const PLACEMENTS: Array<LabelPlacement> = ['AUTO', 'OUTSIDE', 'INSIDE']
const SCALE_MODES: Array<ScaleMode> = ['DESIGN', 'VIEWPORT']
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/
const AUTOSAVE_DELAY = 400

// Key-order independent, so a style sent by the UI and the one echoed back by
// the Canvas compare equal.
const normalize = (style: AnnotationStyle) =>
  JSON.stringify(
    Object.entries(style).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  )

export default class Style extends PureComponent<StyleProps, StyleState> {
  private unsubscribeStyle: (() => void) | undefined
  private saveTimer: ReturnType<typeof setTimeout> | undefined
  private lastSent: string | null = null

  static features = (
    planStatus: PlanStatus,
    config: ConfigContextType,
    service: Service,
    editor: Editor
  ) => ({
    SAVE_ANNOTATION_STYLE: new FeatureStatus({
      features: config.features,
      featureName: 'SAVE_ANNOTATION_STYLE',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
  })

  private get features() {
    return Style.features(
      this.props.planStatus,
      this.props.config,
      this.props.service,
      this.props.editor
    )
  }

  constructor(props: StyleProps) {
    super(props)
    const style = $annotationStyle.get()
    this.state = {
      draft: { ...style },
      textSize: String(style.textSize),
      remBase: String(style.remBase),
    }
  }

  // Lifecycle
  componentDidMount = () => {
    // The initial load from the Canvas fills the form. An echo of what was just
    // sent, or any update while the user is typing, never replaces the fields.
    this.unsubscribeStyle = $annotationStyle.listen((style) => {
      const incoming = normalize(style)
      if (incoming === this.lastSent) return
      if (this.saveTimer !== undefined || !this.isValid()) return

      this.lastSent = incoming
      this.setState({
        draft: { ...style },
        textSize: String(style.textSize),
        remBase: String(style.remBase),
      })
    })
  }

  componentWillUnmount = () => {
    this.flush()
    if (this.unsubscribeStyle) this.unsubscribeStyle()
  }

  // Helpers
  isColorValid = () => HEX_COLOR.test(this.state.draft.color)

  parsedTextSize = () => Number.parseFloat(this.state.textSize)

  parsedRemBase = () => Number.parseFloat(this.state.remBase)

  isValid = () => {
    const textSize = this.parsedTextSize()
    const remBase = this.parsedRemBase()

    return (
      this.isColorValid() &&
      Number.isFinite(textSize) &&
      textSize > 0 &&
      (this.state.draft.unit !== 'rem' ||
        (Number.isFinite(remBase) && remBase > 0))
    )
  }

  // Autosave
  save = (draft: AnnotationStyle, textSize: string, remBase: string) => {
    const size = Number.parseFloat(textSize)
    const base = Number.parseFloat(remBase)

    if (
      !HEX_COLOR.test(draft.color) ||
      !Number.isFinite(size) ||
      size <= 0 ||
      (draft.unit === 'rem' && !(Number.isFinite(base) && base > 0))
    )
      return

    const payload: AnnotationStyle = {
      ...draft,
      color: draft.color.toUpperCase(),
      textSize: size,
      remBase: draft.unit === 'rem' ? base : draft.remBase,
    }
    const serialized = normalize(payload)
    if (serialized === this.lastSent) return

    this.lastSent = serialized
    sendAnnotationAction('SET_ANNOTATION_STYLE', payload)
  }

  flush = () => {
    if (this.saveTimer !== undefined) {
      clearTimeout(this.saveTimer)
      this.saveTimer = undefined
    }
    const { draft, textSize, remBase } = this.state
    this.save(draft, textSize, remBase)
  }

  scheduleSave = () => {
    if (this.saveTimer !== undefined) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(this.flush, AUTOSAVE_DELAY)
  }

  // Handlers
  handleColorChange = (e: Event) => {
    const value = (e.currentTarget as HTMLInputElement).value
    this.setState(
      (previous) => ({
        draft: {
          ...previous.draft,
          color: value.startsWith('#') ? value : `#${value}`,
        },
      }),
      this.scheduleSave
    )
  }

  handleTextSizeChange = (e: Event) =>
    this.setState(
      { textSize: (e.currentTarget as HTMLInputElement).value },
      this.scheduleSave
    )

  handleRemBaseChange = (e: Event) =>
    this.setState(
      { remBase: (e.currentTarget as HTMLInputElement).value },
      this.scheduleSave
    )

  handleBlur = () => this.flush()

  // Dropdown choices are saved immediately.
  handleDraftChange = (changes: Partial<AnnotationStyle>) => () => {
    const draft = { ...this.state.draft, ...changes }

    this.setState({ draft }, () => {
      if (this.saveTimer !== undefined) {
        clearTimeout(this.saveTimer)
        this.saveTimer = undefined
      }
      this.save(draft, this.state.textSize, this.state.remBase)
    })
  }

  handleUnitChange = (unit: Unit) => this.handleDraftChange({ unit })

  handlePlacementChange = (labelPlacement: LabelPlacement) =>
    this.handleDraftChange({ labelPlacement })

  handleScaleModeChange = (scaleMode: ScaleMode) =>
    this.handleDraftChange({ scaleMode })

  // Renders
  Hint = (label: string) => (
    <span className={doClassnames([texts.type, texts['type--secondary']])}>
      {label}
    </span>
  )

  render() {
    const { t } = this.props
    const { draft, textSize, remBase } = this.state
    const isDisabled = this.features.SAVE_ANNOTATION_STYLE.isBlocked()

    return (
      <Layout
        id="style"
        column={[
          {
            node: (
              <div style={{ height: '100%', overflowY: 'auto' }}>
                <div>
                  <Section
                    title={
                      <SimpleItem
                        leftPartSlot={
                          <SectionTitle label={t('handoff.style.title')} />
                        }
                        isListItem={false}
                        alignment="CENTER"
                      />
                    }
                    body={[
                      {
                        node: (
                          <FormItem
                            id="style-color"
                            label={t('handoff.style.color.label')}
                            shouldFill
                          >
                            <Input
                              id="style-color"
                              type="COLOR"
                              value={draft.color}
                              state={this.isColorValid() ? 'DEFAULT' : 'ERROR'}
                              onChange={this.handleColorChange}
                              onPick={this.handleColorChange}
                              onBlur={this.handleBlur}
 isDisabled={isDisabled}
                            />
                          </FormItem>
                        ),
                        spacingModifier: 'LARGE' as const,
                      },
                      {
                        node: (
                          <FormItem
                            id="style-text-size"
                            label={t('handoff.style.textSize.label')}
                            shouldFill
                          >
                            <Input
                              id="style-text-size"
                              type="NUMBER"
                              min="6"
                              max="96"
                              step="1"
                              value={textSize}
                              onChange={this.handleTextSizeChange}
                              onBlur={this.handleBlur}
 isDisabled={isDisabled}
                            />
                          </FormItem>
                        ),
                        spacingModifier: 'LARGE' as const,
                      },
                      {
                        node: (
                          <FormItem
                            id="style-unit"
                            label={t('handoff.style.unit.label')}
                            shouldFill
                          >
                            <Dropdown
                              id="style-unit"
                              options={UNITS.map((value) => ({
                                label: t(`handoff.style.unit.${value}`),
                                value,
                                type: 'OPTION' as const,
                                action: this.handleUnitChange(value),
                              }))}
                              selected={draft.unit}
                              alignment="LEFT"
 isDisabled={isDisabled}
                              pin="TOP"
                            />
                          </FormItem>
                        ),
                        spacingModifier: 'LARGE' as const,
                      },
                    ]}
                    border={['BOTTOM']}
                  />
                  <Feature isActive={draft.unit === 'rem'}>
                    <Section
                      title={
                        <SimpleItem
                          leftPartSlot={
                            <SectionTitle
                              label={t('handoff.style.remBase.title')}
                            />
                          }
                          isListItem={false}
                          alignment="CENTER"
                        />
                      }
                      body={[
                        {
                          node: (
                            <FormItem
                              id="style-rem-base"
                              label={t('handoff.style.remBase.label')}
                              shouldFill
                            >
                              <Input
                                id="style-rem-base"
                                type="NUMBER"
                                min="1"
                                max="64"
                                step="1"
                                value={remBase}
                                onChange={this.handleRemBaseChange}
                                onBlur={this.handleBlur}
 isDisabled={isDisabled}
                              />
                            </FormItem>
                          ),
                          spacingModifier: 'LARGE' as const,
                        },
                        {
                          node: this.Hint(t('handoff.style.remBase.hint')),
                          spacingModifier: 'LARGE' as const,
                        },
                      ]}
                      border={['BOTTOM']}
                    />
                  </Feature>
                  <Section
                    title={
                      <SimpleItem
                        leftPartSlot={
                          <SectionTitle
                            label={t('handoff.style.placement.title')}
                          />
                        }
                        isListItem={false}
                        alignment="CENTER"
                      />
                    }
                    body={[
                      {
                        node: (
                          <Dropdown
                            id="style-placement"
                            options={PLACEMENTS.map((value) => ({
                              label: t(`handoff.style.placement.${value}`),
                              value,
                              type: 'OPTION' as const,
                              action: this.handlePlacementChange(value),
                            }))}
                            selected={draft.labelPlacement}
                            alignment="LEFT"
 isDisabled={isDisabled}
                            pin="TOP"
                          />
                        ),
                        spacingModifier: 'LARGE' as const,
                      },
                      {
                        node: this.Hint(
                          t(
                            `handoff.style.placement.hint.${draft.labelPlacement}`
                          )
                        ),
                        spacingModifier: 'LARGE' as const,
                      },
                    ]}
                    border={['BOTTOM']}
                  />
                  <Section
                    title={
                      <SimpleItem
                        leftPartSlot={
                          <SectionTitle
                            label={t('handoff.style.scale.title')}
                          />
                        }
                        isListItem={false}
                        alignment="CENTER"
                      />
                    }
                    body={[
                      {
                        node: (
                          <Dropdown
                            id="style-scale"
                            options={SCALE_MODES.map((value) => ({
                              label: t(`handoff.style.scale.${value}`),
                              value,
                              type: 'OPTION' as const,
                              action: this.handleScaleModeChange(value),
                            }))}
                            selected={draft.scaleMode}
                            alignment="LEFT"
 isDisabled={isDisabled}
                            pin="TOP"
                          />
                        ),
                        spacingModifier: 'LARGE' as const,
                      },
                      {
                        node: this.Hint(
                          t(`handoff.style.scale.hint.${draft.scaleMode}`)
                        ),
                        spacingModifier: 'LARGE' as const,
                      },
                    ]}
                  />
                </div>
              </div>
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
