import { PureComponent } from 'preact/compat'
import { Layout } from '@unoff/ui'
import OutdatedBanner from '../modules/OutdatedBanner'
import DocumentationsList from '../modules/DocumentationsList'
import { WithTranslationProps } from '../components/WithTranslation'

export default class Generated extends PureComponent<WithTranslationProps> {
  render() {
    const { t } = this.props

    return (
      <Layout
        id="generated"
        column={[
          {
            node: (
              <div style={{ height: '100%', overflowY: 'auto' }}>
                <OutdatedBanner t={t} />
                <DocumentationsList t={t} />
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
