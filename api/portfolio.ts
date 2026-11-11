import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { portfolioPage } from '../server/publicPortfolio.js'

const renderPage = portfolioPage(process.env)

export default {
  async fetch(request: Request) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } })
    }
    const template = await readFile(resolve(process.cwd(), 'dist-ssr/index.html'), 'utf8')
    const { html, cacheable } = await renderPage(template)
    return new Response(request.method === 'HEAD' ? null : html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': cacheable ? 'public, max-age=0, must-revalidate' : 'no-store',
        ...(cacheable && { 'Vercel-CDN-Cache-Control': 'public, s-maxage=30, stale-while-revalidate=30' }),
      },
    })
  },
}
