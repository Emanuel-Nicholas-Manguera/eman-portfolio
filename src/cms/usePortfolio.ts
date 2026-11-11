import { useEffect, useState } from 'react'
import { publicSupabase } from './client'
import { resolvePortfolio } from './portfolio'
import type { PortfolioData } from './portfolio'
import {
  portfolioSnapshotId,
  publishedImageUrl,
  readPublishedPortfolio,
} from './published'
import type { PublishedPortfolio } from './published'
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

function readInitialSnapshot() {
  const snapshot = document.getElementById(portfolioSnapshotId)?.textContent
  if (!snapshot) return null
  try {
    const data = JSON.parse(snapshot) as PublishedPortfolio
    return Array.isArray(data.publications) && Array.isArray(data.assets) ? data : null
  } catch {
    return null
  }
}

function resolveWithPublishedImages({ publications, assets }: PublishedPortfolio) {
  return resolvePortfolio(
    publications,
    assets.map((asset) => ({ ...asset, url: publishedImageUrl(asset.object_path) })),
  )
}

export function usePortfolio() {
  const [initialSnapshot] = useState(readInitialSnapshot)
  const [failed, setFailed] = useState(false)
  const [data, setData] = useState<PortfolioData | null>(
    () => initialSnapshot
      ? resolveWithPublishedImages(initialSnapshot)
      : publicSupabase ? null : fallback,
  )
  useEffect(() => {
    const client = publicSupabase
    if (!client) return
    const reader = client
    let alive = true
    let running = false
    let refreshQueued = false

    async function refresh() {
      if (!alive || running) return
      running = true
      try {
        const snapshot = await readPublishedPortfolio(reader)
        const { publications, assets } = snapshot

        // Static builds without a portfolio server still use the original signed links.
        if (!initialSnapshot && assets.length) {
          const paths = [...new Set(assets.map((a) => a.object_path))]
          const { data: urls, error } = await reader.storage
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
          setData(
            initialSnapshot
              ? resolveWithPublishedImages(snapshot)
              : resolvePortfolio(publications, assets),
          )
          setFailed(false)
        }
      } catch {
        if (alive) setFailed(true)
      } finally {
        running = false
        if (refreshQueued) {
          refreshQueued = false
          void refresh()
        }
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
    channel.onmessage = () => {
      // A publish can finish while an older request is still in flight.
      if (running) refreshQueued = true
      else void refresh()
    }
    return () => {
      alive = false
      clearInterval(timer)
      channel.close()
      window.removeEventListener('focus', focus)
      document.removeEventListener('visibilitychange', focus)
    }
  }, [initialSnapshot])
  return { data, failed }
}
