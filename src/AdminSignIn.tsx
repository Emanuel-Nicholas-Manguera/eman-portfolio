import { useEffect, useState } from 'react'
import './App.css'
import './AdminSignIn.css'
import { AdminAuthPanel } from './admin/AdminAuthPanel'
import { useAdminAuth } from './admin/useAdminAuth'
import { AdminDashboard } from './admin/AdminDashboard'

export function AdminSignIn() {
  const auth = useAdminAuth()
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const themeAction = `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`

  useEffect(() => {
    const previousTitle = document.title
    document.title = auth.view.stage === 'ready' ? 'Studio · Emanuel Nicholas' : 'Sign in · Emanuel Nicholas'
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex, nofollow'
    document.head.append(robots)
    return () => {
      document.title = previousTitle
      robots.remove()
    }
  }, [auth.view.stage])

  if (auth.view.stage === 'ready' && auth.client) {
    return <AdminDashboard client={auth.client} email={auth.view.email} theme={theme}
      idleWarning={auth.idleWarning} onStaySignedIn={auth.staySignedIn}
      onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')} onSignOut={auth.signOut} />
  }

  return (
    <div className="portfolio admin-sign-in" data-theme={theme}>
      <div className="wallpaper" aria-hidden="true" />
      <div className="admin-sign-in__dots" aria-hidden="true" />

      <header className="admin-sign-in__header">
        <a className="wordmark" href="/" aria-label="Emanuel, home">emanuel.</a>
        <button className="theme-toggle" type="button" aria-label={themeAction}
          title={themeAction} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
          <svg className="theme-icon theme-icon--moon" viewBox="0 0 24 24" width="18" height="18"
            fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20.9 13.1A9 9 0 0 1 10.9 3.1a9 9 0 1 0 10 10Z" />
          </svg>
          <svg className="theme-icon theme-icon--sun" viewBox="0 0 24 24" width="18" height="18"
            fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
          </svg>
        </button>
      </header>

      <main className="admin-sign-in__main">
        <section className={`admin-sign-in__content${auth.view.stage === 'checking' ? ' admin-sign-in__content--checking' : ''}`} aria-labelledby="sign-in-heading">
          <p className="admin-sign-in__eyebrow">{auth.view.stage === 'checking' ? 'Portfolio studio' : 'Portfolio admin'}</p>
          {auth.idleTimedOut && auth.view.stage !== 'checking' && <p className="admin-sign-in__timeout" role="status">
            You were signed out after 10 minutes of inactivity. Sign in again to continue.
          </p>}
          <AdminAuthPanel auth={auth} />
        </section>
      </main>

      <footer className="admin-sign-in__footer">
        <span>Emanuel Nicholas</span><span>A space for your work.</span>
      </footer>
    </div>
  )
}
