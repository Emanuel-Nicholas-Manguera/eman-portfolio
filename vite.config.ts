import react from '@vitejs/plugin-react'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Readable } from 'node:stream'
import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import { portfolioImage } from './server/portfolioImage.ts'
import { portfolioPage } from './server/publicPortfolio.ts'

function localPortfolio(env: Record<string, string>) {
  const renderPage = portfolioPage(env)
  const serveImage = portfolioImage(env)

  return {
    name: 'local-portfolio',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/portfolio-image', async (req, res, next) => {
        try {
          const headers = new Headers()
          if (req.headers['if-none-match']) headers.set('If-None-Match', req.headers['if-none-match'])
          const request = new Request(new URL(req.url ?? '/', 'http://localhost'), {
            method: req.method,
            headers,
          })
          const image = await serveImage(request)
          res.writeHead(image.status, Object.fromEntries(image.headers))
          if (image.body) {
            Readable.fromWeb(image.body).on('error', (error) => res.destroy(error)).pipe(res)
          } else {
            res.end()
          }
        } catch (error) {
          next(error)
        }
      })
    },
    async transformIndexHtml(html, context) {
      const path = new URL(context.originalUrl ?? context.path, 'http://localhost').pathname
      if (context.server && /^\/(?:index\.html|introduction\/?)?$/.test(path)) {
        return (await renderPage(html)).html
      }
    },
  } satisfies Plugin
}

function portfolioTemplate(): Plugin {
  return {
    name: 'portfolio-template',
    apply: 'build',
    async writeBundle(_options, bundle) {
      // Vercel extracts dist/ as static output before packaging the functions.
      const page = bundle['index.html']
      if (page?.type !== 'asset') return
      const directory = resolve('dist-ssr')
      await mkdir(directory, { recursive: true })
      await writeFile(resolve(directory, 'index.html'), page.source)
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), localPortfolio(loadEnv(mode, process.cwd(), 'VITE_SUPABASE_')), portfolioTemplate()],
}))
