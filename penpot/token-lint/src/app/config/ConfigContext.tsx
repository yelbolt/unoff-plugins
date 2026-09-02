import { useContext } from 'preact/hooks'
import { createContext } from 'preact'
import { Config } from '../types/config'
import type { ComponentChildren } from 'preact'

export type ConfigContextType = Config

export const ConfigContext = createContext<ConfigContextType | undefined>(
  undefined
)

interface ConfigProviderProps extends ConfigContextType {
  children: ComponentChildren
}

export const ConfigProvider = ({
  children,
  limits,
  env,
  information,
  plan,
  dbs,
  urls,
  versions,
  features,
  lang,
  fees,
}: ConfigProviderProps) => {
  return (
    <ConfigContext.Provider
      value={{
        limits,
        env,
        information,
        plan,
        dbs,
        urls,
        versions,
        features,
        lang,
        fees,
      }}
    >
      {children}
    </ConfigContext.Provider>
  )
}

export const useConfig = () => {
  const context = useContext(ConfigContext)
  if (!context)
    throw new Error('useConfig must be used within a ConfigProvider')
  return context
}
