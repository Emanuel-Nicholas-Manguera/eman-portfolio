import { AdminIcon } from './AdminIcon'
import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import './PortfolioActivity.css'

const sections = [
  { key: 'experience', label: 'Experience' },
  { key: 'projects', label: 'Projects' },
  { key: 'contact', label: 'Contact' },
] as const
const dateLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const fullDateLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
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
  const [days, setDays] = useState(recentDays)
  const [result, setResult] = useState<{ days: string[]; rows: ActivityRow[]; failed: boolean } | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

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
        if (!request.signal.aborted) setResult({ days, rows: data, failed: false })
      } catch {
        if (!request.signal.aborted) setResult({ days, rows: [], failed: true })
      }
    })()
    return () => request.abort()
  }, [client, days])

  const refreshing = result?.days !== days
  const availableDays = result?.days ?? days
  const selectedDays = availableDays.slice(-range)
  const lastDay = selectedDays[selectedDays.length - 1]
  const rows = result?.rows.filter((row) => row.activity_day >= selectedDays[0]) ?? []
  const viewsByDay = new Map(rows.filter((row) => row.event_key === 'page_view').map((row) => [row.activity_day, row.total]))
  const views = selectedDays.map((day) => ({ day, total: viewsByDay.get(day) ?? 0 }))
  const viewTotal = views.reduce((sum, { total }) => sum + total, 0)
  const dailyView = views.find(({ day }) => day === selectedDay)
  const peak = Math.max(1, ...views.map(({ total }) => total))
  const tickStep = Math.ceil(peak / 4)
  const tickCount = Math.ceil(peak / tickStep)
  const chartMax = tickCount * tickStep
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => chartMax - index * tickStep)
  const clicks = sections.map((section) => ({
    ...section,
    total: rows.reduce((sum, row) => sum + (row.event_key === section.key ? row.total : 0), 0),
  })).sort((a, b) => b.total - a.total)
  const clickTotal = clicks.reduce((sum, { total }) => sum + total, 0)

  function selectRange(nextRange: 7 | 30) {
    setRange(nextRange)
    if (selectedDay && selectedDay < availableDays[availableDays.length - nextRange]) {
      setSelectedDay(null)
    }
  }

  return (
    <section className="ss-activity" aria-labelledby="portfolio-activity-heading">
      <div className="ss-activity-heading">
        <div>
          <h2 id="portfolio-activity-heading">Portfolio activity</h2>
          <p>{dayLabel(selectedDays[0])} – {dayLabel(lastDay)} · Philippine time</p>
        </div>
        <div className="ss-activity-controls">
          <div className="ss-activity-range" role="group" aria-label="Activity date range">
            <button type="button" aria-pressed={range === 7} onClick={() => selectRange(7)}>7 days</button>
            <button type="button" aria-pressed={range === 30} onClick={() => selectRange(30)}>30 days</button>
          </div>
          <button
            type="button"
            className="ss-activity-refresh"
            aria-label="Refresh portfolio activity"
            title="Refresh portfolio activity"
            aria-busy={refreshing}
            disabled={refreshing}
            onClick={() => setDays(recentDays())}
          >
            <AdminIcon name="refresh" />
          </button>
        </div>
      </div>
      {!result || result.failed ? (
        <p className="ss-activity-status" role="status">
          {refreshing ? 'Loading portfolio activity…' : 'Portfolio activity is unavailable right now.'}
        </p>
      ) : (
        <div className="ss-activity-grid">
          <div className="ss-activity-card">
            <div className="ss-activity-views-heading">
              <div>
                <h3>Page views</h3>
                <div role="status">
                  <p className="ss-activity-total">{numberLabel.format(dailyView?.total ?? viewTotal)}</p>
                  <p className="ss-activity-period">{dailyView
                    ? fullDateLabel.format(new Date(`${dailyView.day}T00:00:00Z`))
                    : `${range}-day total`}</p>
                </div>
              </div>
              {dailyView && <button type="button" className="ss-activity-show-total" onClick={() => setSelectedDay(null)}>Show total</button>}
            </div>
            <div className="ss-activity-plot">
              <div className="ss-activity-scale" aria-hidden="true">
                {ticks.map((tick) => <span key={tick}>{numberLabel.format(tick)}</span>)}
              </div>
              <div className="ss-activity-plot-scroll">
                <div style={{ minWidth: range * 24 }}>
                  <ul
                    className="ss-activity-chart"
                    aria-label="Page views by day"
                    style={{ backgroundSize: `100% ${100 / tickCount}%` }}
                  >
                    {views.map(({ day, total }) => {
                      const label = `${dayLabel(day)}, ${numberLabel.format(total)} ${total === 1 ? 'view' : 'views'}`
                      const isSelected = dailyView?.day === day
                      return (
                        <li key={day}>
                          <button
                            type="button"
                            className="ss-activity-bar"
                            aria-label={label}
                            aria-pressed={isSelected}
                            title={label}
                            onClick={() => setSelectedDay(isSelected ? null : day)}
                          >
                            <span aria-hidden="true" style={{ height: `${total / chartMax * 100}%` }} />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                  <div className="ss-activity-axis" aria-hidden="true">
                    <span>{dayLabel(selectedDays[0])}</span>
                    <span>{dayLabel(lastDay)}</span>
                  </div>
                </div>
              </div>
            </div>
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
