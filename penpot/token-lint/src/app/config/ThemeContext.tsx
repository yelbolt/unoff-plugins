import { useContext, useEffect } from 'preact/hooks'
import { createContext } from 'preact'
import type { ComponentChildren } from 'preact'

export type Theme = 'figma' | 'penpot' | 'sketch' | 'framer'
export type Mode =
  | 'figma-light'
  | 'figma-dark'
  | 'figjam'
  | 'penpot-light'
  | 'penpot-dark'
  | 'sketch-light'
  | 'sketch-dark'
  | 'framer-light'
  | 'framer-dark'

interface ThemeContextType {
  theme: Theme
  mode: Mode
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  theme: Theme
  mode: Mode
  children: ComponentChildren
}

export const ThemeProvider = ({
  theme,
  mode,
  children,
}: ThemeProviderProps) => {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-mode', mode)
  }, [theme, mode])

  return (
    <ThemeContext.Provider value={{ theme, mode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
