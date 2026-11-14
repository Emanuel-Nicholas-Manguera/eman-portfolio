import { useLayoutEffect, useRef, useState } from 'react'
import { portfolioScale } from './portfolioScale'

type Props = {
  items: string[]
  activeSection: string | null
  onNavigate?: () => void
}


export function HeaderNavigation({ activeSection, onNavigate, items }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const [line, setLine] = useState({ x: 0, y: 0, width: 0, visible: false })
  const itemsKey = items.join('|')
  const target = hovered ?? focused ?? activeSection

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const measure = () => {
      const label = target
        ? container.querySelector<HTMLElement>(`[href="#${target}"] span`)
        : null
      if (!label || !container.getClientRects().length) {
        setLine((current) => current.visible ? { ...current, visible: false } : current)
        return
      }
      const bounds = container.getBoundingClientRect()
      const text = label.getBoundingClientRect()
      const scale = portfolioScale(container)
      const next = {
        x: (text.left - bounds.left) / scale,
        y: (text.bottom - bounds.top) / scale + 5,
        width: text.width / scale,
        visible: true,
      }
      setLine((current) => current.x === next.x && current.y === next.y && current.width === next.width && current.visible
        ? current : next)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    container.querySelectorAll('a').forEach((link) => observer.observe(link))
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [target, itemsKey])

  return (
    <div
      ref={containerRef}
      className="navigation-links"
      onPointerLeave={() => setHovered(null)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(null)
      }}
    >
      <span
        className="navigation-underline"
        aria-hidden="true"
        data-visible={line.visible}
        style={{ width: line.width, transform: `translate(${line.x}px, ${line.y}px)` }}
      />
      {items.map((label) => {
        const id = label.toLowerCase()
        return (
          <a
            key={id}
            href={`#${id}`}
            aria-current={activeSection === id ? 'location' : undefined}
            onPointerEnter={(event) => setHovered(event.pointerType === 'mouse' ? id : null)}
            onFocus={(event) => setFocused(event.currentTarget.matches(':focus-visible') ? id : null)}
            onClick={onNavigate}
          >
            <span>{label}</span>
          </a>
        )
      })}
    </div>
  )
}
