import { AdminIcon as Icon } from './AdminIcon'
import { useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { DocumentFields } from './DocumentFields'
import { PortfolioBody } from '../PortfolioBody'
import { resolvePortfolio } from '../cms/portfolio'
import type {
  CmsDocument,
  CmsAsset,
  Publication,
  PublicAsset,
  ExperienceContent,
  ProjectContent,
} from '../cms/content'
import type { SocialId } from '../socialData'
import { assetIds, validateContent } from '../cms/content'
import { saveDocument, publishDocument, archiveDocument } from './cms'

export function CmsEditor({
  initial,
  sectionTitle,
  assets,
  publications,
  onSaved,
  onClose,
  onEditSocialLinks,
  onUpload,
  onDirtyChange,
  onWorkingChange,
  externalBusy,
  client,
  theme,
}: {
  initial: CmsDocument
  sectionTitle?: string
  assets: CmsAsset[]
  publications: Publication[]
  onSaved: (doc: CmsDocument) => Promise<void>
  onClose: () => void
  onEditSocialLinks?: () => void
  externalBusy: boolean
  onWorkingChange: (busy: boolean) => void
  onDirtyChange: (dirty: boolean) => void
  onUpload: (files: FileList) => void
  client: SupabaseClient
  theme: 'light' | 'dark'
}) {
  const [doc, setDoc] = useState(initial),
    [baseline, setBaseline] = useState(initial),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [failure, setFailure] = useState(false)
  const [preview, setPreview] = useState(false),
    [social, setSocial] = useState<SocialId | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const dirty = JSON.stringify(doc) !== JSON.stringify(baseline)
  useEffect(() => {
    onDirtyChange(dirty)
  }, [dirty, onDirtyChange])
  const published = publications.find((p) => p.document_id === doc.id)
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  useEffect(() => {
    if (preview) dialog.current?.showModal()
    else dialog.current?.close()
  }, [preview])
  function close() {
    if (busy || externalBusy) return
    if (!dirty || window.confirm('Discard your unsaved changes?')) onClose()
  }
  async function act(action: 'save' | 'publish' | 'unpublish' | 'archive') {
    setBusy(true)
    onWorkingChange(true)
    setMessage('')
    setFailure(false)
    try {
      if (action === 'archive') {
        if (
          !window.confirm(
            'Archive this content? It will be removed from the portfolio. You can restore it later.',
          )
        )
          return
        await archiveDocument(client, doc.id)
        await onSaved(doc)
        onClose()
        return
      }
      if (action === 'unpublish') {
        await publishDocument(client, doc.id, true)
        await onSaved(doc)
        setMessage('Unpublished. Your draft is still available.')
        return
      }
      const next = structuredClone(doc)
      if (next.kind === 'experience') {
        const c = next.content as ExperienceContent
        c.languages = c.languages.map((x) => x.trim()).filter(Boolean)
        if (c.dates) {
          const format = (value: string) =>
            new Intl.DateTimeFormat('en', {
              month: 'short',
              year: 'numeric',
              timeZone: 'UTC',
            }).format(new Date(value + '-01T00:00:00Z'))
          if (c.dates.start && c.dates.end)
            c.dates.label = `${format(c.dates.start)} — ${format(c.dates.end)}`
        }
      }
      if (next.kind === 'project') {
        const c = next.content as ProjectContent
        c.technologies = c.technologies.map((x) => x.trim()).filter(Boolean)
      }
      if (action === 'publish')
        validateContent(next.kind, next.title, next.content)
      const saved = await saveDocument(client, next)
      setDoc(saved)
      setBaseline(saved)
      // Keep the saved draft visible if publishing fails so a retry never loses edits.
      if (action === 'publish') await publishDocument(client, saved.id)
      await onSaved(saved)
      setMessage(
        action === 'publish'
          ? 'Published. Your portfolio is up to date.'
          : 'Draft saved. Publish when you’re ready.',
      )
    } catch (e) {
      setFailure(true)
      setMessage(
        e instanceof Error ? e.message : 'Couldn’t finish. Please try again.',
      )
    } finally {
      setBusy(false)
      onWorkingChange(false)
    }
  }
  const draft: Publication = {
    document_id: doc.id,
    kind: doc.kind,
    slug: doc.slug,
    title: doc.title,
    content: doc.content,
    sort_order: doc.sort_order,
    published_at: '',
  }
  const snapshot = [
    ...publications.filter(
      (p) =>
        p.document_id !== doc.id &&
        (!['introduction', 'contact', 'about'].includes(doc.kind) ||
          p.kind !== doc.kind),
    ),
    draft,
  ]
  const links: PublicAsset[] = snapshot.flatMap((p) =>
    assetIds(p.content).flatMap((id) => {
      const a = assets.find((a) => a.id === id)
      return a
        ? [
            {
              document_id: p.document_id,
              asset_id: id,
              object_path: a.object_path,
              alt_text: a.alt_text,
              caption: '',
              sort_order: 0,
              url: a.url,
            },
          ]
        : []
    }),
  )
  return (
    <>
      {(doc.kind === 'project' || doc.kind === 'experience') && (
        <button className="ss-editor-back" onClick={close}>
          <Icon name="left" /> Back to {doc.kind === 'project' ? 'projects' : 'experience'}
        </button>
      )}
      <div className="ss-heading">
        <div>
          <div className="ss-eyebrow">{doc.kind.toUpperCase()} EDITOR</div>
          <h1>{sectionTitle || doc.title || 'Untitled content'}</h1>
          <p className="ss-lead">
            {published
              ? 'A published version is live.'
              : 'Only you can see this draft.'}
          </p>
        </div>
        <div className="ss-editor-heading-actions">
          {onEditSocialLinks && (
            <button type="button" className="ss-quiet" disabled={busy || externalBusy} onClick={onEditSocialLinks}>
              Edit social links <Icon name="right" />
            </button>
          )}
          <button className="ss-secondary" onClick={() => setPreview(true)}>
            <Icon name="eye" /> Preview draft
          </button>
        </div>
      </div>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void act('save')
        }}
        aria-busy={busy}
      >
        <fieldset
          disabled={busy || externalBusy}
          className="ss-editor-fieldset"
        >
          {['experience', 'project'].includes(doc.kind) && <div className="ss-document-meta">
            <label className="ss-field">
              Title in CMS
              <input
                value={doc.title}
                required
                maxLength={200}
                onChange={(e) => setDoc({ ...doc, title: e.target.value })}
              />
            </label>
            <label className="ss-field">
              Display order
              <input
                type="number"
                min={0}
                value={doc.sort_order}
                onChange={(e) =>
                  setDoc({ ...doc, sort_order: Number(e.target.value) })
                }
              />
            </label>
          </div>}
          <DocumentFields
            value={doc}
            assets={assets}
            onChange={(content) => setDoc({ ...doc, content })}
            onUpload={onUpload}
          />
          <div className="ss-editor-actions">
            <span>
              {busy
                ? 'Working…'
                : dirty
                  ? 'Unsaved changes'
                  : doc.updated_at
                    ? 'Saved draft'
                    : 'Not saved yet'}
            </span>
            <div>
              <button className="ss-secondary" type="submit">
                <Icon name="save" /> Save draft
              </button>
              <button
                className="ss-primary"
                type="button"
                onClick={() => void act('publish')}
              >
                <Icon name="upload" /> Save & publish
              </button>
            </div>
          </div>
          {doc.updated_at && (
            <div className="ss-row-actions">
              {published && (
                <button type="button" onClick={() => void act('unpublish')}>
                  Unpublish
                </button>
              )}
              <button type="button" onClick={() => void act('archive')}>
                <Icon name="archive" /> Archive content
              </button>
            </div>
          )}
        </fieldset>
      </form>
      {message && (
        <p
          className={failure ? 'ss-message ss-error' : 'ss-message'}
          role={failure ? 'alert' : 'status'}
        >
          {message}
        </p>
      )}
      <dialog
        className="ss-draft-dialog"
        ref={dialog}
        onCancel={() => setPreview(false)}
        onClose={() => setPreview(false)}
      >
        <div className="ss-preview-bar">
          <span>Draft preview · visible only to you</span>
          <button className="ss-secondary" onClick={() => setPreview(false)}>
            Close preview <Icon name="close" />
          </button>
        </div>
        <div
          className="portfolio ss-preview-site"
          data-theme={theme}
          data-social={social ?? undefined}
        >
          <main className="main-content">
            <PortfolioBody
              data={resolvePortfolio(snapshot, links)}
              social={social}
              onSocialSelect={setSocial}
            />
          </main>
        </div>
      </dialog>
    </>
  )
}
