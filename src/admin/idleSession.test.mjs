import assert from 'node:assert/strict'
import test from 'node:test'
import { createAuthController } from './authController.ts'
import { ADMIN_IDLE_TIMEOUT_MS, ADMIN_IDLE_WARNING_MS, createIdleSession, sessionIdFromToken } from './idleSession.ts'

const warningAt = ADMIN_IDLE_TIMEOUT_MS - ADMIN_IDLE_WARNING_MS
const firstSession = '00000000-0000-4000-8000-000000000001'
const secondSession = '00000000-0000-4000-8000-000000000002'
function fixture() {
  let time = 1_000_000
  let saved = null
  const storage = {
    now: () => time,
    read: () => saved,
    write: value => { saved = value },
  }
  return {
    idle: createIdleSession(storage),
    reload: () => createIdleSession(storage),
    advance: ms => { time += ms },
    stored: () => JSON.parse(saved),
  }
}

test('warns at 59 minutes and expires at exactly 60 minutes', () => {
  const f = fixture()
  assert.equal(ADMIN_IDLE_TIMEOUT_MS, 3_600_000)
  assert.deepEqual(f.idle.start(firstSession), { stage: 'active' })
  f.advance(warningAt - 1)
  assert.deepEqual(f.idle.status(), { stage: 'active' })
  f.advance(1)
  assert.deepEqual(f.idle.status(), { stage: 'warning', seconds: 60 })
  f.advance(59_001)
  assert.deepEqual(f.idle.status(), { stage: 'warning', seconds: 1 })
  f.advance(999)
  assert.deepEqual(f.idle.status(), { stage: 'expired' })
})

test('user activity and Stay signed in restart the full 60 minutes', () => {
  const f = fixture()
  f.idle.start(firstSession)
  f.advance(warningAt + 10_000)
  assert.equal(f.idle.touch().stage, 'active')
  f.advance(warningAt - 1)
  assert.equal(f.idle.status().stage, 'active')
  f.advance(1)
  assert.equal(f.idle.status().stage, 'warning')
})

test('focus checks and auth/token refreshes never count as activity', () => {
  const f = fixture()
  f.idle.start(firstSession)
  const original = f.stored().lastActivityAt
  for (let n = 0; n < 60; n++) {
    f.advance(60_000)
    f.idle.status()
    f.idle.start(firstSession)
  }
  assert.equal(f.stored().lastActivityAt, original)
  assert.equal(f.idle.status().stage, 'expired')
})

test('reload preserves the remaining warning and sleep cannot reset an expired timer', () => {
  const f = fixture()
  f.idle.start(firstSession)
  f.advance(ADMIN_IDLE_TIMEOUT_MS - 30_000)
  assert.deepEqual(f.reload().start(firstSession), { stage: 'warning', seconds: 30 })
  f.advance(31_000)
  assert.deepEqual(f.reload().start(firstSession), { stage: 'expired' })
  assert.equal(f.idle.status().stage, 'expired')
})

test('late input cannot revive an expired login; a fresh login gets a new timer', () => {
  const f = fixture()
  f.idle.start(firstSession)
  f.advance(ADMIN_IDLE_TIMEOUT_MS + 1)
  const original = f.stored().lastActivityAt
  assert.equal(f.idle.touch().stage, 'expired')
  assert.equal(f.stored().lastActivityAt, original)
  f.idle.stop()
  assert.equal(f.idle.start(firstSession).stage, 'expired')
  assert.equal(f.idle.start(secondSession).stage, 'active')
})

test('storage failures keep a functioning in-memory timer without exposing errors', () => {
  let time = 100
  const idle = createIdleSession({
    now: () => time,
    read: () => { throw new Error('Storage blocked') },
    write: () => { throw new Error('Storage blocked') },
  })
  assert.equal(idle.start(firstSession).stage, 'active')
  time += ADMIN_IDLE_TIMEOUT_MS
  assert.equal(idle.status().stage, 'expired')
})

test('a backwards clock change expires instead of extending a login indefinitely', () => {
  const f = fixture()
  f.idle.start(firstSession)
  f.advance(-1_000)
  assert.equal(f.idle.status().stage, 'expired')
})

test('session identifiers remain stable across renewed tokens and change for new logins', () => {
  const token = (id, exp) => `test.${Buffer.from(JSON.stringify({ session_id: id, exp })).toString('base64url')}.unsigned`
  assert.equal(sessionIdFromToken(token(firstSession, 10)), firstSession)
  assert.equal(sessionIdFromToken(token(firstSession, 20)), firstSession)
  assert.equal(sessionIdFromToken(token(secondSession, 30)), secondSession)
  for (const invalid of ['not-a-token', token('invalid-id', 10)]) {
    assert.throws(() => sessionIdFromToken(invalid), /^Error: Session identifier unavailable$/)
  }
})

test('an expired restored session is signed out before any dashboard view is emitted', async () => {
  const f = fixture()
  const ready = { stage: 'ready', email: 'owner@example.test', userId: 'owner', sessionId: firstSession }
  f.idle.start(firstSession)
  f.advance(ADMIN_IDLE_TIMEOUT_MS + 1)
  const restored = f.reload()
  const views = []
  let signOuts = 0
  const controller = createAuthController({
    inspect: async () => ready,
    prepare: async next => {
      if (restored.start(next.sessionId).stage === 'expired') {
        signOuts++
        return { stage: 'signedOut' }
      }
      return next
    },
    onView: view => views.push(view), onBusy: () => {}, onError: () => {},
  })
  await controller.refresh()
  assert.equal(signOuts, 1)
  assert.deepEqual(views.map(view => view.stage), ['checking', 'signedOut'])
  controller.dispose()
})

test('a late prepared result cannot reopen the workspace after sign-out', async () => {
  let finish
  const pending = new Promise(resolve => { finish = resolve })
  const views = []
  const ready = { stage: 'ready', email: 'owner@example.test', userId: 'owner', sessionId: firstSession }
  const controller = createAuthController({
    inspect: async () => ready, prepare: () => pending,
    onView: view => views.push(view), onBusy: () => {}, onError: () => {},
  })
  const check = controller.refresh()
  await Promise.resolve()
  controller.onAuthChange('SIGNED_OUT', null)
  finish(ready)
  await check
  assert.equal(views.at(-1).stage, 'signedOut')
  assert.equal(views.some(view => view.stage === 'ready'), false)
  controller.dispose()
})
