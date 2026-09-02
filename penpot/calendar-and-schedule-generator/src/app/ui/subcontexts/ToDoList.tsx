import { PureComponent } from 'preact/compat'
import { FeatureStatus } from '@unoff/utils'
import {
  Bar,
  Button,
  Input,
  Layout,
  layouts,
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
import {
  $canRedo,
  $canUndo,
  $itemsHistory,
  pushItems,
  redoItems,
  undoItems,
} from '../../stores/history'
import { ConfigContextType } from '../../config/ConfigContext'

interface ToDoListProps
  extends BaseProps, WithConfigProps, WithTranslationProps {
  //
}

interface ToDoListState {
  items: string[]
  canUndo: boolean
  canRedo: boolean
  inputValue: string
}

export default class ToDoList extends PureComponent<
  ToDoListProps,
  ToDoListState
> {
  private subscribeItemsHistory: (() => void) | null = null
  private subscribeCanUndo: (() => void) | null = null
  private subscribeCanRedo: (() => void) | null = null

  static features = (
    planStatus: PlanStatus,
    config: ConfigContextType,
    service: Service,
    editor: Editor
  ) => ({
    ADD_ITEM: new FeatureStatus({
      features: config.features,
      featureName: 'ADD_ITEM',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    GENERATE_TODO_ON_CANVAS: new FeatureStatus({
      features: config.features,
      featureName: 'GENERATE_TODO_ON_CANVAS',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
  })

  private get features() {
    return ToDoList.features(
      this.props.planStatus,
      this.props.config,
      this.props.service,
      this.props.editor
    )
  }

  constructor(props: ToDoListProps) {
    super(props)
    this.state = {
      items: [],
      canUndo: false,
      canRedo: false,
      inputValue: '',
    }
  }

  // Lifecycle
  componentDidMount = () => {
    this.subscribeItemsHistory = $itemsHistory.subscribe((value) =>
      this.setState({ items: [...value.present] })
    )
    this.subscribeCanUndo = $canUndo.subscribe((value) =>
      this.setState({ canUndo: value })
    )
    this.subscribeCanRedo = $canRedo.subscribe((value) =>
      this.setState({ canRedo: value })
    )
  }

  componentWillUnmount = () => {
    if (this.subscribeItemsHistory) this.subscribeItemsHistory()
    if (this.subscribeCanUndo) this.subscribeCanUndo()
    if (this.subscribeCanRedo) this.subscribeCanRedo()
  }

  // Handlers
  handleAddItem = () => {
    const trimmed = this.state.inputValue.trim()
    if (trimmed === '') return
    pushItems([...this.state.items, trimmed])
    this.setState({ inputValue: '' })
  }

  handleDeleteItem = (index: number) => () => {
    pushItems(this.state.items.filter((_, i) => i !== index))
  }

  handleGenerateOnCanvas = () =>
    sendPluginMessage(
      {
        pluginMessage: {
          type: 'GENERATE_TODO_ON_CANVAS',
          data: { items: this.state.items },
        },
      },
      '*'
    )

  // Render
  render() {
    const { items, canUndo, canRedo, inputValue } = this.state

    return (
      <Layout
        id="todo-list"
        column={[
          {
            node: (
              <Feature isActive={this.features.ADD_ITEM.isActive()}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                  }}
                >
                  <Bar
                    leftPartSlot={
                      <div className={layouts['snackbar--tight']}>
                        <Button
                          type="icon"
                          icon="undo"
                          isDisabled={!canUndo}
                          action={undoItems}
                        />
                        <Button
                          type="icon"
                          icon="redo"
                          isDisabled={!canRedo}
                          action={redoItems}
                        />
                        <Input
                          type="TEXT"
                          value={inputValue}
                          placeholder={this.props.t(
                            'template.ToDoList.input.placeholder'
                          )}
                          isFlex
                          onChange={(e) =>
                            this.setState({
                              inputValue: (e.target as HTMLInputElement).value,
                            })
                          }
                          onValid={this.handleAddItem}
                        />
                      </div>
                    }
                    rightPartSlot={
                      <Button
                        type="primary"
                        icon="plus"
                        label={this.props.t('template.ToDoList.cta.add')}
                        isDisabled={inputValue.trim() === ''}
                        isBlocked={this.features.ADD_ITEM.isReached(
                          this.state.items.length
                        )}
                        isNew={this.features.ADD_ITEM.isNew()}
                        action={this.handleAddItem}
                      />
                    }
                    border={['BOTTOM']}
                  />
                  {items.length === 0 ? (
                    <SemanticMessage
                      type="NEUTRAL"
                      message={this.props.t('template.ToDoList.empty')}
                    />
                  ) : (
                    <List>
                      {items.map((item, index) => (
                        <SimpleItem
                          key={index}
                          leftPartSlot={
                            <span className={texts.type}>{item}</span>
                          }
                          rightPartSlot={
                            <Button
                              type="icon"
                              icon="trash"
                              action={this.handleDeleteItem(index)}
                            />
                          }
                          alignment="CENTER"
                          isListItem
                        />
                      ))}
                    </List>
                  )}
                  {items.length > 0 && (
                    <Bar
                      rightPartSlot={
                        <Button
                          type="primary"
                          icon="draft"
                          label={this.props.t(
                            'template.ToDoList.cta.generateOnCanvas'
                          )}
                          isNew={this.features.GENERATE_TODO_ON_CANVAS.isNew()}
                          action={this.handleGenerateOnCanvas}
                        />
                      }
                      border={['TOP']}
                    />
                  )}
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
