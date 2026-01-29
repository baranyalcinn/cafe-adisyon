import { useState, useEffect } from 'react'

export type ColorScheme = 'emerald' | 'ocean' | 'violet' | 'amber' | 'rose'

export interface ThemeContextType {
  isDark: boolean
  toggleTheme: () => void
  colorScheme: ColorScheme
  setColorScheme: (scheme: ColorScheme) => void
}

export function useTheme(): ThemeContextType {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : true
  })

  const [colorScheme, setColorScheme] = useState<ColorScheme>(
    () => (localStorage.getItem('colorScheme') as ColorScheme) || 'emerald'
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  useEffect(() => {
    document.documentElement.setAttribute('data-scheme', colorScheme)
    localStorage.setItem('colorScheme', colorScheme)
  }, [colorScheme])

  return { isDark, toggleTheme: () => setIsDark(!isDark), colorScheme, setColorScheme }
}
