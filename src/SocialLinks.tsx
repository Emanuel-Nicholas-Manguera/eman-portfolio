import { useEffect, useRef, type CSSProperties, type MouseEvent } from 'react'
import { flushSync } from 'react-dom'
import { socials, type SocialId } from './socialData'
import './SocialLinks.css'

type Props = {
  selected: SocialId | null
  onSelect: (social: SocialId) => void
}

export function SocialLinks({ selected, onSelect }: Props) {
  const portalRef = useRef<HTMLDivElement>(null)
  const watermarkRef = useRef<HTMLSpanElement>(null)
  const captionRef = useRef<HTMLParagraphElement>(null)
  const animations = useRef<Animation[]>([])
  const active = socials.find((social) => social.id === selected)

  useEffect(() => () => animations.current.forEach((animation) => animation.cancel()), [])
  useEffect(() => {
    if (selected === null) animations.current.forEach((animation) => animation.cancel())
  }, [selected])

  function activate(event: MouseEvent<HTMLAnchorElement>, id: SocialId) {
    // Preserve normal links, including browser shortcuts and new-tab behavior.
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    animations.current.forEach((animation) => animation.cancel())
    animations.current = []
    flushSync(() => onSelect(id))

    const portal = portalRef.current
    const watermark = watermarkRef.current
    const caption = captionRef.current
    if (!portal || !watermark || !caption || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const origin = event.currentTarget.getBoundingClientRect()
    const bounds = portal.getBoundingClientRect()
    const mark = watermark.getBoundingClientRect()
    const x = origin.left + origin.width / 2 - bounds.left
    const y = origin.top + origin.height / 2 - bounds.top
    const radius = Math.hypot(Math.max(x, bounds.width - x), Math.max(y, bounds.height - y))
    const timing = { duration: 600, easing: 'cubic-bezier(.22,.65,.3,1)' }

    animations.current = [
      portal.animate([
        { clipPath: `circle(0px at ${x}px ${y}px)`, opacity: .65 },
        { clipPath: `circle(${radius}px at ${x}px ${y}px)`, opacity: .2, offset: .75 },
        { clipPath: `circle(${radius}px at ${x}px ${y}px)`, opacity: 0 },
      ], timing),
      watermark.animate([
        {
          transform: `translate(${origin.left + origin.width / 2 - mark.left - mark.width / 2}px, ${origin.top + origin.height / 2 - mark.top - mark.height / 2}px) scale(.07) rotate(-12deg)`,
          opacity: .55,
        },
        { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: .09 },
      ], timing),
      caption.animate([
        { opacity: 0, transform: 'translateY(4px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 250, easing: 'ease-out' }),
    ]
  }

  return (
    <>
      <div ref={portalRef} className="social-portal" aria-hidden="true" />
      <span
        ref={watermarkRef}
        className="social-watermark"
        hidden={!active}
        aria-hidden="true"
        style={{ '--social-logo': active ? `url("${active.logo}")` : 'none' } as CSSProperties}
      />
      <nav className="intro-socials" aria-label="Social profiles and email">
        {socials.map((social) => (
          <a
            key={social.id}
            className="social-link"
            data-social={social.id}
            data-selected={selected === social.id}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${social.label} (opens in a new tab)`}
            onClick={(event) => activate(event, social.id)}
          >
            <span className="social-logo" aria-hidden="true" style={{ '--social-logo': `url("${social.logo}")` } as CSSProperties} />
            <span className="social-tooltip" aria-hidden="true">{social.label}</span>
          </a>
        ))}
      </nav>
      <p ref={captionRef} className="social-caption" aria-live="polite" aria-atomic="true">
        {active?.caption ?? '\u00a0'}
      </p>
    </>
  )
}
