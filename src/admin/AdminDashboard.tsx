import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import './AdminDashboard.css'

type Section = 'Overview' | 'Introduction' | 'Experience' | 'Projects' | 'About' | 'Contact' | 'Media'
type Document = { id: string; kind: string; title: string; updated_at: string }
type Asset = { id: string; original_filename: string; alt_text: string; byte_size: number }
type Contents = { documents: Document[]; assets: Asset[]; published: Set<string> }
const sections: { name: Section; kind: string; detail: string; icon: string }[] = [
  { name: 'Introduction', kind: 'introduction', detail: 'Your first impression', icon: 'user' },
  { name: 'Experience', kind: 'experience', detail: 'Roles and contributions', icon: 'work' },
  { name: 'Projects', kind: 'project', detail: 'The work you want to share', icon: 'layers' },
  { name: 'About', kind: 'about', detail: 'Education and recognition', icon: 'education' },
  { name: 'Contact', kind: 'contact', detail: 'Ways to reach you', icon: 'mail' },
]
const paths: Record<string, string> = {
  overview: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  user: 'M20 21v-2a8 8 0 0 0-16 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  work: 'M8 6V3h8v3M3 6h18v14H3zM3 11l9 4 9-4',
  layers: 'm12 3 10 5-10 5L2 8zm-10 10 10 5 10-5M2 18l10 5 10-5',
  education: 'm2 8 10-5 10 5-10 5zm4 3v6q6 5 12 0v-6M22 8v9',
  mail: 'M3 5h18v14H3zM3 5l9 8 9-8',
  media: 'M3 3h18v18H3zM3 17l6-6 5 5 3-3 4 4M8 7h.01',
  arrow: 'M7 17 17 7M7 7h10v10', right: 'M5 12h14m-6-6 6 6-6 6',
  chevron: 'm9 5 7 7-7 7', logout: 'M9 3H3v18h6m6-15 6 6-6 6M8 12h13',
  menu: 'M4 6h16M4 12h16M4 18h16', close: 'm6 6 12 12M6 18 18 6',
  moon: 'M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10',
  sun: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',
}
function Icon({ name }: { name: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.layers} /></svg>
}

export function AdminDashboard({ client, email, theme, onToggleTheme, onSignOut }: {
  client: SupabaseClient; email: string; theme: 'light' | 'dark'; onToggleTheme: () => void; onSignOut: () => void
}) {
  const [section, setSection] = useState<Section>('Overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [contents, setContents] = useState<Contents | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const [docs, assets, publications] = await Promise.all([
          client.from('cms_documents').select('id,kind,title,updated_at').order('sort_order').order('id').abortSignal(controller.signal),
          client.from('cms_assets').select('id,original_filename,alt_text,byte_size').order('created_at', { ascending: false }).abortSignal(controller.signal),
          client.from('cms_publications').select('document_id').abortSignal(controller.signal),
        ])
        if (controller.signal.aborted) return
        if (docs.error || assets.error || publications.error) throw new Error('Content unavailable')
        setContents({ documents: docs.data, assets: assets.data, published: new Set(publications.data.map(p => p.document_id)) })
      } catch {
        if (!controller.signal.aborted) setError(true)
      }
    }
    void load()
    return () => controller.abort()
  }, [client, attempt])
  function go(next: Section) { setSection(next); setMenuOpen(false) }
  function retry() { setError(false); setContents(null); setAttempt(a => a + 1) }
  const projects = contents?.documents.filter(d => d.kind === 'project') ?? []
  const current = sections.find(s => s.name === section)
  function empty(title: string, text: string, icon = 'layers') {
    return <div className="ss-empty"><Icon name={icon} /><h3>{title}</h3><p>{text}</p></div>
  }
  function records(documents: Document[]) {
    return documents.map(d => <article className="ss-record" key={d.id}><h3>{d.title}</h3><p>{contents?.published.has(d.id) ? 'Published version available' : 'Draft'} · Updated {new Date(d.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p></article>)
  }
  return <div className="portfolio admin-dashboard" data-theme={theme} data-menu={menuOpen ? 'open' : 'closed'}>
    <div className="ss-app">
      <aside className="ss-sidebar">
        <div className="ss-brand-row"><button className="ss-brand" onClick={() => go('Overview')} aria-label="Portfolio studio overview">emanuel.<span>PORTFOLIO STUDIO</span></button><button className="ss-menu ss-icon-button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="studio-navigation" onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? 'close' : 'menu'} /></button></div>
        <div className="ss-navigation" id="studio-navigation">
          <nav aria-label="Portfolio administration">
            <button className="ss-nav" aria-current={section === 'Overview' ? 'page' : undefined} onClick={() => go('Overview')}><Icon name="overview" />Overview</button>
            <p className="ss-nav-label">YOUR CONTENT</p>
            {sections.map(s => <button key={s.name} className="ss-nav" aria-current={section === s.name ? 'page' : undefined} onClick={() => go(s.name)}><Icon name={s.icon} />{s.name}</button>)}
            <p className="ss-nav-label">LIBRARY</p>
            <button className="ss-nav" aria-current={section === 'Media' ? 'page' : undefined} onClick={() => go('Media')}><Icon name="media" />Media library</button>
          </nav>
          <div className="ss-owner"><div className="ss-owner-person"><span className="ss-avatar"><Icon name="user" /></span><div><strong>Emanuel Nicholas</strong><span>Owner</span></div></div><button className="ss-signout" onClick={onSignOut}><Icon name="logout" />Sign out</button></div>
        </div>
      </aside>
      <div className="ss-workspace">
        <header className="ss-toolbar"><div className="ss-breadcrumb"><span>Workspace</span><Icon name="chevron" /><strong>{section === 'Media' ? 'Media library' : section}</strong></div><div className="ss-toolbar-actions"><a className="ss-quiet" href="/" target="_blank" rel="noopener noreferrer">View portfolio <Icon name="arrow" /></a><button className="ss-icon-button" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}><Icon name={theme === 'light' ? 'moon' : 'sun'} /></button></div></header>
        <main className="ss-content" id="studio-content">
          <div key={section}>
            <div className="ss-heading"><div><div className="ss-eyebrow">{section === 'Overview' ? 'YOUR WORKSPACE' : section === 'Media' ? 'YOUR LIBRARY' : 'YOUR CONTENT'}</div><h1>{section === 'Overview' ? 'Welcome back, Emanuel.' : section === 'Media' ? 'Every image, in one place.' : `${section}.`}</h1><p className="ss-lead">{section === 'Overview' ? 'A space to shape your work and your story.' : section === 'Media' ? 'The images collected for your portfolio.' : current?.detail}</p></div></div>
            {error ? <div className="ss-empty" role="alert"><h3>We couldn’t load your content.</h3><p>Please check your connection and try again.</p><button className="ss-secondary" onClick={retry}>Try again</button></div> : !contents ? <p role="status">Loading your workspace…</p> : section === 'Overview' ? <>
              <section aria-labelledby="studio-projects"><div className="ss-section-heading"><h2 id="studio-projects">Your projects</h2><button onClick={() => go('Projects')}>View all<Icon name="right" /></button></div>{projects.length ? records(projects.slice(0, 3)) : empty('Your next chapter starts here.', 'Your project collection is ready for its first story. Project editing is coming next.')}</section>
              <div className="ss-bottom-grid"><section><div className="ss-section-heading"><h2>Portfolio sections</h2></div><div className="ss-section-list">{sections.filter(s => s.name !== 'Projects').map(s => <button className="ss-content-row" key={s.name} onClick={() => go(s.name)}><Icon name={s.icon} /><span><strong>{s.name}</strong><small>{s.detail}</small></span><Icon name="chevron" /></button>)}</div></section><section><div className="ss-section-heading"><h2>A place for your photos</h2></div><div className="ss-upload-tile"><span className="ss-upload-icon"><Icon name="media" /></span><div className="ss-upload-copy"><strong>Bring your work to life.</strong><p>{contents.assets.length ? `${contents.assets.length} images in your library.` : 'Your images will live here. Uploads are coming in the media step.'}</p></div><button className="ss-primary" onClick={() => go('Media')}>Open library<Icon name="right" /></button></div></section></div>
            </> : section === 'Media' ? <>{contents.assets.length ? contents.assets.map(a => <article key={a.id} className="ss-record"><h3>{a.original_filename}</h3><p>{a.alt_text || 'No image description yet'} · {Math.ceil(a.byte_size / 1024)} KB</p></article>) : empty('A fresh canvas for your images.', 'No images have been added yet. Image uploads and album editing are the next step.', 'media')}</> : <>{contents.documents.some(d => d.kind === current?.kind) ? records(contents.documents.filter(d => d.kind === current?.kind)) : empty(section === 'Projects' ? 'No projects yet.' : `No ${section.toLowerCase()} content yet.`, 'This section is ready. Its editor will be added in the next CMS steps.', current?.icon)}</>}
          </div>
        </main>
        <footer className="ss-footer"><span>Emanuel Nicholas · Portfolio studio</span><span title={email}>Owner workspace</span></footer>
      </div>
    </div>
  </div>
}
