import { AdminIcon as Icon } from './AdminIcon'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CmsDocument, CmsAsset, Publication, Kind } from '../cms/content'
import { blankContent, assetIds } from '../cms/content'
import { loadWorkspace, uploadImage, archiveDocument, archiveImages, deleteImages, newDocument } from './cms'
import { importPortfolio } from './importPortfolio'
import { CmsEditor } from './CmsEditor'
import { MediaLibraryGrid, type MediaAction } from './MediaLibraryGrid'
import { PortfolioActivity } from './PortfolioActivity'
import './AdminDashboard.css'
import './AdminIdle.css'
import './AdminButtons.css'

type Section =
  | 'Overview'
  | 'Introduction'
  | 'Experience'
  | 'Projects'
  | 'Contact'
  | 'Media'
type Contents = {
  documents: CmsDocument[]
  assets: CmsAsset[]
  publications: Publication[]
}
const sections: {
  name: Section
  kind: string
  detail: string
  icon: string
}[] = [
  {
    name: 'Introduction',
    kind: 'introduction',
    detail: 'Profile, portraits, and social links',
    icon: 'user',
  },
  {
    name: 'Experience',
    kind: 'experience',
    detail: 'Roles and contributions',
    icon: 'work',
  },
  {
    name: 'Projects',
    kind: 'project',
    detail: 'The work you want to share',
    icon: 'layers',
  },
  {
    name: 'Contact',
    kind: 'contact',
    detail: 'Contact details and email',
    icon: 'mail',
  },
]

export function AdminDashboard({
  client,
  theme,
  onToggleTheme,
  onSignOut,
  idleWarning,
  onStaySignedIn,
}: {
  client: SupabaseClient
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onSignOut: () => void
  idleWarning: number | null
  onStaySignedIn: () => void
}) {
  const [section, setSection] = useState<Section>('Overview'),
    [menuOpen, setMenuOpen] = useState(false)
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false)
  const [contents, setContents] = useState<Contents | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('')
  const [editor, setEditor] = useState<CmsDocument | null>(null),
    [dirty, setDirty] = useState(false),
    [showArchived, setShowArchived] = useState(false)
  const [asset, setAsset] = useState<CmsAsset | null>(null)
  const workspaceRef = useRef<HTMLDivElement>(null)
  const ownerMenuRef = useRef<HTMLDivElement>(null)
  const ownerButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!ownerMenuOpen) return

    function dismissOutside(event: Event) {
      if (event.target instanceof Node && !ownerMenuRef.current?.contains(event.target)) {
        setOwnerMenuOpen(false)
      }
    }
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOwnerMenuOpen(false)
      ownerButtonRef.current?.focus()
    }

    document.addEventListener('pointerdown', dismissOutside)
    document.addEventListener('focusin', dismissOutside)
    document.addEventListener('keydown', dismissOnEscape)
    return () => {
      document.removeEventListener('pointerdown', dismissOutside)
      document.removeEventListener('focusin', dismissOutside)
      document.removeEventListener('keydown', dismissOnEscape)
    }
  }, [ownerMenuOpen])

  useLayoutEffect(() => {
    const workspace = workspaceRef.current
    if (workspace) workspace.scrollTop = 0
  }, [section, editor?.id, asset?.id])

  const reload = useCallback(async () => {
    const next = await loadWorkspace(client)
    setContents(next)
    setAsset((current) =>
      current
        ? { ...current, url: next.assets.find((a) => a.id === current.id)?.url }
        : null,
    )
  }, [client])
  useEffect(() => {
    let alive = true
    void loadWorkspace(client)
      .then((data) => {
        if (alive) setContents(data)
      })
      .catch((e) => {
        if (alive) setError(e.message)
      })
    const timer = window.setInterval(() => {
      if (!document.hidden) void reload().catch(() => {})
    }, 600000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [client, reload])
  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await action()
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Couldn’t finish. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }
  function leave() {
    return !dirty || window.confirm('Discard your unsaved changes?')
  }
  function go(next: Section) {
    if (busy || !leave()) return
    setDirty(false)
    const kind = next === 'Introduction' ? 'introduction' : next === 'Contact' ? 'contact' : null
    setEditor(kind ? singleton(kind) : null)
    setAsset(null)
    setSection(next)
    setMenuOpen(false)
    setOwnerMenuOpen(false)
    setShowArchived(false)
    setError('')
    setMessage('')
  }
  function singleton(kind: 'introduction' | 'contact') {
    if (!contents) return null
    const existing = contents.documents.find((d) => d.kind === kind && !d.deleted_at)
    if (existing) return existing
    const created = newDocument(kind, 0)
    created.content = blankContent(kind)
    created.title = kind === 'contact' ? 'Contact' : 'Introduction'
    return created
  }
  function open(doc: CmsDocument) {
    if (!leave()) return
    setDirty(false)
    setEditor(doc)
    setSection(sections.find((s) => s.kind === doc.kind)!.name)
    setError('')
    setMessage('')
  }
  function add(kind: Kind) {
    if (!leave() || !contents) return
    const created = newDocument(
      kind,
      contents.documents.filter((d) => d.kind === kind).length,
    )
    created.content = blankContent(kind)
    setDirty(false)
    setEditor(created)
  }
  async function upload(files: FileList) {
    const chosen = Array.from(files)
    await run(async () => {
      let completed = 0
      for (const file of chosen) {
        setMessage(`Uploading ${completed + 1} of ${chosen.length}…`)
        await uploadImage(client, file)
        completed++
      }
      await reload()
      setMessage(
        `${completed} image${completed === 1 ? '' : 's'} added. Select them in your content editor.`,
      )
    })
  }
  function editAsset(patch: Partial<CmsAsset>) {
    if (asset) {
      setAsset({ ...asset, ...patch })
      setDirty(true)
    }
  }
  async function manageImages(ids: string[], action: MediaAction) {
    await run(async () => {
      try {
        if (action === 'delete') await deleteImages(client, ids)
        else await archiveImages(client, ids, action === 'restore')
      } catch (error) {
        await reload().catch(() => {})
        throw error
      }
      setAsset(null)
      setDirty(false)
      await reload()
      const pastTense = action === 'delete' ? 'deleted' : action === 'restore' ? 'restored' : 'archived'
      setMessage(`${ids.length} image${ids.length === 1 ? '' : 's'} ${pastTense}.`)
    })
  }
  function empty(title: string, text: string, icon = 'layers') {
    return (
      <div className="ss-empty">
        <Icon name={icon} />
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    )
  }
  function record(doc: CmsDocument) {
    const pub = contents?.publications.find((p) => p.document_id === doc.id)
    const changed =
      pub &&
      (JSON.stringify(pub.content) !== JSON.stringify(doc.content) ||
        pub.title !== doc.title ||
        pub.sort_order !== doc.sort_order)
    const image = contents?.assets.find(
      (a) => a.id === assetIds(doc.content)[0],
    )
    return (
      <article className="ss-project-card" key={doc.id}>
        {image?.url ? (
          <img
            className="ss-project-cover"
            src={image.url}
            alt={image.alt_text}
          />
        ) : (
          <div className="ss-project-cover ss-cover-placeholder">
            <Icon
              name={sections.find((s) => s.kind === doc.kind)?.icon ?? 'layers'}
            />
          </div>
        )}
        <div className="ss-project-card-copy">
          <span className="ss-status">
            {doc.deleted_at
              ? 'Archived'
              : changed
                ? 'Unpublished changes'
                : pub
                  ? 'Published'
                  : 'Draft'}
          </span>
          <h3>{doc.title}</h3>
          <p>Updated {new Date(doc.updated_at).toLocaleDateString()}</p>
          {doc.deleted_at ? (
            <button
              className="ss-secondary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await archiveDocument(client, doc.id, true)
                  await reload()
                  setMessage('Restored as a draft. Publish when ready.')
                })
              }
            >
              Restore
            </button>
          ) : (
            <button
              className="ss-secondary"
              disabled={busy}
              onClick={() => open(doc)}
            >
              Edit {doc.kind === 'project' ? 'project' : 'content'} <Icon name="right" />
            </button>
          )}
        </div>
      </article>
    )
  }
  const activeDocs = contents?.documents.filter((d) => !d.deleted_at) ?? []
  const current = sections.find((s) => s.name === section)
  const documents =
    contents?.documents.filter(
      (d) => d.kind === current?.kind && !!d.deleted_at === showArchived,
    ) ?? []
  const media =
    contents?.assets.filter(
      (a) =>
        a.bucket_id === 'portfolio-media' && !!a.archived_at === showArchived,
    ) ?? []
  const mediaEntries = contents && section === 'Media'
    ? [...contents.documents, ...contents.publications]
    : []
  const referencedImages = new Set(mediaEntries.flatMap((entry) => assetIds(entry.content)))
  const used = asset
    ? [...new Set(mediaEntries.filter((entry) => assetIds(entry.content).includes(asset.id)).map((entry) => entry.title))]
    : []
  return (
    <div
      className="portfolio admin-dashboard"
      data-theme={theme}
      data-menu={menuOpen ? 'open' : 'closed'}
    >
      <div className="ss-app">
        <aside className="ss-sidebar">
          <div className="ss-brand-row">
            <button
              className="ss-brand"
              onClick={() => go('Overview')}
              aria-label="Portfolio studio overview"
            >
              emanuel.<span>PORTFOLIO STUDIO</span>
            </button>
            <button
              className="ss-menu ss-icon-button"
              aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={menuOpen}
              aria-controls="studio-navigation"
              onClick={() => {
                setMenuOpen(!menuOpen)
                setOwnerMenuOpen(false)
              }}
            >
              <Icon name={menuOpen ? 'close' : 'menu'} />
            </button>
          </div>
          <div className="ss-navigation" id="studio-navigation">
            <nav aria-label="Portfolio administration">
              <button
                className="ss-nav"
                aria-current={section === 'Overview' ? 'page' : undefined}
                onClick={() => go('Overview')}
              >
                <Icon name="overview" />
                Overview
              </button>
              <p className="ss-nav-label">YOUR CONTENT</p>
              {sections.map((s) => (
                <button
                  className="ss-nav"
                  key={s.name}
                  aria-current={section === s.name ? 'page' : undefined}
                  onClick={() => go(s.name)}
                >
                  <Icon name={s.icon} />
                  {s.name}
                </button>
              ))}
              <p className="ss-nav-label">LIBRARY</p>
              <button
                className="ss-nav"
                aria-current={section === 'Media' ? 'page' : undefined}
                onClick={() => go('Media')}
              >
                <Icon name="media" />
                Media library
              </button>
            </nav>
            <div className="ss-owner" ref={ownerMenuRef}>
              <button
                type="button"
                className="ss-owner-person"
                ref={ownerButtonRef}
                aria-expanded={ownerMenuOpen}
                aria-controls="studio-owner-actions"
                onClick={() => setOwnerMenuOpen((open) => !open)}
              >
                <span className="ss-avatar">
                  <Icon name="user" />
                </span>
                <span className="ss-owner-name">
                  <strong>Emanuel Nicholas</strong>
                  <span>Owner</span>
                </span>
                <span className="ss-owner-chevron"><Icon name="chevron" /></span>
              </button>
              <div className="ss-owner-actions" id="studio-owner-actions" hidden={!ownerMenuOpen}>
                <button
                  type="button"
                  className="ss-signout"
                  disabled={busy}
                  onClick={() => {
                    if (leave()) onSignOut()
                  }}
                >
                  <Icon name="logout" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </aside>
        <div className="ss-workspace" ref={workspaceRef}>
          <header className="ss-toolbar">
            <div className="ss-breadcrumb">
              <span>Workspace</span>
              <Icon name="chevron" />
              <strong>{section === 'Media' ? 'Media library' : section}</strong>
            </div>
            <div className="ss-toolbar-actions">
              <a
                className="ss-quiet"
                href="/"
                target="_blank"
                rel="noopener noreferrer"
              >
                View portfolio <Icon name="arrow" />
              </a>
              <button
                className="ss-icon-button"
                onClick={onToggleTheme}
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              >
                <Icon name={theme === 'light' ? 'moon' : 'sun'} />
              </button>
            </div>
          </header>
          <main className="ss-content" id="studio-content">
            {idleWarning !== null && <section className="ss-idle-warning" aria-label="Inactivity warning">
              <div className="ss-idle-clock" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
                </svg>
              </div>
              <div className="ss-idle-copy">
                <p role="status"><strong>Still working?</strong> Your session is about to end.</p>
                <p>Save any unsaved changes. Automatic sign-out in <span role="timer" aria-live="off">{Math.floor(idleWarning / 60)}:{String(idleWarning % 60).padStart(2, '0')}</span>.</p>
              </div>
              <button className="ss-primary" onClick={onStaySignedIn}>Stay signed in</button>
            </section>}
            {error && (
              <div role="alert" className="ss-message ss-error">
                {error}
                <button onClick={() => void run(reload)}>Retry loading</button>
              </div>
            )}
            {message && (
              <p role="status" className="ss-message">
                {message}
              </p>
            )}
            {editor && contents ? (
              <CmsEditor
                key={editor.id}
                initial={editor}
                sectionTitle={section === 'Introduction' ? 'Introduction' : undefined}
                assets={contents.assets}
                publications={contents.publications}
                client={client}
                theme={theme}
                externalBusy={busy}
                onWorkingChange={setBusy}
                onDirtyChange={setDirty}
                onClose={() => {
                  setDirty(false)
                  setEditor(null)
                  if (section === 'Introduction' || section === 'Contact') setSection('Overview')
                }}
                onSaved={async () => {
                  await reload()
                }}
                onUpload={(files) => void upload(files)}
              />
            ) : (
              <>
                <div className="ss-heading">
                  <div>
                    <div className="ss-eyebrow">
                      {section === 'Overview'
                        ? 'YOUR WORKSPACE'
                        : section === 'Media'
                          ? 'YOUR LIBRARY'
                          : 'YOUR CONTENT'}
                    </div>
                    <h1>
                      {section === 'Overview'
                        ? 'Welcome back, Emanuel.'
                        : section === 'Media'
                          ? 'Every image, in one place.'
                          : `${section}.`}
                    </h1>
                    <p className="ss-lead">
                      {section === 'Overview'
                        ? 'Choose a section to update.'
                        : section === 'Media'
                          ? 'Images for your introduction and project albums.'
                          : current?.detail}
                    </p>
                  </div>
                  {contents &&
                    (section === 'Media' ? (
                      <label
                        className={`ss-upload-button ${busy ? 'is-disabled' : ''}`}
                      >
                        <Icon name="upload" /> Upload images
                        <input
                          disabled={busy}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          multiple
                          onChange={(e) => {
                            if (e.target.files) void upload(e.target.files)
                            e.target.value = ''
                          }}
                        />
                      </label>
                    ) : current &&
                      (current.kind === 'project' ||
                        current.kind === 'experience' ||
                        !activeDocs.some((d) => d.kind === current.kind)) ? (
                      <button
                        className="ss-primary"
                        disabled={busy}
                        onClick={() => add(current!.kind as Kind)}
                      >
                        <Icon name="plus" /> Add {current.kind}
                      </button>
                    ) : null)}
                </div>
                {!contents && !error ? (
                  <p role="status">Loading your workspace…</p>
                ) : (
                  contents && (
                    <>
                      {section === 'Overview' ? (
                        <>
                          <PortfolioActivity client={client} />
                          {!contents.documents.length && (
                            <div className="ss-import">
                              <h2>Bring your portfolio into the studio.</h2>
                              <p>
                                Import the content and images already on your
                                website. Existing CMS edits will be preserved.
                              </p>
                              <button
                                className="ss-primary"
                                disabled={busy}
                                onClick={() =>
                                  void run(async () => {
                                    await importPortfolio(client, setMessage)
                                    await reload()
                                    setMessage(
                                      'Portfolio imported. You can now edit and publish every section.',
                                    )
                                  })
                                }
                              >
                                {busy
                                  ? 'Importing…'
                                  : 'Import existing portfolio'}
                              </button>
                            </div>
                          )}
                          {!!contents.documents.length && (
                            <section className="ss-overview" aria-label="Portfolio sections">
                              {sections.map((s) => {
                                const entries = activeDocs.filter((d) => d.kind === s.kind)
                                const pending = entries.filter((d) => {
                                  const live = contents.publications.find((p) => p.document_id === d.id)
                                  return !live || live.title !== d.title || live.sort_order !== d.sort_order || JSON.stringify(live.content) !== JSON.stringify(d.content)
                                }).length
                                return <button key={s.name} className="ss-overview-row" disabled={busy} onClick={() => go(s.name)}>
                                  <span className="ss-overview-icon"><Icon name={s.icon} /></span>
                                  <span className="ss-overview-copy"><strong>{s.name}</strong><small>{s.detail}</small></span>
                                  <span className="ss-overview-state">{pending ? 'Draft changes' : entries.length ? 'Published' : 'Not added'}</span>
                                  <Icon name="chevron" />
                                </button>
                              })}
                            </section>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="ss-list-toolbar">
                            <label className="ss-checkbox">
                              <input
                                type="checkbox"
                                checked={showArchived}
                                disabled={busy}
                                onChange={(e) => {
                                  if (!leave()) return
                                  setShowArchived(e.target.checked)
                                  setAsset(null)
                                  setDirty(false)
                                }}
                              />
                              Show archived
                            </label>
                            <span>
                              {section === 'Media'
                                ? media.length
                                : documents.length}{' '}
                              {section === 'Media' ? 'images' : 'entries'}
                            </span>
                          </div>
                          {section === 'Media' ? (
                            <>
                              {asset ? (
                                <section className="ss-media-details">
                                  <button
                                    className="ss-editor-back"
                                    onClick={() => {
                                      if (leave()) {
                                        setAsset(null)
                                        setDirty(false)
                                      }
                                    }}
                                  >
                                    <Icon name="left" /> All images
                                  </button>
                                  {asset.url && (
                                    <img
                                      className="ss-media-preview"
                                      src={asset.url}
                                      alt={asset.alt_text}
                                    />
                                  )}
                                  <label className="ss-field">
                                    File name
                                    <input
                                      value={asset.original_filename}
                                      maxLength={200}
                                      onChange={(e) =>
                                        editAsset({
                                          original_filename: e.target.value,
                                        })
                                      }
                                    />
                                  </label>
                                  <label className="ss-field">
                                    Image description (alt text)
                                    <textarea
                                      value={asset.alt_text}
                                      onChange={(e) =>
                                        editAsset({ alt_text: e.target.value })
                                      }
                                    />
                                  </label>
                                  {used.length > 0 && (
                                    <p className="ss-lead">
                                      Used in {used.join(', ')}. Republish each entry to update its public image description.
                                    </p>
                                  )}
                                  <div className="ss-row-actions">
                                    <button
                                      className="ss-primary"
                                      disabled={busy}
                                      onClick={() =>
                                        void run(async () => {
                                          const { error } = await client
                                            .from('cms_assets')
                                            .update({
                                              original_filename:
                                                asset.original_filename.trim() ||
                                                'Image',
                                              alt_text: asset.alt_text,
                                            })
                                            .eq('id', asset.id)
                                          if (error)
                                            throw new Error(
                                              'Couldn’t save image details.',
                                            )
                                          await reload()
                                          setDirty(false)
                                          setMessage('Image details saved.')
                                        })
                                      }
                                    >
                                      Save image details
                                    </button>
                                    <button
                                      className="ss-secondary"
                                      disabled={
                                        busy ||
                                        asset.deletion_pending ||
                                        (!asset.archived_at && used.length > 0)
                                      }
                                      onClick={() => {
                                        if (leave()) void manageImages([asset.id], asset.archived_at ? 'restore' : 'archive')
                                      }}
                                    >
                                      {asset.archived_at
                                        ? 'Restore image'
                                        : 'Archive image'}
                                    </button>
                                  </div>
                                  {asset.original_asset_id &&
                                    contents.assets.find(
                                      (a) => a.id === asset.original_asset_id,
                                    )?.url && (
                                      <a
                                        className="ss-quiet"
                                        href={
                                          contents.assets.find(
                                            (a) =>
                                              a.id === asset.original_asset_id,
                                          )?.url
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        View private original <Icon name="arrow" />
                                      </a>
                                    )}
                                </section>
                              ) : media.length ? (
                                <MediaLibraryGrid
                                  key={String(showArchived)}
                                  images={media}
                                  referencedImages={referencedImages}
                                  archived={showArchived}
                                  busy={busy}
                                  onOpen={setAsset}
                                  onManage={(ids, action) => void manageImages(ids, action)}
                                />
                              ) : (
                                empty(
                                  showArchived
                                    ? 'No archived images.'
                                    : 'A fresh canvas for your images.',
                                  'Upload images, then choose them in your content editor.',
                                  'media',
                                )
                              )}
                            </>
                          ) : documents.length ? (
                            <div className="ss-project-grid">
                              {documents.map(record)}
                            </div>
                          ) : (
                            empty(
                              showArchived
                                ? 'No archived content.'
                                : 'Ready for your story.',
                              'Add content above to get started.',
                              current?.icon,
                            )
                          )}
                        </>
                      )}
                    </>
                  )
                )}
              </>
            )}
          </main>

        </div>
      </div>
    </div>
  )
}
