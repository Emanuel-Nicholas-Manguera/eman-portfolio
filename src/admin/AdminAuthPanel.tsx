import { AdminIcon } from './AdminIcon'
import { useState } from 'react'
import { enrollAdminAuthenticator, signInAdmin, verifyAdminAuthenticator } from './auth'
import type { useAdminAuth } from './useAdminAuth'
import { AdminLoading } from './AdminLoading'

export function AdminAuthPanel({ auth }: { auth: ReturnType<typeof useAdminAuth> }) {
  const { view, busy, error, client, run } = auth
  const [showPassword, setShowPassword] = useState(false)
  const [code, setCode] = useState('')
  const [codePosition, setCodePosition] = useState(0)
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
    const submittedCode = String(fields.get('code') ?? '')
    void run(() => verifyAdminAuthenticator(client, factorId, submittedCode), 'Unable to verify that code. Please try again.')
    setCode('')
    setCodePosition(0)
  }

  if (view.stage === 'checking') return <AdminLoading />

  const errorMessage = error && <p className="admin-sign-in__error" role="alert">{error}</p>
  const isCodeForm = view.stage === 'enrolling' || view.stage === 'verify'

  return (
    <>
      <h1 id="sign-in-heading">{titles[view.stage]}</h1>
      <p className="admin-sign-in__intro">{descriptions[view.stage]}</p>
      {view.stage !== 'signedOut' && !isCodeForm && errorMessage}

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
          {errorMessage}
          <button className="admin-sign-in__submit" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}<AdminIcon name="right" />
          </button>
        </form>
      )}

      {view.stage === 'enroll' && <button className="admin-sign-in__submit" type="button" disabled={busy}
        onClick={() => { if (client) void run(() => enrollAdminAuthenticator(client), 'Unable to start authenticator setup. Please try again.') }}>
        {busy ? 'Preparing setup…' : 'Set up authenticator'}<AdminIcon name="right" />
      </button>}

      {view.stage === 'enrolling' && <div className="admin-sign-in__enrollment">
        <img className="admin-sign-in__qr" src={view.qr} alt="Scan this QR code with your authenticator app" />
        <details><summary>Can’t scan the code?</summary><p>Enter this setup key in your authenticator:</p><code>{view.secret}</code></details>
      </div>}

      {isCodeForm && (
        <form className="admin-sign-in__form" onSubmit={submitCode} aria-busy={busy}>
          {view.stage === 'verify' && (view.factors.length > 1 ? <>
            <label htmlFor="admin-factor">Authenticator</label>
            <select id="admin-factor" name="factor" disabled={busy}>{view.factors.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
          </> : <input type="hidden" name="factor" value={view.factors[0].id} />)}
          <label htmlFor="admin-code">Authenticator code</label>
          <div className="admin-sign-in__code">
            <input id="admin-code" name="code" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
              autoComplete="one-time-code" required disabled={busy} aria-describedby="code-help" value={code}
              onChange={(event) => {
                const input = event.currentTarget
                const digits = input.value.replace(/[^0-9]/g, '')
                setCode(digits)
                setCodePosition(Math.min(input.selectionStart ?? digits.length, digits.length))
              }}
              onSelect={(event) => setCodePosition(event.currentTarget.selectionStart ?? code.length)}
              onPaste={(event) => {
                const digits = event.clipboardData.getData('text').replace(/[^0-9]/g, '')
                if (digits.length !== 6) return
                event.preventDefault()
                setCode(digits)
                setCodePosition(6)
              }}
              onClick={(event) => {
                if (event.detail !== 1) return
                const input = event.currentTarget
                const { left, width } = input.getBoundingClientRect()
                const position = Math.max(0, Math.min(code.length, Math.floor((event.clientX - left) * 6 / width)))
                input.setSelectionRange(position, position)
                setCodePosition(position)
              }} />
            <div className="admin-sign-in__code-slots" aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => (
                <span key={index} data-active={index === Math.min(codePosition, 5)}>{code[index] || ''}</span>
              ))}
            </div>
          </div>
          <p id="code-help" className="admin-sign-in__notice">Use the current code from your authenticator app.</p>
          {errorMessage}
          <button className="admin-sign-in__submit" type="submit" disabled={busy}>{busy ? 'Verifying…' : 'Verify code'}<AdminIcon name="right" /></button>
        </form>
      )}

      {(view.stage === 'pending' || view.stage === 'error') && <button className="admin-sign-in__submit" type="button"
        disabled={busy} onClick={() => { void auth.refresh() }}>{busy ? 'Checking…' : 'Check access again'}</button>}

      {view.stage === 'ready' && <p className="admin-sign-in__identity">Signed in as <strong>{view.email}</strong></p>}
    </>
  )
}
