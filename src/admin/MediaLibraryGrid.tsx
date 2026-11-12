import { useState } from 'react'
import type { CmsAsset } from '../cms/content'
import { AdminIcon as Icon } from './AdminIcon'

export type MediaAction = 'archive' | 'restore' | 'delete'

export function MediaLibraryGrid({
  images,
  referencedImages,
  archived,
  busy,
  onOpen,
  onManage,
}: {
  images: CmsAsset[]
  referencedImages: Set<string>
  archived: boolean
  busy: boolean
  onOpen: (image: CmsAsset) => void
  onManage: (ids: string[], action: MediaAction) => void
}) {
  const [selection, setSelection] = useState(() => new Set<string>())
  const selectable = images.filter((image) => !referencedImages.has(image.id))
  const selected = selectable.filter((image) => selection.has(image.id))
  const ids = selected.map((image) => image.id)
  const allSelected = selected.length > 0 && selected.length === selectable.length
  const canArchive = !busy && ids.length > 0 && selected.every((image) => !image.deletion_pending)

  function toggle(id: string, checked: boolean) {
    setSelection((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function confirmDelete() {
    const imagesToDelete = ids.length === 1 ? 'this image' : `these ${ids.length} images`
    if (window.confirm(`Permanently delete ${imagesToDelete} from the media library?`)) {
      onManage(ids, 'delete')
    }
  }

  return (
    <>
      <div className="ss-media-toolbar" role="group" aria-label="Image selection actions">
        <label className="ss-checkbox">
          <input
            type="checkbox"
            checked={allSelected}
            disabled={busy || !selectable.length}
            ref={(input) => {
              if (input) input.indeterminate = selected.length > 0 && !allSelected
            }}
            onChange={(event) => setSelection(new Set(event.target.checked ? selectable.map((image) => image.id) : []))}
          />
          Select all
        </label>
        <span role="status">{selected.length} selected</span>
        <div className="ss-media-buttons">
          <button
            type="button"
            className="ss-secondary"
            disabled={!canArchive}
            onClick={() => onManage(ids, archived ? 'restore' : 'archive')}
          >
            <Icon name={archived ? 'upload' : 'archive'} /> {archived ? 'Restore' : 'Archive'}
          </button>
          <button
            type="button"
            className="ss-secondary ss-media-delete"
            disabled={busy || !ids.length}
            onClick={confirmDelete}
          >
            <Icon name="trash" /> Delete
          </button>
        </div>
      </div>
      <div className="ss-media-grid">
        {images.map((image) => {
          const inUse = referencedImages.has(image.id)
          const checked = selection.has(image.id) && !inUse
          const status = inUse ? 'In use' : image.deletion_pending ? 'Deletion pending' : ''
          return (
            <article className="ss-media-card" data-selected={checked} key={image.id}>
              <button
                type="button"
                className="ss-media-item"
                disabled={busy || image.deletion_pending}
                onClick={() => onOpen(image)}
              >
                {image.url ? (
                  <img src={image.url} alt={image.alt_text} loading="lazy" />
                ) : (
                  <span className="ss-cover-placeholder"><Icon name="media" /></span>
                )}
                <span className="ss-media-name">
                  {image.original_filename}
                  {status && <small>{status}</small>}
                </span>
              </button>
              <label className="ss-media-select">
                <input
                  type="checkbox"
                  aria-label={`Select ${image.original_filename}${inUse ? ' (in use)' : ''}`}
                  checked={checked}
                  disabled={busy || inUse}
                  onChange={(event) => toggle(image.id, event.target.checked)}
                />
              </label>
            </article>
          )
        })}
      </div>
    </>
  )
}
