import { useEffect, useRef, useState } from 'react'
import suitPortrait from './assets/portraits/emanuel-suit.png'
import graduationPortrait from './assets/portraits/emanuel-graduation.png'
import './Introduction.css'
import { SocialLinks } from './SocialLinks'
import type { SocialId } from './socialData'

function DotConnections() {
  const fieldRef = useRef<HTMLDivElement>(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    const field = fieldRef.current
    if (!field) return
    let inView = false
    const update = () => setRunning(inView && !document.hidden)
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      update()
    })
    observer.observe(field)
    document.addEventListener('visibilitychange', update)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  return (
    <div ref={fieldRef} className="intro-dot-connections" data-running={running} aria-hidden="true">
      <svg width="100%" height="100%" focusable="false">
        {/* Match the existing 16px dot grid without stretching on resize. */}
        <path pathLength="1" d="M40 168H104L136 200H184" />
        <path pathLength="1" d="M168 104H232V152L264 184" />
        <path pathLength="1" d="M24 280H72L104 312H152V344" />
      </svg>
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
      <DotConnections />
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
