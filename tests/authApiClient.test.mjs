import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { beforeEach, test } from 'node:test'
import axios, { AxiosError } from 'axios'

// Resolve Vite aliases in Node; replace only Vite's build-time environment expression.
registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier.startsWith('@/') ? new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href : specifier, context)
  },
  load(url, context, nextLoad) {
    const result = nextLoad(url, context)
    if (url.endsWith('/src/services/apiClient.ts')) return { ...result, source: String(result.source).replace('import.meta.env.VITE_API_BASE_URL', 'undefined') }
    return result
  },
})
const { apiClient, setApiSession } = await import('../src/services/apiClient.ts')
const { readAuthSession, writeAuthSession } = await import('../src/services/authSession.ts')

function storage() {
  const values = new Map()
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) }
}
function session(id = 1, revision = 1) {
  return { user: { id, role: 'DISTRIBUTOR', email: `account${id}@test.invalid`, name: 'Test' },
    accessToken: `access-${id}-${revision}`, refreshToken: `refresh-${id}-${revision}`,
    expiresAt: new Date(Date.now() + 1800_000).toISOString(), refreshTokenExpiresAt: new Date(Date.now() + 86400_000).toISOString() }
}
function response(config, data = {}) { return { config, status: 200, statusText: 'OK', headers: {}, data } }
function rejectStatus(config, status) {
  throw new AxiosError('HTTP error', undefined, config, undefined, { ...response(config), status })
}
function deferred() {
  let resolve
  const promise = new Promise(accept => { resolve = accept })
  return { promise, resolve }
}

beforeEach(() => {
  globalThis.localStorage = storage()
  globalThis.sessionStorage = storage()
  globalThis.window = { location: { href: '' } }
  const initial = session()
  writeAuthSession(initial)
  setApiSession(initial)
  apiClient.defaults.adapter = async config => response(config)
})

test('only successful business mutations announce a notification refresh', async () => {
  const events = []
  window.dispatchEvent = event => { events.push(event.type); return true }
  await apiClient.post('/operation/product-batches/12/confirm', {})
  assert.deepEqual(events, ['saw:notifications-changed'])
  await apiClient.get('/notifications')
  await apiClient.post('/notifications/read-all')
  await apiClient.post('/auth/refresh')
  assert.equal(events.length, 1)
  apiClient.defaults.adapter = async config => rejectStatus(config, 500)
  await assert.rejects(apiClient.post('/operation/product-batches/12/confirm', {}))
  assert.equal(events.length, 1)
})

test('requests read the shared rotated access token instead of retaining a tab-local token', async () => {
  const next = session(1, 2)
  writeAuthSession(next)
  const result = await apiClient.get('/distributor/orders')
  assert.equal(result.config.headers.get('Authorization'), `Bearer ${next.accessToken}`)
})

test('an old tab cannot submit a request as the different account just logged in elsewhere', async () => {
  writeAuthSession(session(2))
  let sent = false
  apiClient.defaults.adapter = async config => { sent = true; return response(config) }
  await assert.rejects(apiClient.post('/distributor/orders', {}), axios.isCancel)
  assert.equal(sent, false)
})

test('a response from the previous account is discarded after the current tab switches account', async () => {
  const started = deferred(), pending = deferred()
  apiClient.defaults.adapter = async config => { started.resolve(); await pending.promise; return response(config, { oldAccount: true }) }
  const result = apiClient.get('/distributor/orders')
  await started.promise
  const next = session(2)
  writeAuthSession(next); setApiSession(next)
  pending.resolve()
  await assert.rejects(result, axios.isCancel)
})

for (const status of [401, 403]) {
  test(`an old ${status} response cannot clear or redirect the newer shared session`, async () => {
    const started = deferred(), pending = deferred()
    apiClient.defaults.adapter = async config => { started.resolve(); await pending.promise; return rejectStatus(config, status) }
    const result = apiClient.get('/distributor/orders')
    await started.promise
    const next = session(2)
    writeAuthSession(next); setApiSession(next)
    pending.resolve()
    await assert.rejects(result)
    assert.deepEqual(readAuthSession(), next)
    assert.equal(window.location.href, '')
  })
}

test('401 for the current session still signs out, and ordinary 403 still shows permission denied', async () => {
  apiClient.defaults.adapter = async config => rejectStatus(config, 403)
  await assert.rejects(apiClient.get('/distributor/orders'))
  assert.equal(window.location.href, '/403')
  assert.notEqual(readAuthSession(), null)
  apiClient.defaults.adapter = async config => rejectStatus(config, 401)
  await assert.rejects(apiClient.get('/distributor/orders'))
  assert.equal(readAuthSession(), null)
  assert.equal(window.location.href, '/login')
})

test('login failures remain on the authentication form without clearing an existing session', async () => {
  apiClient.defaults.adapter = async config => rejectStatus(config, 403)
  await assert.rejects(apiClient.post('/auth/login', {}))
  assert.notEqual(readAuthSession(), null)
  assert.equal(window.location.href, '')
})

test('logout can revoke the captured token after local logout has already synchronized', async () => {
  const old = readAuthSession()
  writeAuthSession(null); setApiSession(null)
  const result = await apiClient.post('/auth/logout', { refreshToken: old.refreshToken }, { headers: { Authorization: `Bearer ${old.accessToken}` } })
  assert.equal(result.config.headers.get('Authorization'), `Bearer ${old.accessToken}`)
  assert.equal(readAuthSession(), null)
})
