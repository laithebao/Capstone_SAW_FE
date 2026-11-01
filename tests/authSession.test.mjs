import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { AUTH_SESSION_KEY, authSessionIdentity, readAuthSession, refreshSharedAuthSession, writeAuthSession } from '../src/services/authSession.ts'

function storage() {
  const values = new Map()
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key), clear: () => values.clear() }
}
function session(id = 1, role = 'DISTRIBUTOR', revision = 1) {
  return { user: { id, role, name: `Account ${id}`, email: `account${id}@test.invalid` },
    accessToken: `access-${id}-${revision}`, refreshToken: `refresh-${id}-${revision}`,
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(), refreshTokenExpiresAt: new Date(Date.now() + 86400_000).toISOString() }
}
function deferred() {
  let resolve, reject
  const promise = new Promise((accept, fail) => { resolve = accept; reject = fail })
  return { promise, resolve, reject }
}

beforeEach(() => {
  globalThis.localStorage = storage()
  globalThis.sessionStorage = storage()
  let queue = Promise.resolve()
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: {
    request: (_key, callback) => {
      const result = queue.then(callback)
      queue = result.catch(() => {})
      return result
    },
  } } })
})

test('tabs share the latest login and logout instead of restoring their separate legacy sessions', () => {
  const first = session(), second = session(2, 'WAREHOUSE_MANAGER')
  sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(first))
  assert.equal(readAuthSession(), null)
  writeAuthSession(first)
  assert.equal(sessionStorage.getItem(AUTH_SESSION_KEY), null)
  globalThis.sessionStorage = storage() // Another tab, same localStorage.
  assert.deepEqual(readAuthSession(), first)
  writeAuthSession(second)
  assert.deepEqual(readAuthSession(), second)
  writeAuthSession(null)
  assert.equal(readAuthSession(), null)
})

test('malformed sessions and expired refresh tokens are not restored', () => {
  for (const raw of ['invalid', 'null', '{}', JSON.stringify({ ...session(), refreshTokenExpiresAt: 'invalid' }), JSON.stringify({ ...session(), refreshTokenExpiresAt: new Date(0).toISOString() })]) {
    localStorage.setItem(AUTH_SESSION_KEY, raw)
    assert.equal(readAuthSession(), null)
  }
})

test('two tabs refresh a rotating token once and both receive the resulting shared session', async () => {
  const current = session(), next = session(1, 'DISTRIBUTOR', 2)
  writeAuthSession(current)
  let calls = 0
  const refresh = async token => { calls++; assert.equal(token, current.refreshToken); return next }
  const results = await Promise.all([refreshSharedAuthSession(current, refresh), refreshSharedAuthSession(current, refresh)])
  assert.equal(calls, 1)
  assert.deepEqual(results, [next, next])
  assert.deepEqual(readAuthSession(), next)
})

test('logout while refresh is pending cannot restore the old login', async () => {
  const current = session(), pending = deferred(), started = deferred()
  writeAuthSession(current)
  const result = refreshSharedAuthSession(current, () => { started.resolve(); return pending.promise })
  await started.promise
  writeAuthSession(null)
  pending.resolve(session(1, 'DISTRIBUTOR', 2))
  assert.equal(await result, null)
  assert.equal(readAuthSession(), null)
})

test('a pending refresh cannot overwrite a different account, even when both accounts have the same role', async () => {
  const current = session(), other = session(2), pending = deferred(), started = deferred()
  writeAuthSession(current)
  const result = refreshSharedAuthSession(current, () => { started.resolve(); return pending.promise })
  await started.promise
  writeAuthSession(other)
  pending.resolve(session(1, 'DISTRIBUTOR', 2))
  assert.deepEqual(await result, other)
  assert.notEqual(authSessionIdentity(current), authSessionIdentity(other))
})

test('a failed refresh from an old login cannot sign out the new account', async () => {
  const current = session(), other = session(2, 'QC_STAFF'), pending = deferred(), started = deferred()
  writeAuthSession(current)
  const result = refreshSharedAuthSession(current, () => { started.resolve(); return pending.promise })
  await started.promise
  writeAuthSession(other)
  pending.reject(new Error('Old refresh token revoked'))
  assert.deepEqual(await result, other)
  assert.deepEqual(readAuthSession(), other)
})

test('a rejected refresh clears the shared session when it is still the current login', async () => {
  const current = session()
  writeAuthSession(current)
  assert.equal(await refreshSharedAuthSession(current, async () => { throw new Error('Revoked') }), null)
  assert.equal(localStorage.getItem(AUTH_SESSION_KEY), null)
})

test('LAN fallback coordinates refreshes without Web Locks and releases its lease', async () => {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} })
  const current = session(), next = session(1, 'DISTRIBUTOR', 2)
  writeAuthSession(current)
  let calls = 0
  const refresh = async () => { calls++; return next }
  const results = await Promise.all([refreshSharedAuthSession(current, refresh), refreshSharedAuthSession(current, refresh)])
  assert.equal(calls, 1)
  assert.deepEqual(results, [next, next])
  assert.equal(localStorage.getItem('saw.auth-refresh-lock'), null)
})
