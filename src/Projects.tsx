import { useEffect, useRef, useState } from 'react'
import { projects, type ProjectPhoto } from './projectData'
import './Projects.css'

function Arrow({ previous = false }: { previous?: boolean }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d={previous ? 'M20 12H4m7-7-7 7 7 7' : 'M4 12h16m-7-7 7 7-7 7'} /></svg>
}

function Photo({ photo }: { photo: ProjectPhoto }) {
  if (photo.src) return <img src={photo.src} alt={photo.label} draggable="false" />
  // These are explicitly labeled illustrations until real screenshots are supplied.
  return <div className={`project-illustration project-illustration--${photo.illustration}`} aria-hidden="true">
    {photo.illustration === 'golf' ? <div className="project-phone">
      <span className="project-phone-speaker" /><strong>GolfMatch</strong>
      <h4>{photo.label === 'Community' ? 'Share a round.' : photo.label === 'Courses' ? 'Explore courses' : 'Your next round awaits.'}</h4>
      <div className="project-course-art" /><p>{photo.label === 'Community' ? 'Connect through golf.' : 'Discover places to play.'}</p>
    </div> : <><aside><strong>INSPIRE</strong><span>Overview</span><span>Reports</span><span>Accounts</span></aside><div className="project-dashboard">
      <span>{photo.label === 'Accounts' ? 'Authentication & accounts' : 'Executive insights'}</span>
      <h4>{photo.label === 'Accounts' ? 'Account management' : photo.label === 'Reports' ? 'Report library' : 'A clearer view of the data.'}</h4>
      {photo.label === 'Dashboard' ? <div className="project-chart">{[35, 62, 48, 82, 70, 94].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div> : photo.label === 'Reports' ? <div className="project-report-list"><p>Program overview</p><p>Annual summary</p><p>Activity report</p></div> : <div className="project-account-fields"><span>Profile details</span><p>Account information</p><span>Access level</span><p>Staff</p></div>}
    </div></>}
  </div>
}

const wrap = (index: number, length: number) => (index + length) % length

export function Projects() {
  const [selected, setSelected] = useState(0)
  const [photoIndexes, setPhotoIndexes] = useState(() => projects.map(() => 0))
  const [viewerOpen, setViewerOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const suppressClick = useRef(false)
  const project = projects[selected]
  const photoIndex = photoIndexes[selected]
  const photo = project.photos[photoIndex]

  function changePhoto(index: number) {
    setPhotoIndexes(current => current.map((value, i) => i === selected ? wrap(index, project.photos.length) : value))
  }

  useEffect(() => {
    if (!viewerOpen) return
    const dialog = dialogRef.current
    dialog?.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.body.style.overflow = previousOverflow
    }
  }, [viewerOpen])

  return <section className="projects-section" id="projects" aria-labelledby="projects-title">
    <div className="projects-heading">
      <div><p className="section-eyebrow">Selected work</p><h2 id="projects-title">Ideas brought to life.</h2></div>
      <div className="projects-navigation" role="group" aria-label="Browse projects">
        <div className="projects-arrows"><button type="button" className="project-arrow" aria-label="Previous project" onClick={() => setSelected(wrap(selected - 1, projects.length))}><Arrow previous /></button><span>Project {selected + 1} of {projects.length}</span><button type="button" className="project-arrow" aria-label="Next project" onClick={() => setSelected(wrap(selected + 1, projects.length))}><Arrow /></button></div>
      </div>
    </div>
    <h3 className="project-gallery-title" aria-live="polite">{project.name}</h3>
    <div className="project-gallery" role="group" aria-label="Project gallery" onKeyDown={event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        setSelected(wrap(selected + (event.key === 'ArrowRight' ? 1 : -1), projects.length))
      }
    }} onPointerDown={event => { suppressClick.current = false; if (event.pointerType === 'touch') swipeStart.current = { x: event.clientX, y: event.clientY } }} onPointerCancel={() => { swipeStart.current = null }} onPointerUp={event => {
      const start = swipeStart.current
      swipeStart.current = null
      if (!start) return
      const dx = event.clientX - start.x, dy = event.clientY - start.y
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) { suppressClick.current = true; changePhoto(photoIndex + (dx < 0 ? 1 : -1)) }
    }}>
      {projects.map((item, index) => {
        const offset = wrap(index - selected, projects.length)
        const position = offset === 0 ? 'center' : offset === 1 ? 'right' : offset === projects.length - 1 ? 'left' : 'hidden'
        return <button key={item.id} type="button" className="project-cover" data-position={position} tabIndex={position === 'hidden' ? -1 : 0} aria-hidden={position === 'hidden'} aria-label={index === selected ? `Enlarge ${item.name} image` : `Select ${item.name}`} onClick={() => {
          if (suppressClick.current) { suppressClick.current = false; return }
          if (index === selected) setViewerOpen(true)
          else setSelected(index)
        }}>
          <span className="project-image-frame">{item.photos.map((itemPhoto, imageIndex) => <span className="project-photo-layer" data-active={photoIndexes[index] === imageIndex} aria-hidden={photoIndexes[index] !== imageIndex} key={itemPhoto.label}><Photo photo={itemPhoto} /></span>)}<span className="project-enlarge" aria-hidden="true">Enlarge ↗</span></span>
        </button>
      })}
    </div>
    <div className="project-photo-caption"><span>{photo.note}</span><span aria-live="polite">{photo.label} · Photo {photoIndex + 1} of {project.photos.length}</span></div>
    <div className="project-thumbnails" role="group" aria-label={`${project.name} photos`}>
      {project.photos.map((itemPhoto, index) => <button type="button" key={`${project.id}-${itemPhoto.label}`} className="project-thumbnail" aria-pressed={index === photoIndex} aria-label={`Show ${itemPhoto.label} photo`} onClick={() => changePhoto(index)} onKeyDown={event => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault()
          const next = wrap(index + (event.key === 'ArrowRight' ? 1 : -1), project.photos.length)
          changePhoto(next)
          ;(event.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus()
        }
      }}><span className="project-thumbnail-image" aria-hidden="true"><Photo photo={itemPhoto} /></span><span>{itemPhoto.label}</span></button>)}
    </div>
    <div className="project-descriptions" aria-live="polite">{projects.map((item, index) => <article key={item.id} className="project-description-panel" data-active={index === selected} aria-hidden={index !== selected} inert={index !== selected}>
      <div><p className="section-eyebrow">{item.kind}</p><h3>{item.name}</h3>{item.organization && <p className="project-organization">{item.organization}</p>}{item.source && <a href={item.source} target="_blank" rel="noopener noreferrer">View source ↗</a>}</div>
      <div><p className="project-summary">{item.description}</p><ul className="project-technologies" aria-label="Technologies">{item.technologies.map(technology => <li key={technology}>{technology}</li>)}</ul></div>
    </article>)}</div>
    <dialog ref={dialogRef} className="project-viewer" aria-label={`${project.name} image viewer`} onClose={() => setViewerOpen(false)} onClick={event => { if (event.target === event.currentTarget) setViewerOpen(false) }} onKeyDown={event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); changePhoto(photoIndex + (event.key === 'ArrowRight' ? 1 : -1)) }
    }}><div className="project-viewer-content">
      <div className="project-viewer-heading">
        <strong>{project.name}</strong>
        <button autoFocus type="button" className="project-arrow" aria-label="Close image viewer" onClick={() => setViewerOpen(false)}>✕</button>
      </div>
      <div className="project-viewer-image">
        {project.photos.map((itemPhoto, index) => <div className="project-photo-layer" data-active={index === photoIndex} aria-hidden={index !== photoIndex} key={`${project.id}-${itemPhoto.label}`}><Photo photo={itemPhoto} /></div>)}
      </div>
      <div className="project-viewer-dock" role="group" aria-label="Browse project photos">
        <button type="button" className="project-arrow project-viewer-previous" aria-label="Previous photo" onClick={() => changePhoto(photoIndex - 1)}><Arrow previous /></button>
        <div className="project-viewer-thumbnails">
          {project.photos.map((itemPhoto, index) => <button type="button" key={itemPhoto.label} className="project-viewer-thumbnail" aria-pressed={index === photoIndex} aria-label={`Show ${itemPhoto.label} photo`} onClick={() => changePhoto(index)}>
            <span className="project-thumbnail-image" aria-hidden="true"><Photo photo={itemPhoto} /></span>
          </button>)}
        </div>
        <button type="button" className="project-arrow project-viewer-next" aria-label="Next photo" onClick={() => changePhoto(photoIndex + 1)}><Arrow /></button>
        <p className="project-viewer-caption" aria-live="polite">{photo.label} · {photoIndex + 1} of {project.photos.length}</p>
      </div>
      <p className="project-viewer-note">{photo.note}</p>
    </div></dialog>
  </section>
}
