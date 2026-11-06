import { useEffect, useRef, useState } from 'react'
import { Introduction, SelectedWork } from './Introduction'
import './App.css'

type Theme = 'light' | 'dark'

const navigationItems = ['Projects', 'Experience', 'Contact']

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  // Add section links as each part of the portfolio is built.
  return navigationItems.map((label) => (
    <a
      key={label}
      href={label === 'Projects' ? '#projects' : undefined}
      role="link"
      aria-disabled={label === 'Projects' ? undefined : true}
      aria-label={label === 'Projects' ? undefined : `${label}, coming soon`}
      title={label === 'Projects' ? undefined : `${label} section coming soon`}
      onClick={label === 'Projects' ? onNavigate : undefined}
    >
      {label}
    </a>
  ))
}

function App() {
  const [theme, setTheme] = useState<Theme>('light')
  const [isFloating, setIsFloating] = useState(() => window.scrollY >= 80)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
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

  useEffect(() => {
    if (!isMenuOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }

    const mobileViewport = window.matchMedia('(max-width: 580px)')
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (!event.matches) setIsMenuOpen(false)
    }

    document.addEventListener('keydown', closeOnEscape)
    document.addEventListener('pointerdown', closeOnOutsidePress)
    mobileViewport.addEventListener('change', closeOnDesktop)

    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('pointerdown', closeOnOutsidePress)
      mobileViewport.removeEventListener('change', closeOnDesktop)
    }
  }, [isMenuOpen])

  return (
    <div className="portfolio" data-theme={theme} id="top">
      <div className="wallpaper" aria-hidden="true" />

      <header ref={headerRef} className="site-header" data-floating={isFloating}>
        <div className="header-content">
          <a
            className="wordmark"
            href="#top"
            aria-label="Emanuel, home"
            onClick={() => setIsMenuOpen(false)}
          >
            emanuel.
          </a>

          <nav className="site-nav" aria-label="Main navigation">
            <NavigationLinks />
          </nav>

          <div className="header-actions">
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
                className="theme-icon theme-icon--moon"
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
                <path d="M20.9 13.1A9 9 0 0 1 10.9 3.1a9 9 0 1 0 10 10Z" />
              </svg>
              <svg
                className="theme-icon theme-icon--sun"
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
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
              </svg>
            </button>
            <button
              ref={menuButtonRef}
              className="menu-toggle"
              type="button"
              aria-label={isMenuOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setIsMenuOpen((current) => !current)}
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.65"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d={isMenuOpen ? 'M6 6l12 12M6 18 18 6' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
          </div>
        </div>
        <nav
          id="mobile-navigation"
          className="mobile-nav"
          aria-label="Main navigation"
          hidden={!isMenuOpen}
        >
          <NavigationLinks onNavigate={() => setIsMenuOpen(false)} />
        </nav>
      </header>

      <main className="main-content">
        <Introduction />
        <SelectedWork />
      </main>
    </div>
  )
}

export default App
