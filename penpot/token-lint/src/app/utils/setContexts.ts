import { Feature, FeatureStatus } from '@unoff/utils'
import { Context, Editor, PlanStatus, Service } from '../types/app'

export const setContexts = (
  contextList: Array<Context>,
  planStatus: PlanStatus,
  features: Array<Feature<'TOKEN_LINT'>>,
  editor: Editor,
  service: Service,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  locales: (key: string, params?: Record<string, any> | undefined) => string
) => {
  const featuresList = {
    AUDIT_SETUP: new FeatureStatus({
      features: features,
      featureName: 'AUDIT_SETUP',
      planStatus: planStatus,
      currentService: service,
      currentEditor: editor,
    }),
    AUDIT_REPORT: new FeatureStatus({
      features: features,
      featureName: 'AUDIT_REPORT',
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
      label: locales('tokenLint.contexts.auditSetup'),
      id: 'AUDIT_SETUP',
      isUpdated: false,
      isNew: featuresList.AUDIT_SETUP.isNew(),
      isActive: featuresList.AUDIT_SETUP.isActive(),
    },
    {
      label: locales('tokenLint.contexts.auditReport'),
      id: 'AUDIT_REPORT',
      isUpdated: false,
      isNew: featuresList.AUDIT_REPORT.isNew(),
      isActive: featuresList.AUDIT_REPORT.isActive(),
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
