import { ContractSummary } from '../types/annotations'

type Translate = (
  key: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: Record<string, any> | undefined
) => string

/** Props are omitted for a component. */
export const formatContractSummary = (
  summary: ContractSummary,
  t: Translate
): string =>
  [
    summary.props > 0
      ? t('handoff.contract.summary.props', { count: summary.props })
      : null,
    t('handoff.contract.summary.rules', { count: summary.rules }),
    t('handoff.contract.summary.tokenized', {
      percent: Math.round(summary.tokenizedShare * 100),
    }),
    t('handoff.contract.summary.exceptions', { count: summary.exceptions }),
  ]
    .filter((part): part is string => part !== null)
    .join(' · ')
