import { ComponentType, PureComponent } from 'preact/compat'
import { ConfigContext, ConfigContextType } from '../../config/ConfigContext'

export interface WithConfigProps {
  config: ConfigContextType
}

export const WithConfig = <P extends WithConfigProps>(
  WrappedComponent: ComponentType<P>
) => {
  return class WithConfigComponent extends PureComponent<
    Omit<P, keyof WithConfigProps>
  > {
    render() {
      return (
        <ConfigContext.Consumer>
          {(config) => {
            if (!config) throw new Error('Config context is undefined')
            return (
              <WrappedComponent
                {...(this.props as P)}
                config={config}
              />
            )
          }}
        </ConfigContext.Consumer>
      )
    }
  }
}
