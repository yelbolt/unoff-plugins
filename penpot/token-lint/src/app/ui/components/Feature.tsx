import { PureComponent } from 'preact/compat'
import type { ComponentChildren } from 'preact'

interface FeatureProps {
  isActive: boolean
  children: ComponentChildren
}

export default class Feature extends PureComponent<FeatureProps> {
  static defaultProps = {
    isActive: false,
    isPro: false,
  }

  render() {
    return <>{this.props.isActive && this.props.children}</>
  }
}
