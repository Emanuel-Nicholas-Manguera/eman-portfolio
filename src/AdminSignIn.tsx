import { useEffect, useState } from 'react'
import './App.css'
import './AdminSignIn.css'

export function AdminSignIn() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [showPassword, setShowPassword] = useState(false)
  const themeAction = `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Sign in · Emanuel Nicholas'
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex, nofollow'
    document.head.append(robots)
    return () => {
      document.title = previousTitle
      robots.remove()
    }
  }, [])

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
        <section className="admin-sign-in__content" aria-labelledby="sign-in-heading">
          <p className="admin-sign-in__eyebrow">Portfolio admin</p>
          <h1 id="sign-in-heading">Welcome back.</h1>
          <p className="admin-sign-in__intro">A little care for what you’ve built.</p>

          <form className="admin-sign-in__form" aria-describedby="sign-in-availability"
            onSubmit={(event) => event.preventDefault()}>
            <label htmlFor="admin-email">Email address</label>
            <input id="admin-email" name="email" type="email" autoComplete="username"
              autoCapitalize="none" spellCheck={false} placeholder="you@example.com" />

            <label htmlFor="admin-password">Password</label>
            <div className="admin-sign-in__password">
              <input id="admin-password" name="password" type={showPassword ? 'text' : 'password'}
                autoComplete="current-password" placeholder="Enter your password" />
              <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-controls="admin-password" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
                <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
                  strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                  {showPassword && <path d="m3 3 18 18" />}
                </svg>
              </button>
            </div>

            <button className="admin-sign-in__forgot" type="button" disabled>Forgot password?</button>
            <button className="admin-sign-in__submit" type="submit" disabled>
              Sign in
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
                strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 17 17 7M7 7h10v10" />
              </svg>
            </button>
            <p id="sign-in-availability" className="admin-sign-in__notice">Sign-in will be available after account setup.</p>
          </form>

          <a className="admin-sign-in__back" href="/">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
              strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m12 5-7 7 7 7M5 12h14" />
            </svg>
            Back to portfolio
          </a>
        </section>
      </main>

      <footer className="admin-sign-in__footer">
        <span>Emanuel Nicholas</span><span>A space for your work.</span>
      </footer>
    </div>
  )
}
