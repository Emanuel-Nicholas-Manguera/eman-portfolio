import type {
  CmsDocument,
  CmsAsset,
  Content,
  PhotoContent,
  IntroductionContent,
  ExperienceContent,
  ProjectContent,
  AboutContent,
  ContactContent,
} from '../cms/content'

type Props = {
  value: CmsDocument
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
}: {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  type?: string
  required?: boolean
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
        />
      ) : (
        <input
          value={value}
          type={type}
          onChange={(e) => onChange(e.target.value)}
          required={required}
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
  links = false,
}: {
  label: string
  rows: { title: string; detail: string; url?: string }[]
  onChange: (rows: { title: string; detail: string; url?: string }[]) => void
  links?: boolean
}) {
  return (
    <section className="ss-repeater">
      <div className="ss-section-heading">
        <h2>{label}</h2>
        <button
          type="button"
          onClick={() => onChange([...rows, { title: '', detail: '' }])}
        >
          + Add
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
          {links && (
            <Field
              label="Certificate link"
              type="url"
              value={row.url ?? ''}
              onChange={(url) =>
                onChange(rows.map((r, n) => (n === i ? { ...r, url } : r)))
              }
            />
          )}
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
              ↑ Move up
            </button>
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, n) => n !== i))}
            >
              Remove
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
            .filter((a) => a.bucket_id === 'portfolio-media' && !a.archived_at)
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
export function DocumentFields({ value, assets, onChange, onUpload }: Props) {
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
      + Upload images
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
            {text(c, 'graduateRole', 'Graduate role')}
            {text(c, 'graduateDescription', 'Education introduction', true)}
            {text(c, 'actionLabel', 'Projects button label')}
            {text(c, 'scrollLabel', 'Scroll invitation')}
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
            <List
              label="Project work"
              value={c.projects}
              onChange={(projects) => onChange({ ...c, projects })}
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
                + Add photo
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
                    ↑ Move up
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
                    ↓ Move down
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
                    Remove
                  </button>
                </div>
              </div>
            ))}
            {upload}
          </section>
        </div>
      )
    }
    case 'about': {
      const c = value.content as AboutContent
      return (
        <>
          <div className="ss-editor-fields">
            {text(c, 'heading', 'Heading', false, 'text', true)}
            {text(c, 'description', 'About you', true)}
          </div>
          <Repeater
            label="Education"
            rows={c.education}
            onChange={(education) => onChange({ ...c, education })}
          />
          <Repeater
            label="Recognitions"
            rows={c.recognitions}
            onChange={(recognitions) => onChange({ ...c, recognitions })}
          />
          <Repeater
            label="Certificates"
            rows={c.certificates}
            links
            onChange={(certificates) => onChange({ ...c, certificates })}
          />
        </>
      )
    }
    case 'contact': {
      const c = value.content as ContactContent
      return (
        <div className="ss-editor-fields ss-section-editor">
          {text(c, 'name', 'Display name', false, 'text', true)}
          {text(c, 'location', 'Location')}
          {text(c, 'heading', 'Contact heading')}
          {text(c, 'description', 'Invitation', true)}
          {text(c, 'email', 'Email', false, 'email', true)}
          {text(c, 'github', 'GitHub URL', false, 'url')}
          {text(c, 'linkedin', 'LinkedIn URL', false, 'url')}
          {text(c, 'facebook', 'Facebook URL', false, 'url')}
          {text(c, 'githubCaption', 'GitHub click caption')}
          {text(c, 'linkedinCaption', 'LinkedIn click caption')}
          {text(c, 'gmailCaption', 'Gmail click caption')}
        </div>
      )
    }
  }
}
