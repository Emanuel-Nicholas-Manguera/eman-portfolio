import type { StartupPhase } from './portfolioStartup'
import './PortfolioLoading.css'

export function PortfolioLoading({ phase }: { phase: StartupPhase }) {
  if (phase === 'waiting' || phase === 'complete') return null
  return (
    <div className="portfolio-loader" data-phase={phase}>
      <div className="portfolio-loader-dots" aria-hidden="true" />
      <div className="portfolio-loader-center" role="status" aria-live="polite">
        <div className="portfolio-loader-signature" aria-hidden="true">emanuel<span>.</span></div>
        <div className="portfolio-loader-pulse" aria-hidden="true"><span /><span /><span /></div>
        <p>Getting things ready</p>
      </div>
      <div className="portfolio-loader-footer" aria-hidden="true">
        <span>Emanuel Nicholas</span><span>Software Developer</span>
      </div>
    </div>
  )
}
