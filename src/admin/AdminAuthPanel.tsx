import { useState } from 'react'
import { enrollAdminAuthenticator, signInAdmin, verifyAdminAuthenticator } from './auth'
import type { useAdminAuth } from './useAdminAuth'
import { AdminLoading } from './AdminLoading'

export function AdminAuthPanel({ auth }: { auth: ReturnType<typeof useAdminAuth> }) {
  const { view, busy, error, client, run } = auth
  const [showPassword, setShowPassword] = useState(false)
  const signedIn = !['signedOut', 'checking', 'unconfigured'].includes(view.stage)
  const titles = {
    signedOut: 'Welcome back.', checking: 'Checking sign-in…', unconfigured: 'Sign-in unavailable.',
    error: 'Connection interrupted.', denied: 'Access unavailable.', enroll: 'Secure your account.',
    enrolling: 'Add your authenticator.', verify: 'Verify it’s you.', pending: 'Almost ready.', ready: 'Welcome, Emanuel.',
  }
  const descriptions = {
    signedOut: 'A little care for what you’ve built.', checking: 'Please wait while we check your session.',
    unconfigured: 'Sign-in is temporarily unavailable. Please try again later.',
    error: 'We couldn’t confirm your access. Please try again.',
    denied: 'This account doesn’t have access to the portfolio admin.',
    enroll: 'Add an authenticator app to protect your portfolio.',
    enrolling: 'Scan the QR code with your authenticator, then enter its six-digit code.',
    verify: 'Enter the current six-digit code from your authenticator.',
    pending: 'Your authenticator is verified. One-time owner activation is pending.',
    ready: 'You’re securely signed in to your portfolio workspace.',
  }

  const submitCode: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    if (!client || busy || !['enrolling', 'verify'].includes(view.stage)) return
    const fields = new FormData(event.currentTarget)
    const factorId = view.stage === 'enrolling' ? view.factorId : String(fields.get('factor'))
    const code = String(fields.get('code') ?? '')
    void run(() => verifyAdminAuthenticator(client, factorId, code), 'Unable to verify that code. Please try again.')
    const input = event.currentTarget.elements.namedItem('code') as HTMLInputElement
    input.value = ''
  }

  if (view.stage === 'checking') return <AdminLoading />

  return (
    <>
      <h1 id="sign-in-heading">{titles[view.stage]}</h1>
      <p className="admin-sign-in__intro">{descriptions[view.stage]}</p>

      {view.stage === 'signedOut' && (
        <form className="admin-sign-in__form" aria-busy={busy} onSubmit={(event) => {
          event.preventDefault()
          if (!client || busy) return
          const fields = new FormData(event.currentTarget)
          const email = String(fields.get('email') ?? '')
          const password = String(fields.get('password') ?? '')
          void run(() => signInAdmin(client, email, password), 'Unable to sign in. Please check your connection and try again.')
          const input = event.currentTarget.elements.namedItem('password') as HTMLInputElement
          input.value = ''
          setShowPassword(false)
        }}>
          <label htmlFor="admin-email">Email address</label>
          <input id="admin-email" name="email" type="email" autoComplete="username" required disabled={busy}
            autoCapitalize="none" spellCheck={false} placeholder="you@example.com" />
          <label htmlFor="admin-password">Password</label>
          <div className="admin-sign-in__password">
            <input id="admin-password" name="password" type={showPassword ? 'text' : 'password'} required disabled={busy}
              autoComplete="current-password" placeholder="Enter your password" />
            <button type="button" disabled={busy} aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-controls="admin-password" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
                strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
                {showPassword && <path d="m3 3 18 18" />}
              </svg>
            </button>
          </div>
          <button className="admin-sign-in__submit" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}<span aria-hidden="true">↗</span>
          </button>
        </form>
      )}

      {view.stage === 'enroll' && <button className="admin-sign-in__submit" type="button" disabled={busy}
        onClick={() => { if (client) void run(() => enrollAdminAuthenticator(client), 'Unable to start authenticator setup. Please try again.') }}>
        {busy ? 'Preparing setup…' : 'Set up authenticator'}<span aria-hidden="true">↗</span>
      </button>}

      {view.stage === 'enrolling' && <div className="admin-sign-in__enrollment">
        <img className="admin-sign-in__qr" src={view.qr} alt="Scan this QR code with your authenticator app" />
        <details><summary>Can’t scan the code?</summary><p>Enter this setup key in your authenticator:</p><code>{view.secret}</code></details>
      </div>}

      {(view.stage === 'enrolling' || view.stage === 'verify') && (
        <form className="admin-sign-in__form" onSubmit={submitCode} aria-busy={busy}>
          {view.stage === 'verify' && (view.factors.length > 1 ? <>
            <label htmlFor="admin-factor">Authenticator</label>
            <select id="admin-factor" name="factor" disabled={busy}>{view.factors.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
          </> : <input type="hidden" name="factor" value={view.factors[0].id} />)}
          <label htmlFor="admin-code">Authenticator code</label>
          <input id="admin-code" name="code" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
            autoComplete="one-time-code" placeholder="000000" required disabled={busy} aria-describedby="code-help" />
          <p id="code-help" className="admin-sign-in__notice">Use the current code from your authenticator app.</p>
          <button className="admin-sign-in__submit" type="submit" disabled={busy}>{busy ? 'Verifying…' : 'Verify code'}<span aria-hidden="true">↗</span></button>
        </form>
      )}

      {(view.stage === 'pending' || view.stage === 'error') && <button className="admin-sign-in__submit" type="button"
        disabled={busy} onClick={() => { void auth.refresh() }}>{busy ? 'Checking…' : 'Check access again'}</button>}

      {view.stage === 'ready' && <p className="admin-sign-in__identity">Signed in as <strong>{view.email}</strong></p>}
      {error && <p className="admin-sign-in__error" role="alert">{error}</p>}
      {signedIn && <button className="admin-sign-in__sign-out" type="button" disabled={busy} onClick={auth.signOut}>Sign out</button>}
    </>
  )
}
