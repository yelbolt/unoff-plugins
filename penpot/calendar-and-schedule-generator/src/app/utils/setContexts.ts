import { Feature, FeatureStatus } from '@unoff/utils'
import { Context, Editor, PlanStatus, Service } from '../types/app'

export const setContexts = (
  contextList: Array<Context>,
  planStatus: PlanStatus,
  features: Array<Feature<'MY_SERVICE'>>,
  editor: Editor,
  service: Service,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  locales: (key: string, params?: Record<string, any> | undefined) => string
) => {
  const featuresList = {
    WELCOME: new FeatureStatus({
      features: features,
      featureName: 'WELCOME',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    EXAMPLES: new FeatureStatus({
      features: features,
      featureName: 'EXAMPLES',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    EXAMPLES_TODO_LIST: new FeatureStatus({
      features: features,
      featureName: 'EXAMPLES_TODO_LIST',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    EXAMPLES_COLOR_PALETTE: new FeatureStatus({
      features: features,
      featureName: 'EXAMPLES_COLOR_PALETTE',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    EXAMPLES_LAYER_INSPECTOR: new FeatureStatus({
      features: features,
      featureName: 'EXAMPLES_LAYER_INSPECTOR',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
  }

  const contexts: Array<{
    label: string
    id: Context
    isUpdated: boolean
    isNew: boolean
    isActive: boolean
  }> = [
    {
      label: locales('template.contexts.firstContext'),
      id: 'WELCOME',
      isUpdated: false,
      isNew: featuresList.WELCOME.isNew(),
      isActive: featuresList.WELCOME.isActive(),
    },
    {
      label: locales('template.contexts.secondContext'),
      id: 'EXAMPLES',
      isUpdated: false,
      isNew: featuresList.EXAMPLES.isNew(),
      isActive: featuresList.EXAMPLES.isActive(),
    },
    {
      label: locales('template.subcontexts.toDoList'),
      id: 'EXAMPLES_TODO_LIST',
      isUpdated: false,
      isNew: featuresList.EXAMPLES_TODO_LIST.isNew(),
      isActive: featuresList.EXAMPLES_TODO_LIST.isActive(),
    },
    {
      label: locales('template.subcontexts.colorPalette'),
      id: 'EXAMPLES_COLOR_PALETTE',
      isUpdated: false,
      isNew: featuresList.EXAMPLES_COLOR_PALETTE.isNew(),
      isActive: featuresList.EXAMPLES_COLOR_PALETTE.isActive(),
    },
    {
      label: locales('template.subcontexts.layerInspector'),
      id: 'EXAMPLES_LAYER_INSPECTOR',
      isUpdated: false,
      isNew: featuresList.EXAMPLES_LAYER_INSPECTOR.isNew(),
      isActive: featuresList.EXAMPLES_LAYER_INSPECTOR.isActive(),
    },
    // Add more contexts as needed
  ]

  const filteredContexts = contexts.filter((context) => {
    return contextList.includes(context.id) && context.isActive
  })

  return filteredContexts.sort((a, b) => {
    return contextList.indexOf(a.id) - contextList.indexOf(b.id)
  })
}
