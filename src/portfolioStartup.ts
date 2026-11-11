export type StartupPhase = 'waiting' | 'loading' | 'revealing' | 'complete'
export const LOADER_DELAY = 600
export const LOADER_MINIMUM = 800
export const LOADER_FADE = 350
export const STARTUP_TIMEOUT = 12000

// One initial visit only: later CMS refreshes never cover the page again.
export function createPortfolioStartup({
  onPhase,
  onTimeout,
  now = () => performance.now(),
  schedule = (fn: () => void, delay: number) => setTimeout(fn, delay),
  cancel = (timer: ReturnType<typeof setTimeout>) => clearTimeout(timer),
  reducedMotion = () => false,
}: {
  onPhase: (phase: StartupPhase) => void
  onTimeout: () => void
  now?: () => number
  schedule?: (fn: () => void, delay: number) => ReturnType<typeof setTimeout>
  cancel?: (timer: ReturnType<typeof setTimeout>) => void
  reducedMotion?: () => boolean
}) {
  let phase: StartupPhase = 'waiting'
  let shownAt = 0
  let ready = false
  let disposed = false
  let revealTimer: ReturnType<typeof setTimeout> | undefined
  let fadeTimer: ReturnType<typeof setTimeout> | undefined
  const change = (next: StartupPhase) => {
    phase = next
    onPhase(next)
  }
  const reveal = () => {
    if (disposed || !ready || phase === 'complete' || phase === 'revealing') return
    cancel(showTimer)
    cancel(timeoutTimer)
    if (phase === 'waiting') {
      change('complete')
    } else {
      change('revealing')
      fadeTimer = schedule(() => change('complete'), reducedMotion() ? 0 : LOADER_FADE)
    }
  }
  const setReady = (value: boolean) => {
    if (disposed || phase === 'complete' || phase === 'revealing') return
    ready = value
    if (revealTimer !== undefined) cancel(revealTimer)
    if (!ready) return
    const remaining = phase === 'loading' ? Math.max(0, LOADER_MINIMUM - (now() - shownAt)) : 0
    if (remaining) revealTimer = schedule(reveal, remaining)
    else reveal()
  }
  const showTimer = schedule(() => {
    shownAt = now()
    change('loading')
  }, LOADER_DELAY)
  const timeoutTimer = schedule(() => {
    onTimeout()
    setReady(true)
  }, STARTUP_TIMEOUT)
  return {
    setReady,
    dispose() {
      disposed = true
      cancel(showTimer)
      cancel(timeoutTimer)
      if (revealTimer !== undefined) cancel(revealTimer)
      if (fadeTimer !== undefined) cancel(fadeTimer)
    },
  }
}
