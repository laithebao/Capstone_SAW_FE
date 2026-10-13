// Real Edge + real isolated API/SQL fixture. Invoked by DistributorOrderSqlTests with SAW_TEST_BROWSER=1.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { createServer } from 'vite'

const api = new URL(process.env.SAW_TEST_API_URL || '')
assert.equal(api.hostname, '127.0.0.1', 'Only the isolated loopback API is supported')
const batchCode = process.env.SAW_TEST_BATCH_CODE
assert.ok(batchCode && process.env.SAW_TEST_TOKEN)
const temp = await mkdtemp(path.join(tmpdir(), 'saw-distributor-browser-'))
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
  assert.ok(version, 'Edge failed to start')
  socket = new WebSocket(version.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
  let nextId = 0
  const pending = new Map(), handlers = new Map()
  const call = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++nextId; pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params, sessionId }))
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
    throw new Error(`Timed out: ${name}`)
  }
  const text = () => evaluate('document.body.innerText')
  const navigate = route => page('Page.navigate', { url: origin + route })
  const click = label => evaluate(`[...document.querySelectorAll('button,a')].find(e=>e.textContent.trim()===${JSON.stringify(label)}).click()`)
  const setValue = (selector, value) => until(() => evaluate(`(() => { const e=document.querySelector(${JSON.stringify(selector)}); if (!e) return false; Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e),'value').set.call(e,${JSON.stringify(String(value))}); e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true})); return true; })()`), `input available: ${selector}`)
  await page('Page.enable'); await page('Runtime.enable')
  const errors = []
  handlers.set('Runtime.exceptionThrown', e => errors.push(e.exceptionDetails.text))
  await page('Emulation.setDeviceMetricsOverride', { width: 1365, height: 900, deviceScaleFactor: 1, mobile: false })
  await navigate('/distributor/catalog')
  await until(() => evaluate('location.pathname === "/login"'), 'guest protection')
  const session = { user: { id: 1, name: 'Distributor test', email: 'distributor@test.invalid', role: 'DISTRIBUTOR' }, accessToken: process.env.SAW_TEST_TOKEN,
    refreshToken: 'isolated-unused', expiresAt: new Date(Date.now() + 3600000).toISOString(), refreshTokenExpiresAt: new Date(Date.now() + 7200000).toISOString() }
  await evaluate(`sessionStorage.setItem('saw.auth-session', ${JSON.stringify(JSON.stringify(session))})`)
  await navigate('/distributor/catalog')
  await until(() => evaluate(`!!document.querySelector('input[aria-label="Tìm lô hàng"]')`), 'catalog')
  await setValue('input[aria-label="Tìm lô hàng"]', batchCode)
  await click('Tìm kiếm')
  await until(async () => (await text()).includes(batchCode) && (await text()).includes('Chọn mua nguyên lô'), 'filtered whole lot')
  assert.ok((await text()).includes('1.500.000'))
  assert.equal(await evaluate('document.querySelectorAll("input[type=number]").length'), 0)
  await click('Xem chi tiết lô')
  await until(async () => (await text()).includes('Quy cách và điều kiện bảo quản'), 'lot detail')
  const lotDetailPath = await evaluate('location.pathname')
  assert.ok((await text()).includes('Kiểm định chất lượng'))
  assert.ok((await text()).includes('Tiêu chuẩn kiểm định áp dụng'))
  assert.ok((await text()).includes('Phiên bản'), 'actual QC standard version is displayed')
  assert.ok((await text()).includes('1.500.000'))
  await click('Chọn mua nguyên lô')
  await until(() => evaluate(`location.pathname === '/distributor/catalog' && !!document.querySelector('section[aria-label="Các lô đã chọn"]')`), 'selection survives detail navigation')
  await click('Tạo Purchase Order')
  await until(() => evaluate('location.pathname === "/distributor/orders/new" && !!document.querySelector("textarea")'), 'checkout')
  assert.ok((await text()).includes('1 lô'))
  assert.equal(await evaluate('document.querySelector("input[type=date]").required'), false)
  assert.equal(await evaluate('document.querySelector("input[type=date]").value'), '', 'requested receipt date starts empty')
  await setValue('textarea', '10 Đà Nẵng')
  await setValue('input[type=tel]', '090abc12x')
  assert.equal(await evaluate('document.querySelector("input[type=tel]").value'), '09012', 'letters are removed')
  await setValue('input[type=tel]', '090123456')
  assert.equal(await evaluate('document.querySelector("input[type=tel]").checkValidity()'), false, 'nine digits are rejected')
  await click('Gửi đơn chờ duyệt')
  assert.equal(await evaluate('location.pathname'), '/distributor/orders/new', 'short phone cannot submit')
  await setValue('input[type=tel]', '0901234567')
  await click('Gửi đơn chờ duyệt')
  await until(async () => (await text()).includes('Đã gửi đơn mua nguyên lô') && (await text()).includes('Hủy đơn hàng'), 'submitted pending')
  assert.ok((await text()).includes('Không yêu cầu ngày cụ thể'), 'order submitted without requested receipt date')
  const detailPath = await evaluate('location.pathname')
  assert.ok(/PO-\d{8}-\d{2,}/.test(await text()), 'daily readable order number')
  assert.equal(await evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent === 'Xác nhận đã nhận hàng')`), false)
  await navigate('/distributor')
  await until(async () => (await text()).includes('Đơn hàng gần đây') && !(await text()).includes('Đang tải'), 'dashboard loaded')
  const cardValue = label => evaluate(`[...document.querySelectorAll('a')].find(e=>e.querySelector('p')?.textContent===${JSON.stringify(label)})?.querySelectorAll('p')[1].textContent`)
  assert.equal(await cardValue('Đơn hàng chờ duyệt'), '1')
  assert.equal(await cardValue('Đơn đặt hàng thành công'), '0')
  await evaluate(`[...document.querySelectorAll('a')].find(e=>e.querySelector('p')?.textContent==='Đơn hàng chờ duyệt').click()`)
  await until(() => evaluate('location.search === "?status=PENDING" && !!document.querySelector("select")'), 'dashboard filter link')
  assert.equal(await evaluate('document.querySelector("select").value'), 'PENDING')
  await click('Đơn hàng của tôi')
  await until(async () => (await text()).includes('Xem đơn'), 'own list')
  await click('Xem đơn')
  await until(() => evaluate(`location.pathname === ${JSON.stringify(detailPath)} && [...document.querySelectorAll('button')].some(b=>b.textContent==='Hủy đơn hàng')`), 'own detail')
  await click('Hủy đơn hàng')
  await until(() => evaluate('!!document.querySelector("[role=dialog][aria-label=\"Xác nhận hủy đơn\"]")'), 'cancel confirmation dialog')
  assert.equal(await evaluate('!!document.querySelector("[role=dialog] textarea")'), false, 'cancellation needs no reason')
  await click('Xác nhận')
  await until(async () => (await text()).includes('Đã hủy đơn hàng.') && !(await evaluate('!!document.querySelector("[role=dialog]")')), 'cancelled')
  await navigate(detailPath)
  await until(async () => (await text()).includes('Đã hủy'), 'cancel persisted')
  assert.equal(await evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent==='Hủy đơn hàng')`), false)
  await click(batchCode)
  await until(async () => (await text()).includes('Quy cách và điều kiện bảo quản'), 'order line opens lot detail')
  assert.equal(await evaluate('location.pathname'), lotDetailPath)
  await page('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true })
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'mobile detail overflow')
  await navigate('/distributor')
  await until(async () => (await text()).includes('Đơn hàng gần đây') && !(await text()).includes('Đang tải'), 'dashboard after cancellation')
  assert.equal(await cardValue('Đơn hàng chờ duyệt'), '0')
  assert.equal(await cardValue('Đơn đã hủy'), '1')
  assert.ok((await cardValue('Số tiền đã chi tiêu')).startsWith('0'))
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'mobile dashboard overflow')
  await navigate('/distributor/catalog')
  await until(() => evaluate(`!!document.querySelector('input[aria-label="Tìm lô hàng"]')`), 'mobile catalog')
  await setValue('input[aria-label="Tìm lô hàng"]', 'NO-SUCH-LOT')
  await click('Tìm kiếm')
  await until(async () => (await text()).includes('Chưa có lô nguyên'), 'empty state')
  handlers.set('Fetch.requestPaused', e => { void page('Fetch.failRequest', { requestId: e.requestId, errorReason: 'InternetDisconnected' }) })
  await page('Fetch.enable', { patterns: [{ urlPattern: '*api/distributor/orders/catalog*' }] })
  await click('Làm mới')
  await until(() => evaluate('!!document.querySelector("[role=alert]")'), 'network error state')
  await page('Fetch.disable')
  await click('Thử lại')
  await until(async () => !(await evaluate('!!document.querySelector("[role=alert]")')) && (await text()).includes('Chưa có lô nguyên'), 'retry')
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'mobile catalog overflow')
  session.user.role = 'SUPPLIER'
  await evaluate(`sessionStorage.setItem('saw.auth-session', ${JSON.stringify(JSON.stringify(session))})`)
  await navigate('/distributor/catalog')
  await until(() => evaluate('location.pathname === "/403"'), 'role protection')
  assert.deepEqual(errors, [])
  console.log('PASS: whole-lot catalog -> checkout -> create -> own list/detail -> cancel; persisted state, mobile, empty/error/retry, guest/role guards.')
  await call('Browser.close')
} finally {
  socket?.close(); edge?.kill(); await vite.close()
  const resolved = path.resolve(temp)
  if (path.dirname(resolved) === path.resolve(tmpdir()) && path.basename(resolved).startsWith('saw-distributor-browser-'))
    await rm(resolved, { recursive: true, force: true, maxRetries: 15, retryDelay: 300 })
}
