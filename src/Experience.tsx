import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import './Experience.css'

const experiences = [
  {
    id: 'impulse',
    name: 'Impulse 101',
    company: 'Impulse 101 IT Solutions OPC',
    role: 'Junior Developer (Full Stack)',
    location: 'Manila City',
    dates: { start: '2026-02', end: '2026-10', label: 'Feb 2026 — Oct 2026' },
    kind: 'Professional experience',
    projects: [],
    summary: 'Developed and maintained software solutions as part of the company’s development team.',
    contributions: [
      { title: 'Team collaboration', detail: 'Collaborated with technical leads and operations stakeholders to deliver reliable software solutions.' },
      { title: 'Project development', detail: 'Participated in project development activities involving source code, technical documentation, and internal systems.' },
      { title: 'Troubleshooting & support', detail: 'Assisted in troubleshooting system issues and providing technical support during system downtime when needed.' },
    ],
    languages: ['TypeScript', 'JavaScript', 'SQL', 'Git'],
  },
  {
    id: 'amex',
    name: 'American Express',
    company: 'American Express International Inc.',
    role: 'Global Services – Data Analytics Intern',
    location: 'Taguig City',
    dates: { start: '2025-09', end: '2025-12', label: 'Sep 2025 — Dec 2025' },
    kind: 'Internship',
    projects: [],
    summary: 'Developed the backend and data architecture for a mobile performance reporting app used by Global Servicing directors and vice presidents.',
    contributions: [
      { title: '12 key business metrics', detail: 'Built Power BI data models, Power Query (M) ETL workflows, and DAX measures to support performance reporting.' },
      { title: 'Data quality & testing', detail: 'Worked with business analysts to validate data, test and optimize the backend, and align reporting with business requirements.' },
      { title: 'Leadership presentation', detail: 'Presented the solution to senior leadership and received a vice president’s endorsement to present it globally.' },
    ],
    languages: ['Power Query M', 'DAX'],
  },
  {
    id: 'dost',
    name: 'DOST',
    company: 'Department of Science and Technology',
    department: 'Central Office · Policy and Evaluation Service',
    role: 'Developer (Full Stack) Intern',
    location: 'Manila City',
    // Omit the dates until the duplicate range in the résumé is confirmed.
    dates: null,
    kind: 'Internship',
    projects: [],
    summary: 'Contributed to DOST INSPIRE, developing web modules and dashboards for executive insights and data analytics.',
    contributions: [
      { title: 'Web modules & interfaces', detail: 'Enhanced modules from system specifications using PHP and JavaScript, and built reusable interface templates.' },
      { title: 'Authentication & accounts', detail: 'Implemented authentication, user management, and account modules for the system.' },
      { title: 'Team integration', detail: 'Used Git to collaborate with the development team, keeping changes integrated and the code maintainable.' },
    ],
    languages: ['PHP', 'JavaScript', 'CSS', 'Laravel', 'Vue.js', 'Git'],
  },
]

export function Experience() {
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
  }, [activeIndex])

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index
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
                <p className="experience-employer">{experience.company}</p>
                {experience.department && <p className="experience-department">{experience.department}</p>}
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
