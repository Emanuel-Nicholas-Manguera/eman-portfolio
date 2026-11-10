import { useCallback, useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CmsDocument, CmsAsset, Publication, Kind } from '../cms/content'
import { blankContent, assetIds } from '../cms/content'
import { loadWorkspace, uploadImage, archiveDocument, newDocument } from './cms'
import { importPortfolio } from './importPortfolio'
import { CmsEditor } from './CmsEditor'
import './AdminDashboard.css'

type Section =
  | 'Overview'
  | 'Introduction'
  | 'Experience'
  | 'Projects'
  | 'About'
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
    detail: 'Your first impression',
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
    name: 'About',
    kind: 'about',
    detail: 'Education and recognition',
    icon: 'education',
  },
  {
    name: 'Contact',
    kind: 'contact',
    detail: 'Ways to reach you',
    icon: 'mail',
  },
]
const paths: Record<string, string> = {
  overview: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  user: 'M20 21v-2a8 8 0 0 0-16 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  work: 'M8 6V3h8v3M3 6h18v14H3zM3 11l9 4 9-4',
  layers: 'm12 3 10 5-10 5L2 8zm-10 10 10 5 10-5M2 18l10 5 10-5',
  education: 'm2 8 10-5 10 5-10 5zm4 3v6q6 5 12 0v-6M22 8v9',
  mail: 'M3 5h18v14H3zM3 5l9 8 9-8',
  media: 'M3 3h18v18H3zM3 17l6-6 5 5 3-3 4 4M8 7h.01',
  arrow: 'M7 17 17 7M7 7h10v10',
  right: 'M5 12h14m-6-6 6 6-6 6',
  chevron: 'm9 5 7 7-7 7',
  logout: 'M9 3H3v18h6m6-15 6 6-6 6M8 12h13',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'm6 6 12 12M6 18 18 6',
  moon: 'M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10',
  sun: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',
}
export function Icon({ name }: { name: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.layers} />
    </svg>
  )
}

export function AdminDashboard({
  client,
  email,
  theme,
  onToggleTheme,
  onSignOut,
}: {
  client: SupabaseClient
  email: string
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onSignOut: () => void
}) {
  const [section, setSection] = useState<Section>('Overview'),
    [menuOpen, setMenuOpen] = useState(false)
  const [contents, setContents] = useState<Contents | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('')
  const [editor, setEditor] = useState<CmsDocument | null>(null),
    [dirty, setDirty] = useState(false),
    [showArchived, setShowArchived] = useState(false)
  const [asset, setAsset] = useState<CmsAsset | null>(null)
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
    setEditor(null)
    setAsset(null)
    setSection(next)
    setMenuOpen(false)
    setShowArchived(false)
    setError('')
    setMessage('')
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
              Edit {doc.kind === 'project' ? 'project' : 'content'} ↗
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
  const projects = activeDocs.filter((d) => d.kind === 'project')
  const media =
    contents?.assets.filter(
      (a) =>
        a.bucket_id === 'portfolio-media' && !!a.archived_at === showArchived,
    ) ?? []
  const used = asset
    ? (contents?.documents.filter((d) =>
        assetIds(d.content).includes(asset.id),
      ) ?? [])
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
              onClick={() => setMenuOpen(!menuOpen)}
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
            <div className="ss-owner">
              <div className="ss-owner-person">
                <span className="ss-avatar">
                  <Icon name="user" />
                </span>
                <div>
                  <strong>Emanuel Nicholas</strong>
                  <span>Owner</span>
                </div>
              </div>
              <button
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
        </aside>
        <div className="ss-workspace">
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
                        ? 'A space to shape your work and your story.'
                        : section === 'Media'
                          ? 'Images for your introduction and project albums.'
                          : current?.detail}
                    </p>
                  </div>
                  {contents &&
                    (section === 'Overview' ? (
                      <button
                        className="ss-primary"
                        disabled={busy}
                        onClick={() => {
                          setSection('Projects')
                          add('project')
                        }}
                      >
                        + New project
                      </button>
                    ) : section === 'Media' ? (
                      <label
                        className={`ss-upload-button ${busy ? 'is-disabled' : ''}`}
                      >
                        + Upload images
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
                        + Add {current.kind}
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
                          <section>
                            <div className="ss-section-heading">
                              <h2>
                                Your projects <small>{projects.length}</small>
                              </h2>
                              <button onClick={() => go('Projects')}>
                                View all
                                <Icon name="right" />
                              </button>
                            </div>
                            {projects.length ? (
                              <div className="ss-project-grid">
                                {projects.slice(0, 3).map(record)}
                              </div>
                            ) : (
                              empty(
                                'Your next chapter starts here.',
                                'Add a project with a description, images, and a link.',
                              )
                            )}
                          </section>
                          <div className="ss-bottom-grid">
                            <section>
                              <div className="ss-section-heading">
                                <h2>Portfolio sections</h2>
                              </div>
                              <div className="ss-section-list">
                                {sections
                                  .filter((s) => s.name !== 'Projects')
                                  .map((s) => (
                                    <button
                                      key={s.name}
                                      className="ss-content-row"
                                      onClick={() => go(s.name)}
                                    >
                                      <Icon name={s.icon} />
                                      <span>
                                        <strong>{s.name}</strong>
                                        <small>{s.detail}</small>
                                      </span>
                                      <Icon name="chevron" />
                                    </button>
                                  ))}
                              </div>
                            </section>
                            <section>
                              <div className="ss-section-heading">
                                <h2>A place for your photos</h2>
                              </div>
                              <div className="ss-upload-tile">
                                <span className="ss-upload-icon">
                                  <Icon name="media" />
                                </span>
                                <div className="ss-upload-copy">
                                  <strong>Bring your work to life.</strong>
                                  <p>
                                    {
                                      contents.assets.filter(
                                        (a) =>
                                          a.bucket_id === 'portfolio-media' &&
                                          !a.archived_at,
                                      ).length
                                    }{' '}
                                    images ready for your portfolio.
                                  </p>
                                </div>
                                <button
                                  className="ss-primary"
                                  onClick={() => go('Media')}
                                >
                                  Open library
                                  <Icon name="right" />
                                </button>
                              </div>
                            </section>
                          </div>
                          {!!contents.documents.length && (
                            <details className="ss-import-details">
                              <summary>
                                Import missing content from the original
                                portfolio
                              </summary>
                              <p>
                                This fills missing entries and leaves existing
                                CMS edits in place.
                              </p>
                              <button
                                className="ss-secondary"
                                disabled={busy}
                                onClick={() =>
                                  void run(async () => {
                                    await importPortfolio(client, setMessage)
                                    await reload()
                                    setMessage('Import complete.')
                                  })
                                }
                              >
                                Import missing content
                              </button>
                            </details>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="ss-list-toolbar">
                            <label className="ss-checkbox">
                              <input
                                type="checkbox"
                                checked={showArchived}
                                onChange={(e) => {
                                  setShowArchived(e.target.checked)
                                  setAsset(null)
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
                                    ← All images
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
                                  <p className="ss-lead">
                                    {used.length
                                      ? `Used in: ${used.map((d) => d.title).join(', ')}. Republish each entry to update its public image description.`
                                      : 'Not used in any drafts.'}
                                  </p>
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
                                        (!asset.archived_at && used.length > 0)
                                      }
                                      onClick={() =>
                                        void run(async () => {
                                          const { error } = await client.rpc(
                                            'archive_cms_asset',
                                            {
                                              target_id: asset.id,
                                              restore: !!asset.archived_at,
                                            },
                                          )
                                          if (error)
                                            throw new Error(
                                              'Remove this image from all draft and published albums before archiving.',
                                            )
                                          setAsset(null)
                                          await reload()
                                          setMessage('Image library updated.')
                                        })
                                      }
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
                                        View private original ↗
                                      </a>
                                    )}
                                </section>
                              ) : media.length ? (
                                <div className="ss-media-grid">
                                  {media.map((a) => (
                                    <button
                                      className="ss-media-item"
                                      key={a.id}
                                      onClick={() => setAsset(a)}
                                    >
                                      {a.url ? (
                                        <img src={a.url} alt={a.alt_text} />
                                      ) : (
                                        <div className="ss-cover-placeholder">
                                          <Icon name="media" />
                                        </div>
                                      )}
                                      <span>{a.original_filename}</span>
                                    </button>
                                  ))}
                                </div>
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
          <footer className="ss-footer">
            <span>Emanuel Nicholas · Portfolio studio</span>
            <span title={email}>Owner workspace</span>
          </footer>
        </div>
      </div>
    </div>
  )
}
