import { PureComponent } from 'preact/compat'
import {
  Icon,
  IconList,
  layouts,
  Section,
  SectionTitle,
  SimpleItem,
} from '@unoff/ui'
import { WithTranslationProps } from '../components/WithTranslation'
import { WithConfigProps } from '../components/WithConfig'
import { TokenCategory } from '../../types/tokens'
import { AuditOptions, AuditScope, DeviationGroup, DeviationTier } from '../../types/audit'
import { BaseProps } from '../../types/app'
import DeviationGroupRow from './DeviationGroupRow'

interface DeviationTierSectionProps
  extends BaseProps, WithConfigProps, WithTranslationProps {
  tier: DeviationTier
  groups: Array<DeviationGroup>
  scope: AuditScope
  categories: Array<TokenCategory>
  options: AuditOptions
}

const TIER_ICON: Record<DeviationTier, IconList> = {
  EXACT: 'check',
  NEAR: 'adjust',
  ORPHAN: 'help',
}

const TIER_TITLE_KEY: Record<DeviationTier, string> = {
  EXACT: 'tokenLint.report.tier.exact.title',
  NEAR: 'tokenLint.report.tier.near.title',
  ORPHAN: 'tokenLint.report.tier.orphan.title',
}

export default class DeviationTierSection extends PureComponent<
  DeviationTierSectionProps
> {
  // Render
  render() {
    const { tier, groups, scope, categories, options, t } = this.props

    if (groups.length === 0) return null

    return (
      <Section
        title={
          <SimpleItem
            leftPartSlot={
              <div
                className={layouts['snackbar--tight']}
                style={{ alignItems: 'center' }}
              >
                <Icon
                  type="PICTO"
                  iconName={TIER_ICON[tier]}
                />
                <SectionTitle
                  label={t(TIER_TITLE_KEY[tier])}
                  indicator={groups.length}
                />
              </div>
            }
            isListItem={false}
          />
        }
        body={groups.map((group) => ({
          node: (
            <DeviationGroupRow
              {...this.props}
              key={group.id}
              group={group}
              scope={scope}
              categories={categories}
              options={options}
            />
          ),
          spacingModifier: 'TIGHT',
        }))}
        border={['TOP']}
      />
    )
  }
}
