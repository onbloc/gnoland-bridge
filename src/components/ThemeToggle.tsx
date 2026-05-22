import { ReactElement, useEffect, useState } from 'react'

const STORAGE_KEY = 'gnobridge.theme'

type Theme = 'light' | 'dark'

const readInitialTheme = (): Theme => {
  if (typeof document === 'undefined') return 'light'
  const fromDom = document.documentElement.dataset.theme
  if (fromDom === 'light' || fromDom === 'dark') return fromDom
  return 'light'
}

const ThemeToggle = (): ReactElement => {
  const [theme, setTheme] = useState<Theme>(readInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // localStorage unavailable; theme still applied in-session
    }
  }, [theme])

  const toggle = (): void =>
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))

  return (
    <button
      className="icon-btn"
      onClick={toggle}
      aria-label="Toggle theme"
      title={
        theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'
      }
    >
      {theme === 'light' ? (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      )}
    </button>
  )
}

export default ThemeToggle
