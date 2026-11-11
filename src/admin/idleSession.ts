export const ADMIN_IDLE_TIMEOUT_MINUTES = 60
export const ADMIN_IDLE_TIMEOUT_MS = ADMIN_IDLE_TIMEOUT_MINUTES * 60_000
export const ADMIN_IDLE_WARNING_MS = 60_000
export const ADMIN_IDLE_STORAGE_KEY = 'portfolio-admin-idle-v1'

type Activity = { sessionId: string; lastActivityAt: number }
export type IdleStatus =
  | { stage: 'active' }
  | { stage: 'warning'; seconds: number }
  | { stage: 'expired' }
  | { stage: 'inactive' }

// This identifier only associates the local activity timer with a login. It
// grants no access; identity and owner/MFA permissions are checked by Auth/RPC.
export function sessionIdFromToken(token: string): string {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const { session_id: id } = JSON.parse(atob(payload))
    if (typeof id === 'string' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) return id
  } catch { /* Report no token contents or provider details. */ }
  throw new Error('Session identifier unavailable')
}

export function createIdleSession(options: {
  read: () => string | null
  write: (value: string) => void
  now?: () => number
}) {
  const now = options.now ?? Date.now
  let activity: Activity | null = null
  let expired = false

  function read(): Activity | null {
    try {
      const record = JSON.parse(options.read() ?? 'null')
      if (record && typeof record.sessionId === 'string'
        && Number.isFinite(record.lastActivityAt) && record.lastActivityAt >= 0) return record
    } catch { /* Storage can be blocked; keep an in-memory timer in that case. */ }
    return null
  }
  function write(record: Activity) {
    activity = record
    try { options.write(JSON.stringify(record)) } catch { /* Use the in-memory copy. */ }
  }
  function status(): IdleStatus {
    if (!activity) return { stage: 'inactive' }
    if (expired) return { stage: 'expired' }
    const saved = read()
    if (saved && saved.sessionId !== activity.sessionId) expired = true
    if (saved?.sessionId === activity.sessionId && saved.lastActivityAt > activity.lastActivityAt) activity = saved
    const remaining = ADMIN_IDLE_TIMEOUT_MS - (now() - activity.lastActivityAt)
    // A clock change must not turn a future timestamp into unlimited access.
    if (expired || remaining <= 0 || remaining > ADMIN_IDLE_TIMEOUT_MS) {
      expired = true
      return { stage: 'expired' }
    }
    return remaining <= ADMIN_IDLE_WARNING_MS
      ? { stage: 'warning', seconds: Math.ceil(remaining / 1000) }
      : { stage: 'active' }
  }
  function start(sessionId: string) {
    if (activity?.sessionId !== sessionId) {
      expired = false
      const saved = read()
      if (saved?.sessionId === sessionId) activity = saved
      else write({ sessionId, lastActivityAt: now() })
    }
    return status()
  }
  function touch() {
    const current = status()
    // A late click/focus must never revive an already expired login.
    if (!activity || current.stage === 'expired') return current
    write({ ...activity, lastActivityAt: now() })
    return status()
  }
  function stop() { activity = null; expired = false }
  return { start, status, touch, stop }
}
