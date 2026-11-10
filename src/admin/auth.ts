import type { SupabaseClient } from '@supabase/supabase-js'

export type AuthView =
  | { stage: 'signedOut' | 'checking' | 'unconfigured' | 'error' }
  | { stage: 'denied' | 'enroll' | 'pending'; email: string }
  | { stage: 'ready'; email: string; userId: string }
  | { stage: 'verify'; email: string; factors: { id: string; name: string }[] }
  | { stage: 'enrolling'; email: string; factorId: string; qr: string; secret: string }

export async function inspectAdminSession(client: SupabaseClient): Promise<AuthView> {
  const { data: session, error: sessionError } = await client.auth.getSession()
  if (sessionError) throw sessionError
  if (!session.session) return { stage: 'signedOut' }
  // Validate the user with Auth, then let the database decide access. Neither
  // stored session claims nor editable profile metadata can grant admin access.
  const { data: identity, error: identityError } = await client.auth.getUser()
  if (identityError) throw identityError
  if (!identity.user) return { stage: 'signedOut' }
  const email = identity.user.email ?? ''
  const { data: status, error } = await client.rpc('cms_auth_status')
  if (error) throw error
  switch (status) {
    case 'denied': return { stage: 'denied', email }
    case 'enroll': return { stage: 'enroll', email }
    case 'pending': return { stage: 'pending', email }
    case 'ready': return { stage: 'ready', email, userId: identity.user.id }
    case 'verify': {
      const { data, error: factorsError } = await client.auth.mfa.listFactors()
      if (factorsError) throw factorsError
      const factors = data.totp.filter((f) => f.status === 'verified')
        .map((f) => ({ id: f.id, name: f.friendly_name || 'Authenticator' }))
      if (!factors.length) throw new Error('Authenticator unavailable')
      return { stage: 'verify', email, factors }
    }
    default: throw new Error('Unrecognized access response')
  }
}

export async function signInAdmin(client: SupabaseClient, email: string, password: string) {
  const { error } = await client.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw error
  return inspectAdminSession(client)
}

export async function enrollAdminAuthenticator(client: SupabaseClient): Promise<AuthView> {
  const access = await inspectAdminSession(client)
  if (access.stage !== 'enroll') return access
  const { data: factors, error: factorsError } = await client.auth.mfa.listFactors()
  if (factorsError) throw factorsError
  // A reload discards the QR/secret. Replace only unfinished enrollments from
  // this UI; never remove a verified authenticator.
  for (const factor of factors.all) {
    if (factor.factor_type === 'totp' && factor.status === 'unverified'
      && factor.friendly_name === 'Portfolio authenticator') {
      const { error } = await client.auth.mfa.unenroll({ factorId: factor.id })
      if (error) throw error
    }
  }
  const { data, error } = await client.auth.mfa.enroll({
    factorType: 'totp', friendlyName: 'Portfolio authenticator', issuer: 'Emanuel Portfolio',
  })
  if (error) throw error
  const qr = data.totp.qr_code.startsWith('data:image/')
    ? data.totp.qr_code : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data.totp.qr_code)}`
  return { stage: 'enrolling', email: access.email, factorId: data.id, qr, secret: data.totp.secret }
}

export async function verifyAdminAuthenticator(client: SupabaseClient, factorId: string, code: string) {
  if (!/^\d{6}$/.test(code)) throw new Error('Enter a six-digit code')
  const { error } = await client.auth.mfa.challengeAndVerify({ factorId, code })
  if (error) throw error
  return inspectAdminSession(client)
}

export async function signOutAdmin(client: SupabaseClient): Promise<AuthView> {
  const { error } = await client.auth.signOut({ scope: 'local' })
  if (error) throw error
  return { stage: 'signedOut' }
}

export function authErrorMessage(error: unknown, fallback: string) {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : ''
  if (code === 'invalid_credentials' || code === 'email_not_confirmed') return 'Check your email and password, then try again.'
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') return 'Too many attempts. Please wait a moment and try again.'
  if (code === 'mfa_verification_failed') return 'That code wasn’t accepted. Enter the current code from your authenticator.'
  return fallback
}
