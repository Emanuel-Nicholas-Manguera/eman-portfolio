import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { PortfolioBody } from './PortfolioBody'
import { usePortfolio } from './cms/usePortfolio'
import { PortfolioLoading } from './PortfolioLoading'
import { usePortfolioActivity } from './usePortfolioActivity'
import { usePortfolioStartup } from './usePortfolioStartup'
import { HeaderNavigation } from './HeaderNavigation'
import './App.css'
import type { SocialId } from './socialData'

type Theme = 'light' | 'dark'

function App() {
  const {data,failed} = usePortfolio()
  const startup = usePortfolioStartup(!!data, failed, data?.introduction?.suitSrc)
  const navigation = [ ...(data?.experiences.length ? ['Experience'] : []), ...(data?.projects.length ? ['Projects'] : []), ...(data?.contact ? ['Contact'] : []) ]
  const [theme, setTheme] = useState<Theme>('light')
  const [social, setSocial] = useState<SocialId | null>(null)
  const [isFloating, setIsFloating] = useState(() => window.scrollY >= 80)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const headerRef = useRef<HTMLElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const initialSection = useRef(window.location.hash)
  const themeAction = `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`
  usePortfolioActivity(startup.revealed && !!data)

  useLayoutEffect(() => {
    if (!data || !initialSection.current) return
    const hash = initialSection.current
    initialSection.current = ''
    if (hash !== window.location.hash) return
    if (performance.getEntriesByType('navigation').some(
      (entry) => (entry as PerformanceNavigationTiming).type === 'back_forward',
    )) return

    // The browser may have looked for the linked section before React mounted it.
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'instant' })
  }, [data])

  useEffect(() => {
    const updateHeader = () => {
      const threshold = Math.max(120, window.innerHeight * .3)
      let current: string | null = null
      for (const id of ['experience', 'projects', 'contact']) {
        const section = document.getElementById(id)
        if (section && section.getBoundingClientRect().top <= threshold) current = id
      }
      // The final section may be too short to reach the normal threshold.
      if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        current = document.getElementById('contact') ? 'contact' : current
      }
      setActiveSection(current)
      if (window.scrollY >= 80) {
        setIsFloating(true)
      } else if (window.scrollY <= 8) {
        // Keep the bar floating until the visitor returns to the top.
        setIsFloating(false)
      }
    }

    updateHeader()
    window.addEventListener('scroll', updateHeader, { passive: true })
    window.addEventListener('resize', updateHeader)
    return () => {
      window.removeEventListener('scroll', updateHeader)
      window.removeEventListener('resize', updateHeader)
    }
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
    <div className="portfolio" data-theme={theme} data-social={social ?? undefined} id="top">
      <div className="wallpaper" aria-hidden="true">
        {(['github', 'linkedin', 'gmail'] as const).map((id) => (
          <div key={id} className={`social-wallpaper social-wallpaper--${id}`} />
        ))}
      </div>

      <PortfolioLoading phase={startup.phase} />
      <div className="portfolio-content" data-ready={startup.revealed} data-revealing={startup.phase === 'revealing'} inert={!startup.revealed} aria-hidden={!startup.revealed}>
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
            <HeaderNavigation items={navigation} activeSection={activeSection} />
          </nav>

          <div className="header-actions">
            <button
              className="theme-toggle"
              type="button"
              aria-label={themeAction}
              title={themeAction}
              onClick={() => {
                setTheme((current) => current === 'light' ? 'dark' : 'light')
                setSocial(null)
              }}
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
          <HeaderNavigation items={navigation} activeSection={activeSection} onNavigate={() => setIsMenuOpen(false)} />
        </nav>
      </header>

      <main className="main-content">
        {data ? <PortfolioBody introductionReady={startup.revealed} data={data} social={social} onSocialSelect={setSocial} /> : <p className="portfolio-loading" role="status">{failed || startup.timedOut ? 'The portfolio is temporarily unavailable. Please refresh to try again.' : ''}</p>}
      </main>
      </div>
    </div>
  )
}

export default App
