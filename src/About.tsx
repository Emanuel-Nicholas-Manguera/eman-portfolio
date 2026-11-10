import type { AboutContent } from './cms/content'
import { safeLink } from './cms/content'
import './About.css'
export function About({ content }: { content: AboutContent }) {
  return (
    <section className="about-section" id="about" aria-labelledby="about-title">
      <p className="section-eyebrow">About</p>
      <h2 id="about-title">{content.heading}</h2>
      {content.description && (
        <p className="about-summary">{content.description}</p>
      )}
      <div className="about-columns">
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
    </section>
  )
}
