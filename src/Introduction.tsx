import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { IntroductionContent, AboutContent } from './cms/content'
import './Introduction.css'
import { IntroductionDetails } from './IntroductionDetails'
import { SocialLinks } from './SocialLinks'
import type { SocialSelection, SocialLink } from './socialData'

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

function Portrait({ suitSrc, graduationSrc, isPinned, isRevealed, onHoverChange, onToggle, onReset, onGraduationReady }: {
  suitSrc?: string
  graduationSrc?: string
  isPinned: boolean
  isRevealed: boolean
  onHoverChange: (hovered: boolean) => void
  onToggle: () => void
  onReset: () => void
  onGraduationReady: () => void
}) {
  const graduationRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (graduationRef.current?.complete && graduationRef.current.naturalWidth > 0) {
      onGraduationReady()
    }
  }, [onGraduationReady])

  return (
    <figure className="portrait" aria-label="Portraits of Emanuel Nicholas">
      <button
        className="portrait-toggle"
        type="button"
        aria-label={isPinned ? 'Show software developer introduction' : 'Show Computer Science graduate introduction'}
        aria-pressed={isPinned}
        data-revealed={isRevealed}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') onHoverChange(true)
        }}
        onPointerLeave={() => onHoverChange(false)}
        onPointerCancel={() => onHoverChange(false)}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            onReset()
          }
        }}
      >
        <span className="portrait-cutout">
          <span className="portrait-edges">
            <span className="portrait-layer portrait-layer--suit">
              <img
                src={suitSrc}
                width="833"
                height="1000"
                alt=""
                aria-hidden="true"
                fetchPriority="high"
                draggable="false"
              />
            </span>
            {graduationSrc && <span className="portrait-layer portrait-layer--graduation">
              <img
                ref={graduationRef}
                src={graduationSrc}
                width="1000"
                height="979"
                alt=""
                aria-hidden="true"
                fetchPriority="low"
                onLoad={onGraduationReady}
                draggable="false"
              />
            </span>}
          </span>
        </span>
      </button>
    </figure>
  )
}

function makeNameFrames(name: string) {
  const [first, ...rest] = name.split(' ')
  const second = rest.join(' ')
  const frames = [{ at: 0, first: '', second: '' }]
  let at = 0
  const add = (first: string, second: string, delay = 100) => {
    at += delay
    frames.push({ at, first, second })
  }
  if (name === 'Emanuel Nicholas') {
    for (let length = 1; length <= 8; length++) add('Emmanuel'.slice(0, length), '')
    at += 500
    for (let length = 7; length >= 2; length--) add('Emmanuel'.slice(0, length), '', 65)
    at += 160
    for (let length = 3; length <= 7; length++) add(first.slice(0, length), '')
  } else {
    for (let length = 1; length <= first.length; length++) add(first.slice(0, length), '')
  }
  for (let length = 1; length <= second.length; length++) add(first, second.slice(0, length))
  return frames
}

function TypingName({ name, ready }: { name: string; ready: boolean }) {
  const [first, ...rest] = name.split(' ')
  const second = rest.join(' ')
  const [nameFrames] = useState(() => makeNameFrames(name))
  const [frame, setFrame] = useState(nameFrames[0])

  useEffect(() => {
    if (!ready) return
    const startedAt = performance.now()
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const finalFrame = nameFrames[nameFrames.length - 1]
    let completed = false
    const finish = () => {
      completed = true
      window.clearInterval(interval)
      setFrame(finalFrame)
    }
    const tick = () => {
      if (completed) return
      const elapsed = performance.now() - startedAt
      if (elapsed >= finalFrame.at) return finish()
      for (let index = nameFrames.length - 1; index >= 0; index--) {
        if (elapsed >= nameFrames[index].at) {
          setFrame(nameFrames[index])
          break
        }
      }
    }
    const interval = window.setInterval(tick, 30)
    // A definite final state prevents the name from remaining partly hidden.
    const deadline = window.setTimeout(finish, motion.matches ? 0 : finalFrame.at)
    const onVisibility = () => {
      if (!document.hidden) tick()
    }
    motion.addEventListener('change', finish, { once: true })
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(deadline)
      motion.removeEventListener('change', finish)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [nameFrames, ready])

  return (
    <h1 id="intro-title" aria-label={name}>
      <span className="intro-name-word" aria-hidden="true">
        <span className="intro-name-reserve">{first}</span>
        <span className="intro-name-typed" data-cursor={!frame.second}>{frame.first}</span>
      </span>{' '}
      <span className="intro-name-word" aria-hidden="true">
        <span className="intro-name-reserve">{second}</span>
        <span className="intro-name-typed" data-cursor={!!frame.second}>{frame.second}</span>
      </span>
    </h1>
  )
}

export function Introduction({ content, background, socialLinks, social, onSocialSelect, ready = true }: {
  ready?: boolean
  content: IntroductionContent & { suitSrc?: string; graduationSrc?: string }
  background?: AboutContent | null
  socialLinks: SocialLink[]
  social: SocialSelection | null
  onSocialSelect: (social: SocialSelection) => void
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [isGraduationLoaded, setIsGraduationLoaded] = useState(false)
  const isRevealed = !!content.graduationSrc && isGraduationLoaded && (isHovered || isPinned)
  const graduationReady = useCallback(() => setIsGraduationLoaded(true), [])
  const bioRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const bio = bioRef.current
    if (!bio) return
    const resizeToContent = () => {
      const active = bio.querySelector<HTMLElement>('.intro-bio-panel[aria-hidden="false"]')
      if (!active) return
      const activeHeight = active.getBoundingClientRect().height
      const maximumHeight = Math.max(...Array.from(bio.querySelectorAll('.intro-bio-panel'),
        (panel) => panel.getBoundingClientRect().height))
      bio.style.height = `${activeHeight}px`
      // Balance the space below the socials, keeping the name and portrait anchored.
      bio.parentElement?.style.setProperty('--intro-bio-space', `${maximumHeight - activeHeight}px`)
    }
    resizeToContent()
    const observer = new ResizeObserver(resizeToContent)
    bio.querySelectorAll('.intro-bio-panel').forEach((panel) => observer.observe(panel))
    return () => observer.disconnect()
  }, [isRevealed])

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
          {content.location}
        </p>
        <TypingName key={content.name} name={content.name} ready={ready} />
        <div ref={bioRef} className="intro-bio">
          <div className="intro-bio-panel" aria-hidden={isRevealed}>
            <p className="intro-role">{content.role}</p>
            <p className="intro-description">
              {content.description}
            </p>
          </div>
          <div className="intro-bio-panel" aria-hidden={!isRevealed}>
            <p className="intro-role">{content.graduateRole}</p>
            <p className="intro-description">
              {content.graduateDescription}
            </p>
          </div>
        </div>
        <a className="intro-action" href="#projects">
          {content.actionLabel} <ArrowIcon />
        </a>
        {socialLinks.length > 0 && <SocialLinks items={socialLinks} selected={social} onSelect={onSocialSelect} />}
      </div>
      {content.suitSrc && <Portrait
        suitSrc={content.suitSrc}
        graduationSrc={content.graduationSrc}
        isPinned={isPinned}
        isRevealed={isRevealed}
        onHoverChange={setIsHovered}
        onGraduationReady={graduationReady}
        onToggle={() => {
          setIsPinned((current) => !current)
          setIsHovered(false)
        }}
        onReset={() => {
          setIsPinned(false)
          setIsHovered(false)
        }}
      />}
      {background && <IntroductionDetails content={background} />}
      <a className="intro-scroll" href="#experience">
        <span>{content.scrollLabel}</span>
        <ArrowIcon direction="down" />
      </a>
    </section>
  )
}
