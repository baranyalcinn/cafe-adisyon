import { useEffect, useLayoutEffect, useState } from 'react'

export type ColorScheme = 'sage' | 'nordic' | 'violet' | 'canyon' | 'rose'

export interface ThemeContextType {
  isDark: boolean
  toggleTheme: () => void
  colorScheme: ColorScheme
  setColorScheme: (scheme: ColorScheme) => void
}

const DEFAULT_SCHEME: ColorScheme = 'sage'

const isColorScheme = (value: unknown): value is ColorScheme =>
  value === 'sage' ||
  value === 'nordic' ||
  value === 'violet' ||
  value === 'canyon' ||
  value === 'rose'

const normalizeColorScheme = (value: string | null): ColorScheme => {
  switch (value) {
    case 'emerald':
      return 'sage'
    case 'ocean':
      return 'nordic'
    case 'amber':
      return 'canyon'
    default:
      return isColorScheme(value) ? value : DEFAULT_SCHEME
  }
}

export function useTheme(): ThemeContextType {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : true
  })

  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(() => {
    const saved = localStorage.getItem('colorScheme')
    return normalizeColorScheme(saved)
  })

  // ✅ Tek effect: theme + scheme birlikte uygula (yarım state görünmez)
  useLayoutEffect(() => {
    const root = document.documentElement
    const normalized = normalizeColorScheme(colorScheme)

    root.classList.toggle('dark', isDark)
    root.setAttribute('data-scheme', normalized)

    localStorage.setItem('theme', isDark ? 'dark' : 'light')
    localStorage.setItem('colorScheme', normalized)

    if (normalized !== colorScheme) {
      setColorSchemeState(normalized)
    }

    // Debug için geçici açabilirsin:
    // console.log('[theme]', { isDark, normalized })
    // console.log('data-scheme=', root.getAttribute('data-scheme'))
    // console.log('--color-primary-rgb=', getComputedStyle(root).getPropertyValue('--color-primary-rgb'))
  }, [isDark, colorScheme])

  // (Opsiyonel) başka tab/pencere değiştirirse senkronize et
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'theme' && e.newValue) {
        setIsDark(e.newValue === 'dark')
      }
      if (e.key === 'colorScheme') {
        setColorSchemeState(normalizeColorScheme(e.newValue))
      }
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return {
    isDark,
    toggleTheme: () => setIsDark((prev) => !prev),
    colorScheme,
    setColorScheme: (scheme) => setColorSchemeState(normalizeColorScheme(scheme))
  }
}
