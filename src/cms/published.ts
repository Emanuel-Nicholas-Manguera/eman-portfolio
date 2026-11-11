import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { IntroductionContent, Publication, PublicAsset } from './content.js'

export type PublishedPortfolio = {
  publications: Publication[]
  assets: PublicAsset[]
}

export function createPublicReader(url?: string, key?: string) {
  // The public reader never loads, stores, or sends the admin session.
  return url && key?.startsWith('sb_publishable_')
    ? createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: 'portfolio-public-reader',
        },
      })
    : null
}

export async function readPublishedPortfolio(
  client: SupabaseClient,
  signal?: AbortSignal,
): Promise<PublishedPortfolio> {
  const query = client
    .from('cms_publications')
    .select('*, cms_publication_assets(asset_id, document_id, object_path, alt_text, caption, sort_order)')
    .order('sort_order')
    .order('document_id')
  if (signal) query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error

  const rows = data as (Publication & { cms_publication_assets: PublicAsset[] })[]
  const publications: Publication[] = []
  const assets: PublicAsset[] = []
  for (const { cms_publication_assets, ...publication } of rows) {
    publications.push(publication)
    assets.push(...cms_publication_assets)
  }
  return { publications, assets }
}

export const portfolioSnapshotId = 'portfolio-publications'

export function publishedImageUrl(path: string) {
  return `/api/portfolio-image?${new URLSearchParams({ path })}`
}

export function publishedPortraitUrl({ publications, assets }: PublishedPortfolio) {
  const intro = publications.find((publication) => publication.kind === 'introduction')
  const suitAssetId = (intro?.content as IntroductionContent | undefined)?.suitAssetId
  const portrait = assets.find((asset) => asset.document_id === intro?.document_id && asset.asset_id === suitAssetId)
  return portrait ? publishedImageUrl(portrait.object_path) : undefined
}
