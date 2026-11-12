import type { SupabaseClient } from '@supabase/supabase-js'
import { assetIds, validateContent } from '../cms/content'
import type { CmsDocument, CmsAsset, Publication, Kind } from '../cms/content'

const mediaBuckets = ['portfolio-media', 'portfolio-originals'] as const

export async function loadWorkspace(client: SupabaseClient) {
  const [docs, assets, publications] = await Promise.all([
    client.from('cms_documents').select('*').order('sort_order').order('id'),
    client
      .from('cms_assets')
      .select('*')
      .order('created_at', { ascending: false }),
    client.from('cms_publications').select('*').order('sort_order'),
  ])
  if (docs.error || assets.error || publications.error)
    throw new Error('We couldn’t load your workspace. Please try again.')
  const media = assets.data as CmsAsset[]
  await Promise.all(
    mediaBuckets.map(async (bucket) => {
      const group = media.filter(
        (a) => a.bucket_id === bucket && !a.deletion_pending &&
          (bucket === 'portfolio-media' || !a.archived_at),
      )
      if (!group.length) return
      const { data } = await client.storage.from(bucket).createSignedUrls(
        group.map((a) => a.object_path),
        900,
      )
      group.forEach((a) => {
        a.url =
          data?.find((d) => d.path === a.object_path)?.signedUrl ?? undefined
      })
    }),
  )
  return {
    documents: docs.data as CmsDocument[],
    assets: media,
    publications: publications.data as Publication[],
  }
}
export async function saveDocument(
  client: SupabaseClient,
  document: CmsDocument,
) {
  validateContent(document.kind, document.title, document.content, false)
  const { data, error } = await client.rpc('save_cms_document', {
    target_id: document.id,
    target_kind: document.kind,
    target_slug: document.slug,
    target_title: document.title.trim(),
    target_content: document.content,
    target_sort_order: document.sort_order,
    expected_updated_at: document.updated_at || null,
    target_assets: assetIds(document.content),
  })
  if (error)
    throw new Error(
      error.code === '40001'
        ? 'This content changed in another tab. Reopen it before saving.'
        : 'Couldn’t save. Check the fields and your connection, then try again.',
    )
  return (Array.isArray(data) ? data[0] : data) as CmsDocument
}
export async function publishDocument(
  client: SupabaseClient,
  id: string,
  unpublish = false,
) {
  const { error } = await client.rpc(
    unpublish ? 'unpublish_cms_document' : 'publish_cms_document',
    { target_document_id: id },
  )
  if (error)
    throw new Error(
      'Couldn’t update the published version. Check your connection and try again.',
    )
  // Notify other local tabs to refresh immediately; other visitors refresh periodically.
  const channel = new BroadcastChannel('portfolio-publications')
  channel.postMessage('refresh')
  channel.close()
}
export async function archiveDocument(
  client: SupabaseClient,
  id: string,
  restore = false,
) {
  const { error } = await client.rpc('archive_cms_document', {
    target_id: id,
    restore,
  })
  if (error)
    throw new Error(
      'Couldn’t archive or restore this content. A single-page section may already exist.',
    )
  const channel = new BroadcastChannel('portfolio-publications')
  channel.postMessage('refresh')
  channel.close()
}

export async function archiveImages(client: SupabaseClient, ids: string[], restore: boolean) {
  const { error } = await client.rpc('archive_cms_assets', { target_ids: ids, restore })
  if (error)
    throw new Error(error.code === '23503'
      ? 'Remove the images from draft and published content first.'
      : 'Couldn’t update the selected images. Refresh the library and try again.')
}

export async function deleteImages(client: SupabaseClient, ids: string[]) {
  const params = { target_ids: ids }
  const { data, error } = await client.rpc('prepare_cms_asset_deletion', params)
  if (error)
    throw new Error(error.code === '23503'
      ? 'Remove the images from draft and published content first.'
      : 'Couldn’t start deletion. Refresh the library and try again.')

  const files = (data ?? []) as Pick<CmsAsset, 'bucket_id' | 'object_path'>[]
  const removed = await Promise.allSettled(mediaBuckets.map(async (bucket) => {
    const paths = files.filter((file) => file.bucket_id === bucket).map((file) => file.object_path)
    if (!paths.length) return
    const { error } = await client.storage.from(bucket).remove(paths)
    if (error) throw error
  }))
  const retry = 'Some images are pending deletion. Select them and press Delete again to finish.'
  if (removed.some((result) => result.status === 'rejected')) throw new Error(retry)
  const completed = await client.rpc('complete_cms_asset_deletion', params)
  if (completed.error) throw new Error(retry)
}

const fileTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
export async function uploadImage(
  client: SupabaseClient,
  file: File,
  alt = '',
  suppliedId?: string,
) {
  if (
    !fileTypes.includes(file.type) ||
    !file.size ||
    file.size > 20 * 1024 * 1024
  )
    throw new Error(
      'Choose a JPEG, PNG, WebP, or AVIF image smaller than 20 MB.',
    )
  // Decode and re-encode the approved copy: strip metadata and preserve transparency.
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('This image could not be opened. Try a different file.')
  })
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    throw new Error('Image processing is unavailable in this browser.')
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const approved = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error('Couldn’t prepare this image.')),
      'image/webp',
      0.9,
    ),
  )
  if (approved.size > 10 * 1024 * 1024)
    throw new Error('The prepared image is too large. Choose a smaller image.')
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser()
  if (authError || !user)
    throw new Error('Please sign in again before uploading.')
  const id = suppliedId ?? crypto.randomUUID()
  const originalId = crypto.randomUUID()
  const originalPath = `${user.id}/${id}/original`
  const approvedPath = `${user.id}/${id}/display.webp`
  const originals = client.storage.from('portfolio-originals'),
    media = client.storage.from('portfolio-media')
  const uploaded = await originals.upload(originalPath, file, {
    contentType: file.type,
    upsert: false,
  })
  if (uploaded.error)
    throw new Error(
      'Original upload failed. Check your connection and try again.',
    )
  const converted = await media.upload(approvedPath, approved, {
    contentType: approved.type,
    upsert: false,
  })
  if (converted.error) {
    await originals.remove([originalPath])
    throw new Error('Image upload failed. Please try again.')
  }
  const { error } = await client.from('cms_assets').insert([
    {
      id: originalId,
      bucket_id: 'portfolio-originals',
      object_path: originalPath,
      original_filename: file.name,
      mime_type: file.type,
      byte_size: file.size,
      alt_text: alt,
    },
    {
      id,
      bucket_id: 'portfolio-media',
      object_path: approvedPath,
      original_filename: file.name,
      mime_type: approved.type,
      byte_size: approved.size,
      alt_text: alt,
      original_asset_id: originalId,
    },
  ])
  if (error) {
    await Promise.all([
      originals.remove([originalPath]),
      media.remove([approvedPath]),
    ])
    throw new Error('Couldn’t save image details. Please try uploading again.')
  }
  return id
}

export function newDocument(kind: Kind, order: number): CmsDocument {
  return {
    id: crypto.randomUUID(),
    kind,
    slug: `${kind}-${crypto.randomUUID().slice(0, 8)}`,
    title: '',
    content: {} as CmsDocument['content'],
    sort_order: order,
    updated_at: '',
    deleted_at: null,
  }
}
