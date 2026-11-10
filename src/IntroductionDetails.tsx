import type { AboutContent } from './cms/content'
import { safeLink } from './cms/content'
import './IntroductionDetails.css'
export function IntroductionDetails({ content }: { content: AboutContent }) {
  if (!content.description.trim() && !content.education.length && !content.recognitions.length && !content.certificates.length) return null
  return (
    <details className="intro-background">
      <summary>{content.heading || 'More about me'}<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></summary>
      <div className="intro-background-content">
      {content.description && (
        <p className="intro-background-summary">{content.description}</p>
      )}
      <div className="intro-background-columns">
        {(
          [
            ['Education', content.education],
            ['Recognitions', content.recognitions],
            ['Certificates', content.certificates],
          ] as const
        )
          .filter(([, rows]) => rows.length)
          .map(([label, rows]) => (
            <div key={label}>
              <h3>{label}</h3>
              {rows.map((row, i) => (
                <article key={i}>
                  <h4>{row.title}</h4>
                  <p>{row.detail}</p>
                  {'url' in row && row.url && safeLink(row.url) && (
                    <a
                      href={safeLink(row.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View certificate ↗
                    </a>
                  )}
                </article>
              ))}
            </div>
          ))}
      </div>
      </div>
    </details>
  )
}
