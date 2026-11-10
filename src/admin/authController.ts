import type { AuthChangeEvent } from '@supabase/supabase-js'
import { authErrorMessage, type AuthView } from './auth.ts'

type ObservedSession = { userId: string; accessToken: string } | null
// Session events decide whether to refresh the UI, never whether to grant access.
// Only inspectAdminSession's server-verified result may open the dashboard.
export function createAuthController(options: {
  inspect: () => Promise<AuthView>
  onView: (view: AuthView) => void
  onBusy: (busy: boolean) => void
  onError: (message: string) => void
}) {
  let view: AuthView = { stage: 'checking' }
  let observed: ObservedSession = null
  let disposed = false
  let operation = 0
  let inFlight = false
  let timer: ReturnType<typeof setTimeout> | undefined
  function show(next: AuthView) { view = next; options.onView(next) }
  function cancel() { ++operation; inFlight = false }
  async function run(action: () => Promise<AuthView>, fallback: string, hideCurrent = false, failClosed = false) {
    if (disposed || inFlight) return
    const id = ++operation
    inFlight = true
    options.onBusy(true)
    options.onError('')
    if (hideCurrent) show({ stage: 'checking' })
    try {
      const next = await action()
      if (operation === id) show(next)
    } catch (cause) {
      if (operation === id) {
        options.onError(authErrorMessage(cause, fallback))
        if (hideCurrent || failClosed) show({ stage: 'error' })
      }
    } finally {
      if (operation === id) { inFlight = false; options.onBusy(false) }
    }
  }
  function refresh(background = false) {
    return run(options.inspect, 'Unable to check your session. Please try again.', !background, true)
  }
  function onAuthChange(event: AuthChangeEvent, next: ObservedSession) {
    if (disposed) return
    const changed = observed?.userId !== next?.userId || observed?.accessToken !== next?.accessToken
    observed = next
    if (event === 'INITIAL_SESSION') return
    if (event === 'SIGNED_OUT') {
      clearTimeout(timer)
      cancel()
      show({ stage: 'signedOut' })
      options.onError('')
      options.onBusy(false)
      return
    }
    const sameOwner = view.stage === 'ready' && view.userId === next?.userId
    // Supabase confirms the same session again on tab focus. Keep the mounted
    // dashboard (and any unsaved editor state) when its session is unchanged.
    if (event === 'SIGNED_IN' && sameOwner && !changed) return
    if (inFlight && !changed) return
    if (inFlight) cancel()
    const background = sameOwner && (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')
    if (!background) show({ stage: 'checking' })
    clearTimeout(timer)
    // Keep SDK callbacks synchronous to avoid nested Auth-lock deadlocks.
    timer = setTimeout(() => { void refresh(background) }, 0)
  }
  function signOut(action: () => Promise<AuthView>) {
    clearTimeout(timer)
    cancel()
    return run(action, 'Sign-out could not finish. Please try again.', true)
  }
  function start() { if (disposed) return; timer = setTimeout(() => { void refresh() }, 0) }
  function dispose() { disposed = true; clearTimeout(timer); cancel(); observed = null }
  return { run, refresh, onAuthChange, signOut, start, dispose }
}
