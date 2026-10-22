import { Feature, FeatureStatus } from '@unoff/utils'
import { Context, ContextItem, Editor, PlanStatus, Service } from '../types/app'

export const setContexts = (
  contextList: Array<Context>,
  planStatus: PlanStatus,
  features: Array<Feature<'COMPONENT_HANDOFF'>>,
  editor: Editor,
  service: Service,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  locales: (key: string, params?: Record<string, any> | undefined) => string
) => {
  const status = (featureName: string) =>
    new FeatureStatus({
      features: features,
      featureName: featureName,
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    })

  const featuresList = {
    DOCUMENTATION: status('DOCUMENTATION'),
    GENERATED: status('GENERATED'),
    OPTIONS: status('OPTIONS'),
  }

  const contexts: Array<ContextItem> = [
    {
      label: locales('handoff.contexts.documentation'),
      id: 'DOCUMENTATION',
      isUpdated: false,
      isNew: featuresList.DOCUMENTATION.isNew(),
      isActive: featuresList.DOCUMENTATION.isActive(),
    },
    {
      label: locales('handoff.contexts.generated'),
      id: 'GENERATED',
      isUpdated: false,
      isNew: featuresList.GENERATED.isNew(),
      isActive: featuresList.GENERATED.isActive(),
    },
    {
      label: locales('handoff.contexts.options'),
      id: 'OPTIONS',
      isUpdated: false,
      isNew: featuresList.OPTIONS.isNew(),
      isActive: featuresList.OPTIONS.isActive(),
    },
  ]

  const filteredContexts = contexts.filter((context) => {
    return contextList.includes(context.id) && context.isActive
  })

  return filteredContexts.sort((a, b) => {
    return contextList.indexOf(a.id) - contextList.indexOf(b.id)
  })
}
