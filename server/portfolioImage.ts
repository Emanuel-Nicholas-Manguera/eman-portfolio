import type { PortfolioEnvironment } from './publicPortfolio.js'

const approvedImageTypes = new Set(['image/webp', 'image/png', 'image/jpeg', 'image/avif'])

function imageError(status: number) {
  return new Response(null, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

export function portfolioImage(env: PortfolioEnvironment) {
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY

  return async (request: Request) => {
    if (!url || !key?.startsWith('sb_publishable_')) return imageError(503)
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } })
    }
    const path = new URL(request.url).searchParams.get('path')
    if (!path || path.length > 1024) return imageError(400)
    const segments = path.split('/')
    if (segments.some((segment) => !segment || segment === '.' || segment === '..' || segment.includes('\\'))) {
      return imageError(400)
    }

    try {
      // The anonymous Storage policy only allows copies attached to a publication.
      const object = segments.map(encodeURIComponent).join('/')
      const validator = request.headers.get('if-none-match')
      const upstream = await fetch(new URL(`/storage/v1/object/authenticated/portfolio-media/${object}`, url), {
        method: request.method,
        headers: { apikey: key, ...(validator && { 'If-None-Match': validator }) },
        signal: AbortSignal.timeout(10000),
      })
      const type = upstream.headers.get('content-type')?.split(';')[0]
      const etag = upstream.headers.get('etag')
      const headers = new Headers({
        'Cache-Control': 'public, max-age=60',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=60',
        'X-Content-Type-Options': 'nosniff',
      })
      if (etag) headers.set('ETag', etag)
      if (upstream.status === 304) return new Response(null, { status: 304, headers })
      if (!upstream.ok || !type || !approvedImageTypes.has(type)) {
        await upstream.body?.cancel()
        return imageError(upstream.status >= 500 ? 502 : 404)
      }
      headers.set('Content-Type', type)
      return new Response(upstream.body, { headers })
    } catch {
      return imageError(502)
    }
  }
}
