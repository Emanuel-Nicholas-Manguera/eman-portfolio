import { useCallback, useEffect, useRef, useState } from 'react'
import { adminSupabase } from './client'
import { inspectAdminSession, signOutAdmin } from './auth'
import type { AuthView } from './auth'
import { createAuthController } from './authController'

export function useAdminAuth() {
  const [view, setView] = useState<AuthView>({ stage: adminSupabase ? 'checking' : 'unconfigured' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const controller = useRef<ReturnType<typeof createAuthController> | null>(null)

  useEffect(() => {
    const client = adminSupabase
    if (!client) return
    const current = createAuthController({
      inspect: () => inspectAdminSession(client),
      onView: setView, onBusy: setBusy, onError: setError,
    })
    controller.current = current
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      current.onAuthChange(event, session ? { userId: session.user.id, accessToken: session.access_token } : null)
    })
    current.start()
    return () => {
      subscription.unsubscribe()
      current.dispose()
      controller.current = null
    }
  }, [])

  const run = useCallback((action: () => Promise<AuthView>, fallback: string, hideCurrent = false) => {
    return controller.current?.run(action, fallback, hideCurrent) ?? Promise.resolve()
  }, [])
  const refresh = useCallback(() => controller.current?.refresh(), [])
  const signOut = useCallback(() => {
    const client = adminSupabase
    if (client) void controller.current?.signOut(() => signOutAdmin(client))
  }, [])

  return { client: adminSupabase, view, busy, error, run, refresh, signOut }
}
