import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import suitPortrait from './assets/portraits/emanuel-suit.png'
import graduationPortrait from './assets/portraits/emanuel-graduation.png'
import './Introduction.css'
import { SocialLinks } from './SocialLinks'
import type { SocialId } from './socialData'

function InteractiveDots() {
  const fieldRef = useRef<HTMLDivElement>(null)
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null)

  useEffect(() => {
    const field = fieldRef.current
    if (!field) return
    let frame = 0
    let pointerX = 0
    let pointerY = 0
    let rippleId = 0
    const controlSelector = 'a, button, input, textarea, select, label, summary, header, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"]), [contenteditable]:not([contenteditable="false"]), .portrait, .intro-socials'
    const isControlEvent = (event: Event) => event.composedPath()
      .some((target) => target instanceof Element && target.matches(controlSelector))
    const hide = () => {
      cancelAnimationFrame(frame)
      frame = 0
      field.dataset.active = 'false'
    }
    const yieldToControl = () => {
      hide()
      setRipple(null)
    }
    const prioritizeControl = (event: Event) => {
      if (isControlEvent(event)) yieldToControl()
    }
    const paint = () => {
      frame = 0
      const bounds = field.getBoundingClientRect()
      const x = pointerX - bounds.left
      const y = pointerY - bounds.top
      if (x < 0 || y < 0 || x > bounds.width || y > bounds.height) {
        hide()
        return
      }
      field.style.setProperty('--dot-x', `${x}px`)
      field.style.setProperty('--dot-y', `${y}px`)
      field.dataset.active = 'true'
    }
    const move = (event: PointerEvent) => {
      if (isControlEvent(event)) {
        yieldToControl()
        return
      }
      if (event.pointerType !== 'mouse') {
        hide()
        return
      }
      pointerX = event.clientX
      pointerY = event.clientY
      if (!frame) frame = requestAnimationFrame(paint)
    }
    const leaveWindow = (event: PointerEvent) => {
      if (!event.relatedTarget) hide()
    }
    const click = (event: MouseEvent) => {
      if (isControlEvent(event)) {
        yieldToControl()
        return
      }
      if (event.defaultPrevented || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const bounds = field.getBoundingClientRect()
      const x = event.clientX - bounds.left
      const y = event.clientY - bounds.top
      if (x < 0 || y < 0 || x > bounds.width || y > bounds.height) return
      setRipple({ x, y, id: ++rippleId })
    }
    window.addEventListener('pointermove', move, { passive: true })
    // Observe controls without stopping their events or changing their behavior.
    window.addEventListener('pointerdown', prioritizeControl, true)
    window.addEventListener('pointerover', prioritizeControl, true)
    window.addEventListener('focusin', prioritizeControl)
    window.addEventListener('pointerout', leaveWindow)
    window.addEventListener('click', click)
    window.addEventListener('blur', hide)
    window.addEventListener('scroll', hide, { passive: true })
    window.addEventListener('resize', hide)
    return () => {
      hide()
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', prioritizeControl, true)
      window.removeEventListener('pointerover', prioritizeControl, true)
      window.removeEventListener('focusin', prioritizeControl)
      window.removeEventListener('pointerout', leaveWindow)
      window.removeEventListener('click', click)
      window.removeEventListener('blur', hide)
      window.removeEventListener('scroll', hide)
      window.removeEventListener('resize', hide)
    }
  }, [])

  return (
    <div ref={fieldRef} className="intro-interactive-dots" aria-hidden="true">
      <span className="intro-dot-hover" />
      {ripple && (
        <span
          key={ripple.id}
          className="intro-dot-ripple"
          style={{ '--ripple-x': `${ripple.x}px`, '--ripple-y': `${ripple.y}px` } as CSSProperties}
          onAnimationEnd={() => setRipple((current) => current?.id === ripple.id ? null : current)}
        />
      )}
    </div>
  )
}

function ArrowIcon({ direction = 'diagonal' }: { direction?: 'diagonal' | 'down' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={direction === 'down' ? 'M12 4v16m-6-6 6 6 6-6' : 'M5 19 19 5M5 5h14v14'} />
    </svg>
  )
}

function Portrait() {
  const [isHovered, setIsHovered] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [isGraduationLoaded, setIsGraduationLoaded] = useState(false)
  const graduationRef = useRef<HTMLImageElement>(null)
  const isRevealed = isGraduationLoaded && (isHovered || isPinned)

  useEffect(() => {
    if (graduationRef.current?.complete && graduationRef.current.naturalWidth > 0) {
      setIsGraduationLoaded(true)
    }
  }, [])

  return (
    <figure className="portrait" aria-label="Portraits of Emanuel Nicholas">
      <button
        className="portrait-toggle"
        type="button"
        aria-label={isPinned ? 'Show suit portrait' : 'Show graduation portrait'}
        aria-pressed={isPinned}
        data-revealed={isRevealed}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') setIsHovered(true)
        }}
        onPointerLeave={() => setIsHovered(false)}
        onPointerCancel={() => setIsHovered(false)}
        onClick={() => {
          setIsPinned((current) => !current)
          setIsHovered(false)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setIsPinned(false)
            setIsHovered(false)
          }
        }}
      >
        <span className="portrait-cutout">
          <span className="portrait-edges">
            <span className="portrait-layer portrait-layer--suit">
              <img
                src={suitPortrait}
                width="833"
                height="1000"
                alt=""
                aria-hidden="true"
                fetchPriority="high"
                draggable="false"
              />
            </span>
            <span className="portrait-layer portrait-layer--graduation">
              <img
                ref={graduationRef}
                src={graduationPortrait}
                width="1000"
                height="979"
                alt=""
                aria-hidden="true"
                onLoad={() => setIsGraduationLoaded(true)}
                draggable="false"
              />
            </span>
          </span>
        </span>
      </button>
    </figure>
  )
}

export function Introduction({ social, onSocialSelect }: {
  social: SocialId | null
  onSocialSelect: (social: SocialId) => void
}) {
  return (
    <section className="introduction" aria-labelledby="intro-title">
      <InteractiveDots />
      <div className="intro-copy">
        <p className="intro-location">
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          Paranaque, Philippines
        </p>
        <h1 id="intro-title">Emanuel Nicholas</h1>
        <p className="intro-role">Software Developer</p>
        <p className="intro-description">
          I’m a Computer Science graduate with experience in full-stack
          development. I enjoy building web applications and improving how
          they work.
        </p>
        <a className="intro-action" href="#projects">
          View projects <ArrowIcon />
        </a>
        <SocialLinks selected={social} onSelect={onSocialSelect} />
      </div>
      <Portrait />
      <a className="intro-scroll" href="#experience">
        <span>A little about me. Then, where I’ve contributed.</span>
        <ArrowIcon direction="down" />
      </a>
    </section>
  )
}
