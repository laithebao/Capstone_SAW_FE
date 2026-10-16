// Real Edge + Vite + isolated API/SQL. Invoked by PickingSqlTests; never writes to the development DB.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { createServer } from 'vite'

const api = new URL(process.env.SAW_TEST_API_URL || '')
assert.equal(api.hostname, '127.0.0.1', 'Only an isolated loopback test API is allowed')
const mainId = Number(process.env.SAW_TEST_ORDER_ID)
const waitingId = Number(process.env.SAW_TEST_WAITING_ORDER_ID)
const expiredId = Number(process.env.SAW_TEST_EXPIRED_ORDER_ID)
const staleId = Number(process.env.SAW_TEST_STALE_ORDER_ID)
const orderCode = process.env.SAW_TEST_ORDER_CODE
assert.ok(mainId > 0 && waitingId > 0 && expiredId > 0 && staleId > 0 && orderCode && process.env.SAW_TEST_TOKEN && process.env.SAW_TEST_MANAGER_TOKEN)
const temp = await mkdtemp(path.join(tmpdir(), 'saw-picking-browser-'))
const vite = await createServer({ define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api') },
  server: { host: '127.0.0.1', port: 0, proxy: { '/api': { target: api.origin, changeOrigin: true } } } })
let edge, socket
try {
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  const listener = net.createServer()
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve))
  const debugPort = listener.address().port
  await new Promise(resolve => listener.close(resolve))
  edge = spawn(process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${path.join(temp, 'profile')}`, 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' })
  let version
  for (let i = 0; i < 100; i++) {
    try { version = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json(); break } catch { await delay(100) }
  }
  assert.ok(version, 'Edge did not start')
  socket = new WebSocket(version.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
  let nextId = 0
  const pending = new Map(), handlers = new Map()
  const call = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++nextId
    pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params, sessionId }))
  })
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data)
    if (message.id) {
      const task = pending.get(message.id); pending.delete(message.id)
      if (message.error) task?.reject(new Error(message.error.message)); else task?.resolve(message.result)
    } else handlers.get(message.method)?.(message.params)
  }
  const { targetId } = await call('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await call('Target.attachToTarget', { targetId, flatten: true })
  const page = (method, params) => call(method, params, sessionId)
  const evaluate = async expression => {
    const result = await page('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text)
    return result.result.value
  }
  const until = async (test, name) => {
    for (let i = 0; i < 150; i++) { if (await test()) return; await delay(100) }
    const view = await evaluate('({path: location.pathname, text: document.body?.innerText?.slice(0, 1800) ?? ""})')
    throw new Error(`Timed out: ${name}; view=${JSON.stringify(view)}`)
  }
  const text = () => evaluate('document.body?.innerText ?? ""')
  const screenshot = async name => {
    const directory = process.env.SAW_TEST_EVIDENCE_DIRECTORY
    if (!directory) return
    await mkdir(directory, { recursive: true })
    const result = await page('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    await writeFile(path.join(directory, name), Buffer.from(result.data, 'base64'))
  }
  const navigate = value => page('Page.navigate', { url: `${origin}${value}` })
  const click = async value => {
    await until(() => evaluate(`!![...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(value)} && !b.disabled)`), `enabled button ${value}`)
    await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(value)} && !b.disabled).click()`)
  }
  const fill = (selector, value) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) throw new Error('Missing input');
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); })()`)
  await page('Page.enable'); await page('Runtime.enable'); await page('Network.enable')
  const errors = [], requests = [], checks = []
  handlers.set('Runtime.exceptionThrown', e => errors.push(e.exceptionDetails.text))
  handlers.set('Page.javascriptDialogOpening', () => { void page('Page.handleJavaScriptDialog', { accept: true }) })
  handlers.set('Network.requestWillBeSent', e => { if (e.request.url.includes('/api/')) requests.push(e.request) })
  let bootstrap
  const authenticate = async (role, token) => {
    if (bootstrap) await page('Page.removeScriptToEvaluateOnNewDocument', { identifier: bootstrap })
    const session = { user: { id: 1, name: 'Picking browser', email: 'picking@test.invalid', role }, accessToken: token,
      refreshToken: 'unused', expiresAt: new Date(Date.now() + 3600000).toISOString(), refreshTokenExpiresAt: new Date(Date.now() + 7200000).toISOString() }
    const added = await page('Page.addScriptToEvaluateOnNewDocument', { source: `sessionStorage.setItem('saw.auth-session', ${JSON.stringify(JSON.stringify(session))});` })
    bootstrap = added.identifier
  }
  await authenticate('OPERATION_STAFF', process.env.SAW_TEST_TOKEN)
  await navigate('/operation/picking-orders')
  await until(async () => (await text()).includes('ĐƠN HÀNG CHỜ SOẠN') && (await text()).includes(orderCode), 'real approved order list')
  assert.ok(await evaluate(`!!document.querySelector('a[href="/operation/picking-orders"]')`), 'staff navigation entry')
  await fill('input[aria-label="Tìm đơn chờ soạn"]', orderCode)
  await click('Áp dụng bộ lọc')
  await until(() => evaluate(`document.querySelectorAll('tbody tr').length === 1`), 'server search')
  assert.ok(requests.some(r => r.method === 'GET' && new URL(r.url).searchParams.get('search') === orderCode))
  await fill('select[aria-label="Số dòng mỗi trang"]', '50')
  await until(() => Promise.resolve(requests.some(r => r.method === 'GET' && new URL(r.url).searchParams.get('pageSize') === '50')), 'server page size')
  checks.push('server list/search/page size, staff menu')
  let failNext = true
  handlers.set('Fetch.requestPaused', e => {
    if (failNext) { failNext = false; void page('Fetch.failRequest', { requestId: e.requestId, errorReason: 'Failed' }) }
    else void page('Fetch.continueRequest', { requestId: e.requestId })
  })
  await page('Fetch.enable', { patterns: [{ urlPattern: '*/api/operation/picking-orders?*' }] })
  await click('Làm mới')
  await until(async () => (await text()).includes('Thử lại'), 'list network error')
  await click('Thử lại')
  await until(async () => (await text()).includes(orderCode) && !(await text()).includes('Thử lại'), 'list retry')
  await page('Fetch.disable')
  checks.push('loading error and retry')

  await navigate(`/operation/picking-orders/${waitingId}`)
  await until(async () => (await text()).includes('đang chờ phân bổ đủ hàng'), 'approved order waiting allocation')
  assert.equal(await evaluate(`document.querySelectorAll('input[type="number"]').length`), 0)
  await navigate(`/operation/picking-orders/${expiredId}`)
  await until(async () => (await text()).includes('Lô hàng đã hết hạn'), 'expiry blocks picking')
  assert.equal(await evaluate(`document.querySelectorAll('input[type="number"]').length`), 0)
  assert.equal((await text()).includes('Yêu cầu loại bỏ'), false)
  checks.push('waiting allocation and expired batch cannot pick, no disposal UI')

  await navigate(`/operation/picking-orders/${mainId}`)
  await until(() => evaluate(`!!document.querySelector('input[type="number"]:not(:disabled)')`), 'editable reservation')
  const reservationId = await evaluate(`Number(document.querySelector('input[type="number"]').getAttribute('aria-label').split(' ').at(-1))`)
  const amount = `input[aria-label="Lượng soạn lần này ${reservationId}"]`, note = `textarea[aria-label="Ghi chú soạn ${reservationId}"]`
  await fill(amount, '20'); await fill(note, 'Browser physical count')
  const beforePosts = requests.filter(r => r.url.includes('/confirm-picking')).length
  await click('Xác nhận soạn hàng')
  await until(() => evaluate(`!!document.querySelector('[role="dialog"]')`), 'confirmation dialog')
  await click('Quay lại')
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(amount)}).value`), '20')
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(note)}).value`), 'Browser physical count')
  assert.equal(requests.filter(r => r.url.includes('/confirm-picking')).length, beforePosts)
  await click('Xác nhận soạn hàng')
  await evaluate(`(() => { const b = [...document.querySelectorAll('[role="dialog"] button')].find(x => x.textContent.trim() === 'Xác nhận'); b.click(); b.click(); })()`)
  await until(async () => (await text()).includes('Đã xác nhận soạn hàng.') && (await text()).includes('Đang soạn một phần'), 'partial picking saved')
  assert.match(await text(), /Browser physical count/)
  assert.equal(requests.filter(r => r.url.includes('/confirm-picking')).length, beforePosts + 1)
  const sent = JSON.parse(requests.filter(r => r.url.includes('/confirm-picking')).at(-1).postData)
  const replay = await fetch(`${api.origin}/api/operation/picking-orders/${mainId}/confirm-picking`, {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.SAW_TEST_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(sent),
  })
  assert.equal(replay.status, 200, 'retry identical saved action')
  await fill(amount, '80'); await fill(note, 'Browser remaining count')
  await click('Xác nhận soạn hàng'); await click('Xác nhận')
  await until(async () => (await text()).includes('Đã soạn đủ') && (await text()).includes('Browser remaining count'), 'complete picking')
  await screenshot('picking-completed.png')
  assert.equal(await evaluate(`document.querySelectorAll('input[type="number"]').length`), 0)
  checks.push('confirmation cancel retains draft, partial/full picking, repeat request, completed readonly')
  await navigate('/operation/picking-orders')
  await until(async () => (await text()).includes('ĐƠN HÀNG CHỜ SOẠN') && !(await text()).includes('Đang tải đơn hàng...'), 'worklist after completed')
  assert.equal((await text()).includes(orderCode), false)

  await navigate(`/operation/picking-orders/${staleId}`)
  await until(() => evaluate(`!!document.querySelector('input[type="number"]:not(:disabled)')`), 'stale form ready')
  const staleReservation = await evaluate(`Number(document.querySelector('input[type="number"]').getAttribute('aria-label').split(' ').at(-1))`)
  const staleAmount = `input[aria-label="Lượng soạn lần này ${staleReservation}"]`, staleNote = `textarea[aria-label="Ghi chú soạn ${staleReservation}"]`
  await fill(staleAmount, '30'); await fill(staleNote, 'Keep this draft after conflict')
  const loaded = await fetch(`${api.origin}/api/operation/picking-orders/${staleId}`, { headers: { Authorization: `Bearer ${process.env.SAW_TEST_TOKEN}` } }).then(r => r.json())
  const l = loaded.data.lines[0], r = l.reservations[0]
  const concurrent = await fetch(`${api.origin}/api/operation/picking-orders/${staleId}/confirm-picking`, { method: 'POST',
    headers: { Authorization: `Bearer ${process.env.SAW_TEST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId: crypto.randomUUID(), reservationId: r.id, orderDetailId: l.id, inventoryId: r.inventoryId,
      productBatchId: r.productBatchId, quantityKg: 10, expectedPickedQuantityKg: r.pickedQuantityKg, note: 'Concurrent staff fixture action' }) })
  assert.equal(concurrent.status, 200)
  await click('Xác nhận soạn hàng'); await click('Xác nhận')
  await until(async () => (await text()).includes('Dữ liệu soạn hàng đã thay đổi'), 'server rejects stale form')
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(staleAmount)}).value`), '30')
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(staleNote)}).value`), 'Keep this draft after conflict')
  const postsAfterConflict = requests.filter(r => r.url.includes('/confirm-picking')).length
  await delay(500)
  assert.equal(requests.filter(r => r.url.includes('/confirm-picking')).length, postsAfterConflict, 'no automatic retry')
  await click('Tải lại dữ liệu')
  await until(() => evaluate(`document.querySelector(${JSON.stringify(staleAmount)})?.value === '' && !document.querySelector('[role="alert"]')`), 'explicit refresh')
  await until(async () => (await text()).includes('Concurrent staff fixture action'), 'refresh reads saved picking history')
  checks.push('stale snapshot HTTP409 keeps inputs, explicit refresh, no automatic write retry')
  await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'mobile detail fits viewport')
  await screenshot('picking-mobile.png')
  await page('Emulation.clearDeviceMetricsOverride')

  await authenticate('WAREHOUSE_MANAGER', process.env.SAW_TEST_MANAGER_TOKEN)
  await navigate('/operation/picking-orders')
  await until(() => evaluate(`location.pathname === '/403'`), 'manager cannot access staff UI')
  await navigate('/warehouse-manager/orders')
  await until(async () => (await text()).includes('Lịch sử xử lý đơn') && !(await text()).includes('Đang tải...'), 'manager history')
  const waiting = await fetch(`${api.origin}/api/warehouse-manager/orders/${waitingId}`, { headers: { Authorization: `Bearer ${process.env.SAW_TEST_MANAGER_TOKEN}` } }).then(x => x.json())
  const waitingCode = waiting.data.orderCode
  await until(() => evaluate(`!![...document.querySelectorAll('button')].find(x => x.textContent.trim() === ${JSON.stringify(waitingCode)})`), 'waiting allocation in manager history')
  await click(waitingCode)
  await click('Thử phân bổ hàng')
  await until(async () => (await text()).includes('Đơn chưa thể phân bổ đủ hàng'), 'manager allocation failure is visible')
  assert.ok((await text()).includes('Thử phân bổ hàng'), 'manager can review waiting order')
  await screenshot('picking-manager-waiting.png')
  checks.push('mobile detail, role guard, manager history shows reserved/picked and allocation retry retains approved')
  await authenticate('DISTRIBUTOR', process.env.SAW_TEST_BUYER_TOKEN)
  await navigate(`/distributor/orders/${mainId}`)
  await until(async () => (await text()).includes(orderCode) && (await text()).includes('Đã soạn đủ'), 'distributor observes saved picking state')
  assert.match(await text(), /Đã giữ hàng/)
  assert.match(await text(), /Đang soạn một phần/)
  assert.equal((await text()).includes('Hủy đơn hàng'), false)
  checks.push('distributor status/history labels and cancellation restriction remain compatible')
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ result: 'Passed', mode: 'Edge + Vite + isolated API/SQL with actual triggers', checks,
    writes: requests.filter(r => r.method === 'POST').map(r => ({ method: r.method, path: new URL(r.url).pathname })) }))
  await call('Browser.close')
} finally {
  socket?.close(); edge?.kill(); await vite.close()
  const resolved = path.resolve(temp)
  assert.equal(path.dirname(resolved), path.resolve(tmpdir()))
  assert.ok(path.basename(resolved).startsWith('saw-picking-browser-'))
  await rm(resolved, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 })
}
