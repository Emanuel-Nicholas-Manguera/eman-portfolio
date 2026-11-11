import type { SupabaseClient } from '@supabase/supabase-js'
import {
  introduction,
  contact,
  experiences,
  projects,
  suit,
  graduation,
} from '../cms/defaults'
import type { CmsDocument, Content, Kind } from '../cms/content'
import { saveDocument, publishDocument, uploadImage } from './cms'

// Existing slugs and uploaded filenames make reruns safe without replacing edits.
export async function importPortfolio(
  client: SupabaseClient,
  progress: (text: string) => void,
) {
  const { data: existing, error } = await client
    .from('cms_documents')
    .select('id,kind,slug')
  if (error)
    throw new Error('Couldn’t check existing content. Please try again.')
  const known = new Set(existing.map((d) => `${d.kind}/${d.slug}`))
  async function image(url: string, name: string, alt: string) {
    const { data, error } = await client
      .from('cms_assets')
      .select('id')
      .eq('bucket_id', 'portfolio-media')
      .eq('original_filename', name)
      .is('archived_at', null)
      .limit(1)
    if (error) throw new Error('Couldn’t check imported images.')
    if (data?.[0]) return data[0].id as string
    const response = await fetch(url)
    if (!response.ok) throw new Error('Couldn’t read a portfolio image.')
    const blob = await response.blob()
    return uploadImage(
      client,
      new File([blob], name, { type: blob.type || 'image/png' }),
      alt,
    )
  }
  async function add(
    kind: Kind,
    slug: string,
    title: string,
    content: Content,
    order: number,
  ) {
    if (known.has(`${kind}/${slug}`)) return
    const saved = await saveDocument(client, {
      id: crypto.randomUUID(),
      kind,
      slug,
      title,
      content,
      sort_order: order,
      updated_at: '',
      deleted_at: null,
    } as CmsDocument)
    await publishDocument(client, saved.id)
    known.add(`${kind}/${slug}`)
  }
  progress('Importing your introduction and portraits…')
  if (!known.has('introduction/introduction'))
    await add(
      'introduction',
      'introduction',
      introduction.name,
      {
        ...introduction,
        suitAssetId: await image(
          suit,
          'emanuel-suit.png',
          'Emanuel Nicholas in a suit',
        ),
        graduationAssetId: await image(
          graduation,
          'emanuel-graduation.png',
          'Emanuel Nicholas in graduation attire',
        ),
      },
      0,
    )
  progress('Importing your experience…')
  for (const [i, experience] of experiences.entries())
    await add('experience', experience.id, experience.company, experience, i)
  for (const [i, project] of projects.entries()) {
    progress(`Importing ${project.name}…`)
    if (known.has(`project/${project.id}`)) continue
    const photos = []
    for (const [index, p] of project.photos.entries())
      photos.push({
        label: p.label,
        note: p.note,
        ...(p.src
          ? {
              assetId: await image(
                p.src,
                `${project.id}-${index}.png`,
                p.label,
              ),
            }
          : { illustration: p.illustration }),
      })
    await add('project', project.id, project.name, { ...project, photos }, i)
  }
  progress('Importing contact and social links…')
  await add('contact', 'contact', 'Contact', contact, 0)
}
