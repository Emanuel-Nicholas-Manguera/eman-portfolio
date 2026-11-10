import { useEffect, useState } from 'react'
import { publicSupabase } from './client'
import { resolvePortfolio } from './portfolio'
import type { PortfolioData } from './portfolio'
import type { Publication, PublicAsset } from './content'
import {
  introduction,
  contact,
  suit,
  graduation,
  experiences,
  projects,
} from './defaults'
const fallback: PortfolioData = {
  introduction: { ...introduction, suitSrc: suit, graduationSrc: graduation },
  contact,
  experiences,
  projects,
  about: null,
}
export function usePortfolio() {
  const [failed, setFailed] = useState(false)
  const [data, setData] = useState<PortfolioData | null>(
    publicSupabase ? null : fallback,
  )
  useEffect(() => {
    const client = publicSupabase
    if (!client) return
    let alive = true,
      running = false
    async function refresh() {
      if (running) return
      running = true
      try {
        const [docs, images] = await Promise.all([
          client!.from('cms_publications').select('*').order('sort_order'),
          client!
            .from('cms_publication_assets')
            .select('*')
            .order('sort_order'),
        ])
        if (docs.error || images.error) throw new Error('Unavailable')
        const assets = images.data as PublicAsset[]
        if (assets.length) {
          const paths = [...new Set(assets.map((a) => a.object_path))]
          const { data: urls, error } = await client!.storage
            .from('portfolio-media')
            .createSignedUrls(paths, 3600)
          if (error) throw error
          assets.forEach((a) => {
            a.url =
              urls?.find((u) => u.path === a.object_path)?.signedUrl ??
              undefined
          })
        }
        if (alive) {
          setData(resolvePortfolio(docs.data as Publication[], assets))
          setFailed(false)
        }
      } catch {
        if (alive) setFailed(true)
      } finally {
        running = false
      }
    }
    void refresh()
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh()
    }, 60000)
    const focus = () => {
      if (!document.hidden) void refresh()
    }
    window.addEventListener('focus', focus)
    document.addEventListener('visibilitychange', focus)
    const channel = new BroadcastChannel('portfolio-publications')
    channel.onmessage = () => void refresh()
    return () => {
      alive = false
      clearInterval(timer)
      channel.close()
      window.removeEventListener('focus', focus)
      document.removeEventListener('visibilitychange', focus)
    }
  }, [])
  return { data, failed }
}
