import { useEffect, useState } from 'react'
import { ThemeContext, type Theme } from '@/lib/theme-context'

const STORAGE_KEY = 'wakfuli-theme'

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return (stored as Theme) || 'system'
  })

  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme

  useEffect(() => {
    const root = document.documentElement

    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)

    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme, resolvedTheme])

  useEffect(() => {
    if (theme !== 'system') return

    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const root = document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(getSystemTheme())
    }

    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}


