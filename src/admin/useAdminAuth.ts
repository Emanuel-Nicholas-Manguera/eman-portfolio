import { useCallback, useEffect, useRef, useState } from 'react'
import { adminSupabase } from './client'
import { authErrorMessage, inspectAdminSession, signOutAdmin } from './auth'
import type { AuthView } from './auth'

export function useAdminAuth() {
  const [view, setView] = useState<AuthView>({ stage: adminSupabase ? 'checking' : 'unconfigured' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const operation = useRef(0)
  const inFlight = useRef(false)
  const cancelOperation = useCallback(() => {
    ++operation.current
    inFlight.current = false
  }, [])

  const run = useCallback(async (action: () => Promise<AuthView>, fallback: string, hideCurrent = false) => {
    if (inFlight.current) return
    const id = ++operation.current
    inFlight.current = true
    setBusy(true)
    setError('')
    if (hideCurrent) setView({ stage: 'checking' })
    try {
      const next = await action()
      if (operation.current === id) setView(next)
    } catch (cause) {
      if (operation.current === id) {
        setError(authErrorMessage(cause, fallback))
        if (hideCurrent) setView({ stage: 'error' })
      }
    } finally {
      if (operation.current === id) {
        inFlight.current = false
        setBusy(false)
      }
    }
  }, [])

  const refresh = useCallback(() => {
    const client = adminSupabase
    if (client) return run(() => inspectAdminSession(client), 'Unable to check your session. Please try again.', true)
  }, [run])

  useEffect(() => {
    const client = adminSupabase
    if (!client) return
    let timer: ReturnType<typeof setTimeout> | undefined
    // Keep Auth callbacks synchronous; another Auth call inside them can deadlock.
    const { data: { subscription } } = client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        cancelOperation()
        setView({ stage: 'signedOut' })
        setError('')
        setBusy(false)
      } else if (event !== 'INITIAL_SESSION' && !inFlight.current) {
        clearTimeout(timer)
        timer = setTimeout(() => { void refresh() }, 0)
      }
    })
    timer = setTimeout(() => { void refresh() }, 0)
    return () => {
      clearTimeout(timer)
      subscription.unsubscribe()
      cancelOperation()
    }
  }, [refresh, cancelOperation])

  const signOut = () => {
    const client = adminSupabase
    if (client) void run(() => signOutAdmin(client), 'Sign-out could not finish. Please try again.', true)
  }

  return { client: adminSupabase, view, busy, error, run, refresh, signOut }
}
