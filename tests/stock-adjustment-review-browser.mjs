// Real Edge/Vite/API/SQL fixture. No development warehouse data is used.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { createServer } from 'vite'

const api = new URL(process.env.SAW_TEST_API_URL || '')
assert.equal(api.hostname, '127.0.0.1')
const main = Number(process.env.SAW_TEST_COUNT_REQUEST_ID), stale = Number(process.env.SAW_TEST_STALE_REQUEST_ID), disposal = Number(process.env.SAW_TEST_DISPOSAL_REQUEST_ID), rejected = Number(process.env.SAW_TEST_REJECT_REQUEST_ID)
assert.ok(main > 0 && stale > 0 && disposal > 0 && process.env.SAW_TEST_TOKEN && process.env.SAW_TEST_MANAGER_TOKEN)
const directory = process.env.SAW_TEST_EVIDENCE_DIRECTORY
const temp = await mkdtemp(path.join(tmpdir(), 'saw-adjustment-browser-'))
const vite = await createServer({ define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api') }, server: { host: '127.0.0.1', port: 0, proxy: { '/api': { target: api.origin, changeOrigin: true } } } })
let edge, socket
try {
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  const listener = net.createServer()
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve))
  const port = listener.address().port
  await new Promise(resolve => listener.close(resolve))
  edge = spawn(process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(temp, 'profile')}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
  let version
  for (let i = 0; i < 100; i++) { try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break } catch { await delay(100) } }
  assert.ok(version)
  socket = new WebSocket(version.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
  let sequence = 0, bootstrap
  const pending = new Map(), handlers = new Map()
  const call = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params, sessionId })) })
  socket.onmessage = ({ data }) => { const m = JSON.parse(data); if (m.id) { const task = pending.get(m.id); pending.delete(m.id); if (m.error) task?.reject(new Error(m.error.message)); else task?.resolve(m.result) } else handlers.get(m.method)?.(m.params) }
  const { targetId } = await call('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await call('Target.attachToTarget', { targetId, flatten: true })
  const page = (method, params = {}) => call(method, params, sessionId)
  const evaluate = async expression => { const r = await page('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value }
  const text = () => evaluate('document.body?.innerText ?? ""')
  const until = async (check, label) => { for (let i = 0; i < 200; i++) { if (await check()) return; await delay(100) } throw new Error(`Timeout ${label}: ${(await text()).slice(0, 2200)}`) }
  const click = async label => { await until(() => evaluate(`!![...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(label)} && !b.disabled)`), label); await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(label)} && !b.disabled).click()`) }
  const fill = (selector, value) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) throw new Error('Missing input'); const p = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(p,'value').set.call(el,${JSON.stringify(value)}); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input',{bubbles:true})); })()`)
  const navigate = route => page('Page.navigate', { url: origin + route })
  const screenshot = async name => { if (directory) { await mkdir(directory, { recursive: true }); const layout = await page('Page.getLayoutMetrics'); const r = await page('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: layout.cssContentSize.width, height: layout.cssContentSize.height, scale: 1 } }); await writeFile(path.join(directory, name), Buffer.from(r.data, 'base64')) } }
  const authenticate = async (role, token) => {
    if (bootstrap) await page('Page.removeScriptToEvaluateOnNewDocument', { identifier: bootstrap })
    const session = { user: { id: 1, name: 'Issue browser', email: 'issue@test.invalid', role }, accessToken: token, refreshToken: 'unused', expiresAt: new Date(Date.now() + 3600000).toISOString(), refreshTokenExpiresAt: new Date(Date.now() + 7200000).toISOString() }
    bootstrap = (await page('Page.addScriptToEvaluateOnNewDocument', { source: `sessionStorage.setItem('saw.auth-session',${JSON.stringify(JSON.stringify(session))})` })).identifier
  }
  await page('Page.enable'); await page('Runtime.enable'); await page('Network.enable')
  const errors = [], requests = [], checks = []
  handlers.set('Runtime.exceptionThrown', e => errors.push(e.exceptionDetails.text))
  handlers.set('Network.requestWillBeSent', e => { if (e.request.url.includes('/api/')) requests.push(e.request) })
  const managerRoute = id => `/warehouse-manager/stock-adjustments/${id}`
  const ready = () => until(async () => (await text()).includes('Quyết định của quản lý kho'), 'review loaded')
  await authenticate('WAREHOUSE_MANAGER', process.env.SAW_TEST_MANAGER_TOKEN)
  await navigate('/warehouse-manager/stock-adjustments')
  await until(async () => (await text()).includes('Danh sách yêu cầu') && (await text()).includes('Xem chi tiết'), 'manager list')
  await fill('input[aria-label="Tìm phiếu điều chỉnh"]', 'unknown-review-browser')
  await click('Áp dụng bộ lọc'); await until(async () => (await text()).includes('Chưa có phiếu điều chỉnh phù hợp.'), 'manager server search')
  checks.push('real Manager server list/search/empty state')
  await navigate(managerRoute(main)); await ready()
  assert.match(await text(), /Tồn lúc lập/); assert.match(await text(), /Tồn hiện tại/)
  await fill('textarea[aria-label="Ghi chú quyết định"]', 'Manager count review')
  await click('Duyệt yêu cầu'); await until(async () => (await text()).includes('Duyệt kết quả kiểm đếm?'), 'count confirmation')
  await click('Quay lại')
  assert.equal(await evaluate('document.querySelector("textarea").value'), 'Manager count review')
  await click('Duyệt yêu cầu'); await click('Xác nhận quyết định')
  await until(async () => (await text()).includes('Kết quả xử lý'), 'count approved')
  assert.match(await text(), /Đã duyệt/); assert.match(await text(), /Manager count review/)
  assert.equal(await evaluate('document.querySelectorAll("textarea").length'), 0)
  await screenshot('review-count-approved.png'); checks.push('COUNT approved; snapshot/current shown, cancel retains note, finalized read only')
  await navigate(managerRoute(disposal)); await ready()
  assert.equal(await evaluate('document.querySelectorAll("tbody tr").length'), 3)
  await click('Duyệt yêu cầu'); await until(async () => (await text()).includes('Duyệt loại bỏ toàn bộ lô?'), 'disposal confirmation')
  const modal = await evaluate('document.querySelector("[role=dialog]").innerText')
  assert.match(modal, /100 kg tại 3 vị trí/)
  await click('Xác nhận quyết định'); await until(async () => (await text()).includes('Kết quả xử lý'), 'disposal approved')
  assert.match(await text(), /Đã loại bỏ/); await screenshot('review-disposal-approved.png')
  await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'))
  await screenshot('review-disposal-mobile.png'); await page('Emulation.clearDeviceMetricsOverride')
  checks.push('whole lot including zero location approved, real DISPOSED shown, mobile overflow check')
  await navigate(managerRoute(rejected)); await ready(); await click('Từ chối yêu cầu')
  assert.equal(await evaluate('[...document.querySelectorAll("[role=dialog] button")].find(b=>b.textContent==="Xác nhận quyết định").disabled'), true)
  await fill('textarea[aria-label="Lý do từ chối"]', '   ')
  assert.equal(await evaluate('[...document.querySelectorAll("[role=dialog] button")].find(b=>b.textContent==="Xác nhận quyết định").disabled'), true)
  await fill('textarea[aria-label="Lý do từ chối"]', 'Evidence requires review')
  await click('Xác nhận quyết định'); await until(async () => (await text()).includes('Kết quả xử lý'), 'rejected')
  assert.match(await text(), /Đã từ chối/); assert.match(await text(), /Evidence requires review/)
  checks.push('reject requires trimmed reason; real API persists rejected decision')
  await navigate(managerRoute(stale)); await ready()
  await fill('textarea[aria-label="Ghi chú quyết định"]', 'Keep manager local note')
  await click('Duyệt yêu cầu')
  const headers = { Authorization: `Bearer ${process.env.SAW_TEST_MANAGER_TOKEN}`, 'Content-Type': 'application/json' }
  const concurrent = (await (await fetch(new URL(`/api/warehouse-manager/stock-adjustments/${stale}`, api), { headers })).json()).data
  const response = await fetch(new URL(`/api/warehouse-manager/stock-adjustments/${stale}/review`, api), { method: 'POST', headers, body: JSON.stringify({ requestId: '55555555-5555-4555-8555-555555555555', decision: 'REJECT', reviewNote: 'Other Manager decision', expectedSnapshot: concurrent.reviewSnapshot }) })
  assert.equal(response.status, 200)
  await click('Xác nhận quyết định')
  await until(() => evaluate('!!document.querySelector("[role=alert]")'), '409 stale review')
  assert.equal(await evaluate('document.querySelector("textarea").value'), 'Keep manager local note')
  assert.equal(await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent==="Duyệt yêu cầu").disabled'), true)
  await screenshot('review-conflict-keeps-note.png'); await click('Tải lại số liệu')
  await until(async () => (await text()).includes('Kết quả xử lý'), 'explicit reload')
  assert.match(await text(), /Other Manager decision/)
  checks.push('form opened first rejects stale decision with 409, retains note, disables writes, explicit reload')
  await authenticate('OPERATION_STAFF', process.env.SAW_TEST_TOKEN)
  const savedDisposal = (await (await fetch(new URL(`/api/warehouse-manager/stock-adjustments/${disposal}`, api), { headers })).json()).data
  await navigate(`/operation/product-batches/${savedDisposal.request.summary.productBatchId}`)
  await until(async () => (await text()).includes('Lịch sử lô hàng') && (await text()).includes('Loại bỏ toàn lô'), 'UC29 saved disposal')
  assert.match(await text(), /Đã loại bỏ/)
  assert.ok(await evaluate(`document.querySelectorAll('section[aria-label="Lịch sử lô hàng"] ol li').length > 0`))
  await screenshot('review-uc29-disposal-history.png')
  checks.push('UC29 displays saved DISPOSED history and approved whole-lot adjustment')
  await navigate(`/operation/stock-adjustments/${main}`)
  await until(async () => (await text()).includes('Chi tiết phiếu điều chỉnh') && (await text()).includes('Manager count review'), 'staff sees processed result')
  assert.match(await text(), /Đã duyệt/)
  await navigate(managerRoute(main)); await until(() => evaluate(`location.pathname==='/403'`), 'staff Manager guard')
  checks.push('Staff sees saved Manager result but cannot enter Manager approval')
  assert.deepEqual(errors, [])
  assert.equal(requests.filter(r=>r.method==='POST' && new URL(r.url).pathname===`/api/warehouse-manager/stock-adjustments/${stale}/review`).length, 1, 'no automatic retry after conflict')
  if (directory) await writeFile(path.join(directory, 'stock-adjustment-review-browser.json'), JSON.stringify({ result: 'Passed', checks }, null, 2))
  console.log(JSON.stringify({ result: 'Passed', checks }))
  await call('Browser.close')
} finally {
  socket?.close(); edge?.kill(); await vite.close()
  const resolved = path.resolve(temp)
  assert.equal(path.dirname(resolved), path.resolve(tmpdir())); assert.ok(path.basename(resolved).startsWith('saw-adjustment-browser-'))
  await rm(resolved, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 })
}
