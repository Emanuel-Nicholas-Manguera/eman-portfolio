import { useEffect, useRef, useState } from 'react'
import { createPortfolioStartup } from './portfolioStartup'
import type { StartupPhase } from './portfolioStartup'

export function usePortfolioStartup(hasData: boolean, failed: boolean, portraitSrc?: string) {
  const [phase, setPhase] = useState<StartupPhase>('waiting')
  const [timedOut, setTimedOut] = useState(false)
  const [settledPortrait, setSettledPortrait] = useState<string>()
  const controller = useRef<ReturnType<typeof createPortfolioStartup> | null>(null)
  const revealed = phase === 'revealing' || phase === 'complete'

  useEffect(() => {
    const startup = createPortfolioStartup({
      onPhase: setPhase,
      onTimeout: () => setTimedOut(true),
      reducedMotion: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    })
    controller.current = startup
    return () => startup.dispose()
  }, [])

  useEffect(() => {
    if (!portraitSrc || revealed) return
    let alive = true
    const image = new Image()
    image.fetchPriority = 'high'
    const settle = () => { if (alive) setSettledPortrait(portraitSrc) }
    const decode = () => { void image.decode().catch(() => {}).then(settle) }
    image.onload = decode
    // A broken image must not trap the entire portfolio behind the loader.
    image.onerror = settle
    image.src = portraitSrc
    if (image.complete) {
      if (image.naturalWidth) decode()
      else settle()
    }
    return () => {
      alive = false
      image.onload = null
      image.onerror = null
    }
  }, [portraitSrc, revealed])

  useEffect(() => {
    controller.current?.setReady(
      (hasData && (!portraitSrc || settledPortrait === portraitSrc)) || (!hasData && failed),
    )
  }, [hasData, failed, portraitSrc, settledPortrait])

  useEffect(() => {
    if (revealed) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [revealed])

  return { phase, revealed, timedOut }
}
