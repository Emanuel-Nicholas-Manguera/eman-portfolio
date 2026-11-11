import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import './PortfolioActivity.css'

const sections = [
  { key: 'experience', label: 'Experience' },
  { key: 'projects', label: 'Projects' },
  { key: 'contact', label: 'Contact' },
] as const
const dateLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const numberLabel = new Intl.NumberFormat('en-US')
type ActivityRow = { activity_day: string; event_key: string; total: number }

function recentDays() {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  const midnight = Date.parse(`${today}T00:00:00Z`)
  return Array.from({ length: 30 }, (_, index) => (
    new Date(midnight - (29 - index) * 86_400_000).toISOString().slice(0, 10)
  ))
}

function dayLabel(day: string) {
  return dateLabel.format(new Date(`${day}T00:00:00Z`))
}

export function PortfolioActivity({ client }: { client: SupabaseClient }) {
  const [range, setRange] = useState<7 | 30>(7)
  const [days] = useState(recentDays)
  const [result, setResult] = useState<{ rows: ActivityRow[]; failed: boolean } | null>(null)

  useEffect(() => {
    const request = new AbortController()
    void (async () => {
      try {
        const { data, error } = await client
          .from('portfolio_activity_daily')
          .select('activity_day,event_key,total')
          .gte('activity_day', days[0])
          .lte('activity_day', days[days.length - 1])
          .abortSignal(request.signal)
        if (error) throw error
        if (!request.signal.aborted) setResult({ rows: data, failed: false })
      } catch {
        if (!request.signal.aborted) setResult({ rows: [], failed: true })
      }
    })()
    return () => request.abort()
  }, [client, days])

  const selectedDays = days.slice(-range)
  const lastDay = selectedDays[selectedDays.length - 1]
  const rows = result?.rows.filter((row) => row.activity_day >= selectedDays[0]) ?? []
  const viewsByDay = new Map(rows.filter((row) => row.event_key === 'page_view').map((row) => [row.activity_day, row.total]))
  const views = selectedDays.map((day) => ({ day, total: viewsByDay.get(day) ?? 0 }))
  const viewTotal = views.reduce((sum, { total }) => sum + total, 0)
  const peak = Math.max(1, ...views.map(({ total }) => total))
  const clicks = sections.map((section) => ({
    ...section,
    total: rows.reduce((sum, row) => sum + (row.event_key === section.key ? row.total : 0), 0),
  })).sort((a, b) => b.total - a.total)
  const clickTotal = clicks.reduce((sum, { total }) => sum + total, 0)

  return (
    <section className="ss-activity" aria-labelledby="portfolio-activity-heading">
      <div className="ss-activity-heading">
        <div>
          <h2 id="portfolio-activity-heading">Portfolio activity</h2>
          <p>{dayLabel(selectedDays[0])} – {dayLabel(lastDay)} · Philippine time</p>
        </div>
        <div className="ss-activity-range" role="group" aria-label="Activity date range">
          <button type="button" aria-pressed={range === 7} onClick={() => setRange(7)}>7 days</button>
          <button type="button" aria-pressed={range === 30} onClick={() => setRange(30)}>30 days</button>
        </div>
      </div>
      {!result || result.failed ? (
        <p className="ss-activity-status" role="status">
          {result?.failed ? 'Portfolio activity is unavailable right now.' : 'Loading portfolio activity…'}
        </p>
      ) : (
        <div className="ss-activity-grid">
          <div className="ss-activity-card">
            <h3>Page views</h3>
            <p className="ss-activity-total">{numberLabel.format(viewTotal)}</p>
            <ul className="ss-activity-chart" aria-label="Page views by day">
              {views.map(({ day, total }) => (
                <li key={day} aria-label={`${dayLabel(day)}: ${numberLabel.format(total)} page views`}>
                  <span title={`${dayLabel(day)}: ${numberLabel.format(total)}`} style={{ height: `${total / peak * 100}%` }} />
                </li>
              ))}
            </ul>
            <div className="ss-activity-axis" aria-hidden="true"><span>{dayLabel(selectedDays[0])}</span><span>{dayLabel(lastDay)}</span></div>
          </div>
          <div className="ss-activity-card">
            <h3>Section clicks</h3>
            <p className="ss-activity-total">{numberLabel.format(clickTotal)}</p>
            <ol className="ss-activity-ranking" aria-label="Sections ranked by clicks">
              {clicks.map(({ key, label, total }) => (
                <li key={key}>
                  <div><span>{label}</span><strong>{numberLabel.format(total)}</strong></div>
                  <div className="ss-activity-track" aria-hidden="true"><span style={{ width: `${clickTotal ? total / clickTotal * 100 : 0}%` }} /></div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </section>
  )
}
