import {
  createPublicReader,
  portfolioSnapshotId,
  publishedPortraitUrl,
  readPublishedPortfolio,
} from '../src/cms/published.js'

export type PortfolioEnvironment = {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

export function portfolioPage(env: PortfolioEnvironment) {
  const client = createPublicReader(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY)

  return async (template: string) => {
    if (!client) return { html: template, cacheable: false }
    try {
      const snapshot = await readPublishedPortfolio(client, AbortSignal.timeout(4000))
      const portrait = publishedPortraitUrl(snapshot)
      const preload = portrait
        ? `<link rel="preload" as="image" href="${portrait}" fetchpriority="high">`
        : ''
      // A CMS value containing </script> must remain data inside the HTML.
      const json = JSON.stringify(snapshot).replaceAll('<', '\\u003c')
      const bootstrap = `<script id="${portfolioSnapshotId}" type="application/json">${json}</script>`
      return {
        html: template.replace('</head>', () => `${preload}${bootstrap}\n  </head>`),
        cacheable: true,
      }
    } catch {
      // If the server read fails, the browser can still retry the CMS directly.
      return { html: template, cacheable: false }
    }
  }
}
