import { useCallback, useEffect, useRef, useState } from 'react'
import { excludeOwnerActivity } from '../ownerActivity'
import { adminSupabase } from './client'
import { inspectAdminSession, signInAdmin, signOutAdmin, type AuthView } from './auth'
import { createAuthController } from './authController'
import { ADMIN_IDLE_STORAGE_KEY, createIdleSession, type IdleStatus } from './idleSession'

export function useAdminAuth() {
  const [view, setView] = useState<AuthView>({ stage: adminSupabase ? 'checking' : 'unconfigured' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [idleWarning, setIdleWarning] = useState<number | null>(null)
  const [idleTimedOut, setIdleTimedOut] = useState(false)
  const controller = useRef<ReturnType<typeof createAuthController> | null>(null)
  const continueSession = useRef<(() => void) | null>(null)

  useEffect(() => {
    const client = adminSupabase
    if (!client) return
    const idle = createIdleSession({
      read: () => window.sessionStorage.getItem(ADMIN_IDLE_STORAGE_KEY),
      write: (value) => window.sessionStorage.setItem(ADMIN_IDLE_STORAGE_KEY, value),
    })
    let timingOut = false
    function updateWarning(status: IdleStatus) {
      setIdleWarning(status.stage === 'warning' ? status.seconds : null)
    }
    const current = createAuthController({
      inspect: () => inspectAdminSession(client),
      prepare: async (next) => {
        if (next.stage !== 'ready') return next
        const status = idle.start(next.sessionId)
        // Check before mounting the workspace, so reload cannot reset or bypass
        // a deadline, including one passed while the laptop was asleep.
        if (status.stage === 'expired') {
          timingOut = true
          setIdleTimedOut(true)
          return signOutAdmin(client)
        }
        timingOut = false
        setIdleTimedOut(false)
        updateWarning(status)
        return next
      },
      onView: (next) => {
        if (next.stage === 'ready') {
          excludeOwnerActivity()
        } else {
          if (next.stage !== 'checking') idle.stop()
          setIdleWarning(null)
        }
        setView(next)
      },
      onBusy: setBusy, onError: setError,
    })
    const handleStatus = (status: IdleStatus) => {
      updateWarning(status)
      if (status.stage === 'expired' && !timingOut) {
        timingOut = true
        setIdleTimedOut(true)
        void current.signOut(() => signOutAdmin(client))
      }
    }
    const checkIdle = () => handleStatus(idle.status())
    const staySignedIn = () => handleStatus(idle.touch())
    const onActivity = (event: Event) => {
      if (event.isTrusted && !document.hidden) staySignedIn()
    }
    const onVisible = () => { if (!document.hidden) checkIdle() }
    const activityEvents = ['click', 'keydown', 'input', 'wheel', 'touchmove'] as const
    // Auth refreshes and tab focus are checks, never user activity.
    for (const event of activityEvents) window.addEventListener(event, onActivity, { passive: true, capture: true })
    window.addEventListener('focus', checkIdle)
    window.addEventListener('pageshow', checkIdle)
    document.addEventListener('visibilitychange', onVisible)
    const idleTimer = window.setInterval(checkIdle, 1000)
    continueSession.current = staySignedIn
    controller.current = current
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      current.onAuthChange(event, session ? { userId: session.user.id, accessToken: session.access_token } : null)
    })
    current.start()
    return () => {
      subscription.unsubscribe()
      clearInterval(idleTimer)
      for (const event of activityEvents) window.removeEventListener(event, onActivity, true)
      window.removeEventListener('focus', checkIdle)
      window.removeEventListener('pageshow', checkIdle)
      document.removeEventListener('visibilitychange', onVisible)
      idle.stop()
      current.dispose()
      controller.current = null
      continueSession.current = null
    }
  }, [])

  const run = useCallback((action: () => Promise<AuthView>, fallback: string, hideCurrent = false) => {
    return controller.current?.run(action, fallback, hideCurrent) ?? Promise.resolve()
  }, [])
  const signIn = useCallback((email: string, password: string) => {
    const client = adminSupabase
    if (!client) return
    return run(() => {
      setIdleTimedOut(false)
      return signInAdmin(client, email, password)
    }, 'Unable to sign in. Please check your connection and try again.')
  }, [run])
  const refresh = useCallback(() => controller.current?.refresh(), [])
  const signOut = useCallback(() => {
    const client = adminSupabase
    if (client) void controller.current?.signOut(() => signOutAdmin(client))
  }, [])
  const staySignedIn = useCallback(() => continueSession.current?.(), [])

  return { client: adminSupabase, view, busy, error, run, signIn, refresh, signOut, idleWarning, idleTimedOut, staySignedIn }
}
