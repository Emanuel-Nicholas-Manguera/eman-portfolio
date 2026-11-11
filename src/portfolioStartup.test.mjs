import assert from 'node:assert/strict'
import test from 'node:test'
import { createPortfolioStartup } from './portfolioStartup.ts'

function fixture(reducedMotion = false) {
  let time = 0
  let nextId = 0
  let timedOut = false
  const tasks = new Map()
  const phases = []
  const startup = createPortfolioStartup({
    now: () => time,
    onPhase: phase => phases.push({ phase, at: time }),
    onTimeout: () => { timedOut = true },
    schedule: (fn, delay) => {
      const id = ++nextId
      tasks.set(id, { fn, at: time + delay })
      return id
    },
    cancel: id => tasks.delete(id),
    reducedMotion: () => reducedMotion,
  })
  return {
    startup, phases,
    get timedOut() { return timedOut },
    get pending() { return tasks.size },
    advance(ms) {
      const end = time + ms
      while (true) {
        const next = [...tasks].filter(([, task]) => task.at <= end).sort((a, b) => a[1].at - b[1].at)[0]
        if (!next) break
        const [id, task] = next
        tasks.delete(id)
        time = task.at
        task.fn()
      }
      time = end
    },
  }
}

test('cached or fast visits reveal without displaying a loader or adding a minimum delay', () => {
  for (const delay of [0, 200, 599]) {
    const f = fixture()
    f.advance(delay)
    f.startup.setReady(true)
    f.advance(15000)
    assert.deepEqual(f.phases, [{ phase: 'complete', at: delay }])
    assert.equal(f.timedOut, false)
    assert.equal(f.pending, 0)
  }
})
test('a slow visit shows after 600 ms and keeps the signature visible for 800 ms before fading', () => {
  const f = fixture()
  f.advance(600)
  f.startup.setReady(true)
  f.advance(799)
  assert.deepEqual(f.phases, [{ phase: 'loading', at: 600 }])
  f.advance(1)
  assert.equal(f.phases.at(-1).phase, 'revealing')
  f.advance(350)
  assert.deepEqual(f.phases.at(-1), { phase: 'complete', at: 1750 })
})
test('longer requests reveal as soon as ready, without another minimum wait', () => {
  const f = fixture()
  f.advance(3200)
  f.startup.setReady(true)
  assert.deepEqual(f.phases.at(-1), { phase: 'revealing', at: 3200 })
})
test('new portrait readiness cancels a pending reveal; updates after reveal never show the loader again', () => {
  const f = fixture()
  f.advance(700)
  f.startup.setReady(true)
  f.advance(200)
  f.startup.setReady(false)
  f.advance(1000)
  assert.equal(f.phases.at(-1).phase, 'loading')
  f.startup.setReady(true)
  f.advance(350)
  f.startup.setReady(false)
  f.advance(15000)
  assert.equal(f.phases.at(-1).phase, 'complete')
  assert.equal(f.phases.length, 3)
})
test('stalled requests stop blocking the page after 12 seconds', () => {
  const f = fixture()
  f.advance(12000)
  assert.equal(f.timedOut, true)
  assert.deepEqual(f.phases.at(-1), { phase: 'revealing', at: 12000 })
  f.advance(350)
  assert.equal(f.pending, 0)
})
test('reduced motion skips the fade and cleanup cancels every scheduled update', () => {
  const f = fixture(true)
  f.advance(2000)
  f.startup.setReady(true)
  f.advance(0)
  assert.deepEqual(f.phases.at(-1), { phase: 'complete', at: 2000 })
  const disposed = fixture()
  disposed.advance(700)
  disposed.startup.setReady(true)
  disposed.startup.dispose()
  disposed.advance(15000)
  assert.equal(disposed.phases.length, 1)
  assert.equal(disposed.pending, 0)
  assert.equal(disposed.timedOut, false)
})
