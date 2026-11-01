import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { announceNotificationMutation, NOTIFICATIONS_CHANGED_EVENT, watchNotificationUpdates } from '../src/services/notificationEvents.ts'

let intervals, timers, nextId
beforeEach(() => {
  intervals = new Map(); timers = new Map(); nextId = 0
  globalThis.window = Object.assign(new EventTarget(), {
    setInterval: (callback, delay) => { const id = ++nextId; intervals.set(id, { callback, delay }); return id },
    clearInterval: id => intervals.delete(id),
    setTimeout: (callback, delay) => { const id = ++nextId; timers.set(id, { callback, delay }); return id },
    clearTimeout: id => timers.delete(id),
  })
  globalThis.document = Object.assign(new EventTarget(), { visibilityState: 'visible' })
})
function flushTimers() { const pending = [...timers.values()]; timers.clear(); pending.forEach(timer => timer.callback()) }

test('visible tabs check remote notifications every five seconds and refresh immediately on focus or visibility', () => {
  let refreshes = 0
  const stop = watchNotificationUpdates(() => refreshes++)
  const poll = [...intervals.values()][0]
  assert.equal(poll.delay, 5_000)
  poll.callback(); assert.equal(refreshes, 1)
  window.dispatchEvent(new Event('focus')); assert.equal(refreshes, 2)
  document.visibilityState = 'hidden'
  poll.callback(); window.dispatchEvent(new Event('focus')); assert.equal(refreshes, 2)
  document.visibilityState = 'visible'
  document.dispatchEvent(new Event('visibilitychange')); assert.equal(refreshes, 3)
  stop()
  window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange'))
  assert.equal(refreshes, 3); assert.equal(intervals.size, 0)
})

test('successful business writes refresh the bell; reads, authentication and read receipts do not', () => {
  let refreshes = 0
  const stop = watchNotificationUpdates(() => refreshes++)
  for (const method of ['POST', 'put', 'patch', 'delete']) announceNotificationMutation(method, '/operation/product-batches/12/confirm')
  assert.equal(timers.size, 1); assert.equal([...timers.values()][0].delay, 150)
  flushTimers(); assert.equal(refreshes, 1)
  announceNotificationMutation('get', '/notifications')
  announceNotificationMutation('post', '/notifications/read-all')
  announceNotificationMutation('post', '/auth/login')
  assert.equal(timers.size, 0); assert.equal(refreshes, 1)
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT))
  stop(); flushTimers(); assert.equal(refreshes, 1)
})
