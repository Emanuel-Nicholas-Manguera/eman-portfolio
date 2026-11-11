import { useEffect, useRef } from 'react'
import { publicSupabase } from './cms/client'

export function usePortfolioActivity(ready: boolean) {
  const counted = useRef(false)

  useEffect(() => {
    const client = publicSupabase
    if (!ready || !client || !import.meta.env.PROD) return
    if (['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) return
    if (import.meta.env.VITE_VERCEL_ENV === 'preview') return

    const record = (activityKey: string) => {
      // A failed analytics request should never interfere with navigation.
      void client.rpc('record_portfolio_activity', { activity_key: activityKey }).then(() => {}, () => {})
    }
    const recordView = () => {
      if (counted.current || document.visibilityState !== 'visible') return
      counted.current = true
      record('page_view')
    }
    const recordClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return
      const link = event.target.closest<HTMLAnchorElement>('.portfolio-content a[href^="#"]')
      const key = link?.hash.slice(1)
      if (key && ['experience', 'projects', 'contact'].includes(key) && document.getElementById(key)) {
        record(key)
      }
    }

    recordView()
    document.addEventListener('visibilitychange', recordView)
    window.addEventListener('click', recordClick)
    return () => {
      document.removeEventListener('visibilitychange', recordView)
      window.removeEventListener('click', recordClick)
    }
  }, [ready])
}
