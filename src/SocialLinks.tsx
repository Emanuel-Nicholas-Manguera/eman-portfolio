import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { flushSync } from 'react-dom'
import { type socials, type SocialId } from './socialData'
import './SocialLinks.css'

type Props = {
  items: typeof socials
  selected: SocialId | null
  onSelect: (social: SocialId) => void
}

export function SocialLinks({ selected, onSelect, items: socials }: Props) {
  const portalRef = useRef<HTMLDivElement>(null)
  const watermarkRef = useRef<HTMLSpanElement>(null)
  const captionRef = useRef<HTMLParagraphElement>(null)
  const animations = useRef<Animation[]>([])
  const navigationTimer = useRef<number | undefined>(undefined)
  const [blockedHref, setBlockedHref] = useState<string | null>(null)
  // Keep the mask mounted during reset so opacity can fade to zero.
  const [watermarkSocial, setWatermarkSocial] = useState<SocialId | null>(selected)
  const active = socials.find((social) => social.id === selected)
  const watermarkSocialData = socials.find((social) => social.id === watermarkSocial)

  useEffect(() => () => {
    animations.current.forEach((animation) => animation.cancel())
    window.clearTimeout(navigationTimer.current)
  }, [])
  useEffect(() => {
    if (selected === null) {
      animations.current.forEach((animation) => animation.cancel())
      window.clearTimeout(navigationTimer.current)
    }
  }, [selected])

  function activate(event: MouseEvent<HTMLAnchorElement>, id: SocialId) {
    // Modified clicks retain the browser's normal link behavior.
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    const href = event.currentTarget.href
    window.clearTimeout(navigationTimer.current)
    setBlockedHref(null)
    // Let the 600ms portal finish before opening the destination.
    navigationTimer.current = window.setTimeout(() => {
      const destination = window.open('about:blank', '_blank')
      if (!destination) {
        setBlockedHref(href)
        return
      }
      destination.opener = null
      const referrer = destination.document.createElement('meta')
      referrer.name = 'referrer'
      referrer.content = 'no-referrer'
      destination.document.head.append(referrer)
      destination.location.replace(href)
    }, 700)
    animations.current.forEach((animation) => animation.cancel())
    animations.current = []
    flushSync(() => {
      setWatermarkSocial(id)
      onSelect(id)
    })

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
        hidden={!watermarkSocialData}
        data-visible={selected !== null}
        aria-hidden="true"
        style={{ '--social-logo': watermarkSocialData ? `url("${watermarkSocialData.logo}")` : 'none' } as CSSProperties}
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
        {active && blockedHref && (
          <> <a href={blockedHref} target="_blank" rel="noopener noreferrer">Open {active.label} ↗</a></>
        )}
      </p>
    </>
  )
}
