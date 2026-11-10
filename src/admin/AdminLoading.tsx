import '../App.css'
import '../AdminSignIn.css'
import './AdminLoading.css'

export function AdminLoading() {
  return (
    <div className="admin-loading" role="status" aria-live="polite">
      <div className="admin-loading__illustration" aria-hidden="true">
        <span className="admin-loading__halo" />
        <span className="admin-loading__orbit" />
        <span className="admin-loading__tile">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="10" width="14" height="11" rx="3" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3M12 15v2" />
          </svg>
        </span>
      </div>
      <h1 id="sign-in-heading">Checking sign-in…</h1>
      <p className="admin-loading__description">Verifying your session and preparing your workspace.</p>
    </div>
  )
}

// Use the same loading treatment while the admin bundle itself is arriving.
export function AdminLoadingScreen() {
  return (
    <div className="portfolio admin-sign-in" data-theme="light">
      <div className="wallpaper" aria-hidden="true" />
      <div className="admin-sign-in__dots" aria-hidden="true" />
      <header className="admin-sign-in__header">
        <a className="wordmark" href="/" aria-label="Emanuel, home">emanuel.</a>
      </header>
      <main className="admin-sign-in__main">
        <section className="admin-sign-in__content admin-sign-in__content--checking" aria-labelledby="sign-in-heading">
          <p className="admin-sign-in__eyebrow">Portfolio studio</p>
          <AdminLoading />
        </section>
      </main>
      <footer className="admin-sign-in__footer">
        <span>Emanuel Nicholas</span><span>A space for your work.</span>
      </footer>
    </div>
  )
}
