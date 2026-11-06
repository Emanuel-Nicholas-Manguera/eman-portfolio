import { useEffect, useState } from 'react'
import './App.css'

type Theme = 'light' | 'dark'

const navigationItems = ['Projects', 'Experience', 'Contact']

function App() {
  const [theme, setTheme] = useState<Theme>('light')
  const [isFloating, setIsFloating] = useState(() => window.scrollY >= 80)
  const themeAction = `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`

  useEffect(() => {
    const updateHeader = () => {
      if (window.scrollY >= 80) {
        setIsFloating(true)
      } else if (window.scrollY <= 8) {
        // Keep the bar floating until the visitor returns to the top.
        setIsFloating(false)
      }
    }

    window.addEventListener('scroll', updateHeader, { passive: true })
    return () => window.removeEventListener('scroll', updateHeader)
  }, [])

  return (
    <div className="portfolio" data-theme={theme} id="top">
      <div className="wallpaper" aria-hidden="true" />

      <header className="site-header" data-floating={isFloating}>
        <div className="header-content">
          <a className="wordmark" href="#top" aria-label="Emanuel, home">
            emanuel.
          </a>

          <nav className="site-nav" aria-label="Main navigation">
            {/* Add section links as each part of the portfolio is built. */}
            {navigationItems.map((label) => (
              <a
                key={label}
                role="link"
                aria-disabled="true"
                aria-label={`${label}, coming soon`}
                title={`${label} section coming soon`}
              >
                {label}
              </a>
            ))}
          </nav>

          <button
            className="theme-toggle"
            type="button"
            aria-label={themeAction}
            title={themeAction}
            onClick={() =>
              setTheme((current) => current === 'light' ? 'dark' : 'light')
            }
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.65"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              {theme === 'light' ? (
                <path d="M20.9 13.1A9 9 0 0 1 10.9 3.1a9 9 0 1 0 10 10Z" />
              ) : (
                <>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
                </>
              )}
            </svg>
          </button>
        </div>
      </header>
    </div>
  )
}

export default App
