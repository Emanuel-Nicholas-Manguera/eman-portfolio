import { AdminIcon as Icon } from './AdminIcon'
import { identifySocialLinks, resolveSocialLinks, socialLabelLimit, socialPlatforms, type SocialPlatform, type SocialProfileEntry } from '../cms/content'
import type {
  CmsDocument,
  CmsAsset,
  Content,
  PhotoContent,
  IntroductionContent,
  ExperienceContent,
  ProjectContent,
  ContactContent,
} from '../cms/content'

type Props = {
  value: CmsDocument
  publishedContact?: ContactContent
  assets: CmsAsset[]
  onChange: (content: Content) => void
  onUpload: (files: FileList) => void
}
function Field({
  label,
  value,
  onChange,
  multiline = false,
  type = 'text',
  required = false,
  maxLength,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  type?: string
  required?: boolean
  maxLength?: number
}) {
  return (
    <label className="ss-field">
      {label}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          required={required}
          maxLength={maxLength}
        />
      ) : (
        <input
          value={value}
          type={type}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          maxLength={maxLength}
        />
      )}
    </label>
  )
}
function List({
  label,
  value,
  onChange,
}: {
  label: string
  value: string[]
  onChange: (value: string[]) => void
}) {
  return (
    <Field
      label={`${label} (one per line)`}
      multiline
      value={value.join('\n')}
      onChange={(v) => onChange(v.split('\n'))}
    />
  )
}
function Repeater({
  label,
  rows,
  onChange,
}: {
  label: string
  rows: { title: string; detail: string }[]
  onChange: (rows: { title: string; detail: string }[]) => void
}) {
  return (
    <section className="ss-repeater">
      <div className="ss-section-heading">
        <h2>{label}</h2>
        <button
          type="button"
          onClick={() => onChange([...rows, { title: '', detail: '' }])}
        >
          <Icon name="plus" /> Add
        </button>
      </div>
      {rows.map((row, i) => (
        <div key={i} className="ss-repeat-row">
          <Field
            label={`${label} ${i + 1} title`}
            value={row.title}
            onChange={(title) =>
              onChange(rows.map((r, n) => (n === i ? { ...r, title } : r)))
            }
          />
          <Field
            label="Details"
            multiline
            value={row.detail}
            onChange={(detail) =>
              onChange(rows.map((r, n) => (n === i ? { ...r, detail } : r)))
            }
          />
          <div className="ss-row-actions">
            <button
              type="button"
              disabled={!i}
              onClick={() => {
                const next = [...rows]
                ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
                onChange(next)
              }}
              aria-label={`Move ${label} ${i + 1} up`}
            >
              <Icon name="up" /> Move up
            </button>
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, n) => n !== i))}
            >
              <Icon name="trash" /> Remove
            </button>
          </div>
        </div>
      ))}
    </section>
  )
}
function ImageChoice({
  label,
  id,
  assets,
  onChange,
}: {
  label: string
  id?: string
  assets: CmsAsset[]
  onChange: (id: string) => void
}) {
  const selected = assets.find((a) => a.id === id)
  return (
    <div className="ss-image-choice">
      <label className="ss-field">
        {label}
        <select value={id ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choose an image</option>
          {assets
            .filter((a) => a.bucket_id === 'portfolio-media' && !a.archived_at && !a.deletion_pending)
            .map((a) => (
              <option value={a.id} key={a.id}>
                {a.original_filename}
              </option>
            ))}
        </select>
      </label>
      {selected?.url && <img src={selected.url} alt={selected.alt_text} />}
    </div>
  )
}
const platformOptions = Object.keys(socialPlatforms) as SocialPlatform[]

function SocialFields({ links, onChange }: {
  links: SocialProfileEntry[]
  onChange: (links: SocialProfileEntry[]) => void
}) {
  function move(index: number, offset: -1 | 1) {
    const next = [...links]
    const [link] = next.splice(index, 1)
    next.splice(index + offset, 0, link)
    onChange(next)
  }
  function update(id: string, patch: Partial<Pick<SocialProfileEntry, 'destination' | 'caption' | 'label'>>) {
    onChange(links.map((link) => link.id === id ? { ...link, ...patch } : link))
  }
  return (
    <details className="ss-editor-disclosure ss-social-fields">
      <summary>Social links</summary>
      <label className="ss-field ss-social-add">
        Add social link
        <select value="" onChange={(event) => {
          const platform = platformOptions.find((id) => id === event.target.value)
          if (platform) onChange([...links, { id: crypto.randomUUID(), platform, destination: '', caption: '' }])
        }}>
          <option value="">Choose a platform</option>
          {platformOptions.map((platform) => <option key={platform} value={platform}>{socialPlatforms[platform]}</option>)}
        </select>
      </label>
      {links.map(({ id, platform, destination, caption, label }, index) => {
        const platformLabel = socialPlatforms[platform]
        const heading = label?.trim() || platformLabel
        const destinationLabel = platform === 'gmail' ? 'Gmail email address'
          : platform === 'discord' ? 'Discord invite or profile URL'
          : platform === 'website' ? 'Website URL'
          : `${platformLabel} profile URL`
        return (
          <fieldset key={id} className="ss-social-profile">
            <legend>{heading}</legend>
            <div className="ss-social-profile-fields">
              <Field
                label={destinationLabel}
                type={platform === 'gmail' ? 'email' : 'url'}
                value={destination}
                onChange={(destination) => update(id, { destination })}
              />
              <Field label="Display name (optional)" maxLength={socialLabelLimit} value={label ?? ''} onChange={(label) => update(id, { label })} />
              <Field label="Click caption (optional)" value={caption} onChange={(caption) => update(id, { caption })} />
            </div>
            <div className="ss-row-actions">
              <button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move ${heading} up`}>
                <Icon name="up" /> Move up
              </button>
              <button type="button" disabled={index === links.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${heading} down`}>
                <Icon name="down" /> Move down
              </button>
              <button type="button" onClick={() => onChange(links.filter((link) => link.id !== id))} aria-label={`Remove ${heading}`}>
                <Icon name="trash" /> Remove
              </button>
            </div>
          </fieldset>
        )
      })}
    </details>
  )
}

export function DocumentFields({ value, publishedContact, assets, onChange, onUpload }: Props) {
  function text<T extends Content>(
    c: T,
    key: keyof T,
    label: string,
    multiline = false,
    type = 'text',
    required = false,
  ) {
    return (
      <Field
        key={String(key)}
        label={label}
        value={String(c[key] ?? '')}
        multiline={multiline}
        type={type}
        required={required}
        onChange={(v) => onChange({ ...c, [key]: v })}
      />
    )
  }
  const upload = (
    <label className="ss-upload-button">
      <Icon name="upload" /> Upload images
      <input
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={(e) => {
          if (e.target.files) onUpload(e.target.files)
          e.target.value = ''
        }}
      />
    </label>
  )
  switch (value.kind) {
    case 'introduction': {
      const c = value.content as IntroductionContent
      return (
        <>
          <SocialFields
            links={c.socialLinks === undefined ? resolveSocialLinks(undefined, publishedContact) : identifySocialLinks(c.socialLinks)}
            onChange={(socialLinks) => onChange({ ...c, socialLinks })}
          />
          <div className="ss-editor-grid">
            <div className="ss-editor-fields">
              {text(c, 'name', 'Name', false, 'text', true)}
              {text(c, 'location', 'Location')}
              {text(c, 'role', 'Developer role', false, 'text', true)}
              {text(
                c,
                'description',
                'Developer introduction',
                true,
                'text',
                true,
              )}
              <details className="ss-editor-disclosure">
                <summary>Graduation introduction</summary>
                {text(c, 'graduateRole', 'Graduate role')}
                {text(c, 'graduateDescription', 'Education introduction', true)}
              </details>
              <details className="ss-editor-disclosure">
                <summary>Button labels</summary>
                {text(c, 'actionLabel', 'Projects button label')}
                {text(c, 'scrollLabel', 'Scroll invitation')}
              </details>
            </div>
            <section>
              <h2>Portraits</h2>
              <ImageChoice
                label="Developer portrait"
                id={c.suitAssetId}
                assets={assets}
                onChange={(suitAssetId) => onChange({ ...c, suitAssetId })}
              />
              <ImageChoice
                label="Graduation portrait"
                id={c.graduationAssetId}
                assets={assets}
                onChange={(graduationAssetId) =>
                  onChange({ ...c, graduationAssetId })
                }
              />
              {upload}
            </section>
          </div>
        </>
      )
    }
    case 'experience': {
      const c = value.content as ExperienceContent
      return (
        <div className="ss-editor-grid">
          <div className="ss-editor-fields">
            {text(c, 'name', 'Company selector label', false, 'text', true)}
            {text(c, 'company', 'Company', false, 'text', true)}
            {text(c, 'department', 'Department')}
            {text(c, 'role', 'Role', false, 'text', true)}
            {text(c, 'location', 'Location')}
            {text(c, 'kind', 'Employment type')}
            <label className="ss-checkbox">
              <input
                type="checkbox"
                checked={!!c.dates}
                onChange={(e) =>
                  onChange({
                    ...c,
                    dates: e.target.checked
                      ? { start: '', end: '', label: '' }
                      : null,
                  })
                }
              />
              Show dates
            </label>
            {c.dates && (
              <>
                <Field
                  type="month"
                  label="Start month"
                  value={c.dates.start}
                  onChange={(start) =>
                    onChange({ ...c, dates: { ...c.dates!, start } })
                  }
                />
                <Field
                  type="month"
                  label="End month"
                  value={c.dates.end}
                  onChange={(end) =>
                    onChange({ ...c, dates: { ...c.dates!, end } })
                  }
                />
              </>
            )}
            {text(c, 'summary', 'Summary', true, 'text', true)}
            <List
              label="Languages and tools"
              value={c.languages}
              onChange={(languages) => onChange({ ...c, languages })}
            />
          </div>
          <Repeater
            label="Contributions"
            rows={c.contributions}
            onChange={(contributions) => onChange({ ...c, contributions })}
          />
        </div>
      )
    }
    case 'project': {
      const c = value.content as ProjectContent
      const photos = c.photos
      function update(i: number, patch: Partial<PhotoContent>) {
        onChange({
          ...c,
          photos: photos.map((p, n) => (n === i ? { ...p, ...patch } : p)),
        })
      }
      return (
        <div className="ss-editor-grid">
          <div className="ss-editor-fields">
            {text(c, 'name', 'Project name', false, 'text', true)}
            {text(c, 'kind', 'Category')}
            {text(c, 'organization', 'Organization')}
            {text(c, 'description', 'Description', true, 'text', true)}
            <List
              label="Technologies"
              value={c.technologies}
              onChange={(technologies) => onChange({ ...c, technologies })}
            />
            {text(c, 'source', 'Project or source link', false, 'url')}
          </div>
          <section>
            <div className="ss-section-heading">
              <h2>Project album</h2>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...c,
                    photos: [...photos, { label: '', note: '', assetId: '' }],
                  })
                }
              >
                <Icon name="plus" /> Add photo
              </button>
            </div>
            {photos.map((photo, i) => (
              <div className="ss-repeat-row" key={i}>
                {photo.illustration && !photo.assetId && (
                  <p className="ss-lead">
                    Existing{' '}
                    {photo.illustration === 'golf' ? 'GolfMatch' : 'DOST'}{' '}
                    illustration. Choose an image to replace it.
                  </p>
                )}
                <ImageChoice
                  label={`Photo ${i + 1}`}
                  id={photo.assetId}
                  assets={assets}
                  onChange={(assetId) =>
                    update(i, { assetId, illustration: undefined })
                  }
                />
                <Field
                  label="Photo label"
                  value={photo.label}
                  onChange={(label) => update(i, { label })}
                />
                <Field
                  label="Caption"
                  value={photo.note}
                  onChange={(note) => update(i, { note })}
                />
                <div className="ss-row-actions">
                  <button
                    type="button"
                    disabled={!i}
                    onClick={() => {
                      const next = [...photos]
                      ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
                      onChange({ ...c, photos: next })
                    }}
                  >
                    <Icon name="up" /> Move up
                  </button>
                  <button
                    type="button"
                    disabled={i === photos.length - 1}
                    onClick={() => {
                      const next = [...photos]
                      ;[next[i + 1], next[i]] = [next[i], next[i + 1]]
                      onChange({ ...c, photos: next })
                    }}
                  >
                    <Icon name="down" /> Move down
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...c,
                        photos: photos.filter((_, n) => n !== i),
                      })
                    }
                  >
                    <Icon name="trash" /> Remove
                  </button>
                </div>
              </div>
            ))}
            {upload}
          </section>
        </div>
      )
    }
    case 'contact': {
      const c = value.content as ContactContent
      return (
        <div className="ss-editor-fields">
          {text(c, 'email', 'Contact email', false, 'email', true)}
          {text(c, 'name', 'Display name', false, 'text', true)}
          {text(c, 'location', 'Location')}
          {text(c, 'heading', 'Contact heading')}
          {text(c, 'description', 'Invitation', true)}
        </div>
      )
    }
  }
}
