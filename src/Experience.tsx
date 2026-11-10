import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import './Experience.css'
import type { ExperienceContent } from './cms/content'



export function Experience({ experiences }: { experiences: ExperienceContent[] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [panelHeight, setPanelHeight] = useState<number>()
  const [indicator, setIndicator] = useState({ top: 0, height: 0 })
  const sectionRef = useRef<HTMLElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const panelRefs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true)
        observer.disconnect()
      }
    }, { threshold: 0.12 })
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    const tab = tabRefs.current[activeIndex]
    const panel = panelRefs.current[activeIndex]
    const list = listRef.current
    if (!tab || !panel || !list) return

    const measure = () => {
      setIndicator({ top: tab.offsetTop, height: tab.offsetHeight })
      setPanelHeight(panel.offsetHeight)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(tab)
    observer.observe(panel)
    observer.observe(list)
    return () => observer.disconnect()
  }, [activeIndex, experiences])

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number
    if (event.key === 'ArrowDown') next = (index + 1) % experiences.length
    else if (event.key === 'ArrowUp') next = (index - 1 + experiences.length) % experiences.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = experiences.length - 1
    else return

    event.preventDefault()
    setActiveIndex(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <section
      ref={sectionRef}
      className="experience"
      id="experience"
      aria-labelledby="experience-title"
      data-visible={isVisible}
    >
      <div className="experience-heading">
        <p className="section-eyebrow">Experience</p>
        <h2 id="experience-title">Where I’ve contributed.</h2>
      </div>

      <div className="experience-layout">
        <div
          ref={listRef}
          className="experience-companies"
          role="tablist"
          aria-label="Work experience by company"
          aria-orientation="vertical"
        >
          <span
            className="experience-indicator"
            aria-hidden="true"
            style={{ height: indicator.height, transform: `translateY(${indicator.top}px)` }}
          />
          {experiences.map((experience, index) => (
            <button
              key={experience.id}
              ref={(element) => { tabRefs.current[index] = element }}
              className="experience-tab"
              id={`experience-tab-${experience.id}`}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-controls={`experience-panel-${experience.id}`}
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => setActiveIndex(index)}
              onKeyDown={(event) => handleTabKey(event, index)}
            >
              <span className="experience-tab-copy">
                <span className="experience-tab-name">{experience.name}</span>
                <span className="experience-tab-meta">{experience.dates?.label ?? experience.kind}</span>
              </span>
              <svg className="experience-tab-arrow" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="m6 4 4 4-4 4" />
              </svg>
            </button>
          ))}
        </div>

        <div className="experience-stage" style={{ height: panelHeight }}>
          {experiences.map((experience, index) => {
            const active = index === activeIndex
            return (
              <article
                key={experience.id}
                ref={(element) => { panelRefs.current[index] = element }}
                className="experience-panel"
                id={`experience-panel-${experience.id}`}
                role="tabpanel"
                aria-labelledby={`experience-tab-${experience.id}`}
                aria-hidden={!active}
                inert={!active}
                tabIndex={active ? 0 : -1}
                data-active={active}
              >
                <div className="experience-meta">
                  <p className="experience-kind">{experience.kind} · {experience.location}</p>
                  {experience.dates && (
                    <p className="experience-period">
                      <time dateTime={experience.dates.start}>{experience.dates.label.split(' — ')[0]}</time>
                      <span aria-hidden="true"> — </span><span className="experience-sr-only"> to </span>
                      <time dateTime={experience.dates.end}>{experience.dates.label.split(' — ')[1]}</time>
                    </p>
                  )}
                </div>
                <h3>{experience.role}</h3>
                <p className="experience-employer">
                  <span>{experience.company}</span>
                  {experience.department && <span className="experience-department"><span aria-hidden="true"> · </span>{experience.department}</span>}
                </p>
                <p className="experience-summary">{experience.summary}</p>
                <ul className="experience-contributions">
                  {experience.contributions.map((contribution) => (
                    <li key={contribution.title}>
                      <strong>{contribution.title}</strong>
                      <p>{contribution.detail}</p>
                    </li>
                  ))}
                </ul>
                <div className="experience-details">
                  {experience.projects.length > 0 && (
                    <div>
                      <p className="experience-detail-label">Project work</p>
                      <p className="experience-projects">{experience.projects.join(' · ')}</p>
                    </div>
                  )}
                  <div>
                    <p className="experience-detail-label">Languages & tools</p>
                    <ul className="experience-languages" aria-label="Languages and tools used">
                      {experience.languages.map((language) => <li key={language}>{language}</li>)}
                    </ul>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
