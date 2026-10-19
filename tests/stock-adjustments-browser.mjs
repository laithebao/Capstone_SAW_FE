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
const main = Number(process.env.SAW_TEST_COUNT_BATCH_ID), stale = Number(process.env.SAW_TEST_STALE_BATCH_ID), disposal = Number(process.env.SAW_TEST_DISPOSAL_BATCH_ID)
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
  const screenshot = async name => { if (directory) { await mkdir(directory, { recursive: true }); const r = await page('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(path.join(directory, name), Buffer.from(r.data, 'base64')) } }
  const authenticate = async (role, token) => {
    if (bootstrap) await page('Page.removeScriptToEvaluateOnNewDocument', { identifier: bootstrap })
    const session = { user: { id: 1, name: 'Issue browser', email: 'issue@test.invalid', role }, accessToken: token, refreshToken: 'unused', expiresAt: new Date(Date.now() + 3600000).toISOString(), refreshTokenExpiresAt: new Date(Date.now() + 7200000).toISOString() }
    bootstrap = (await page('Page.addScriptToEvaluateOnNewDocument', { source: `sessionStorage.setItem('saw.auth-session',${JSON.stringify(JSON.stringify(session))})` })).identifier
  }
  await page('Page.enable'); await page('Runtime.enable'); await page('Network.enable')
  const errors = [], requests = [], checks = []
  handlers.set('Runtime.exceptionThrown', e => errors.push(e.exceptionDetails.text))
  handlers.set('Network.requestWillBeSent', e => { if (e.request.url.includes('/api/')) requests.push(e.request) })
  handlers.set('Page.javascriptDialogOpening', () => { void page('Page.handleJavaScriptDialog', { accept: true }) })
  await authenticate('OPERATION_STAFF', process.env.SAW_TEST_TOKEN)
  await navigate(`/operation/stock-adjustments/create?batchId=${main}`)
  await until(() => evaluate(`!!document.querySelector('textarea')`), 'single position automatically selected')
  assert.equal(await evaluate(`document.querySelectorAll('select[aria-label="Vị trí kiểm đếm"]').length`),0)
  await until(() => evaluate(`!!document.querySelector('input[aria-label="Lượng thực đếm"]')`), 'count form')
  await fill('input[aria-label="Lượng thực đếm"]', '95')
  await fill('textarea', 'Browser count discrepancy')
  await until(async () => (await text()).includes('Thực đếm thấp hơn lượng đang giữ cho đơn'), 'loss below reservation is reportable with a warning')
  await click('Gửi yêu cầu điều chỉnh'); await click('Quay lại')
  assert.equal(await evaluate(`document.querySelector('textarea').value`), 'Browser count discrepancy')
  if (process.env.SAW_TEST_IMAGE_PATH) {
    const { root } = await page('DOM.getDocument')
    const { nodeId } = await page('DOM.querySelector', { nodeId: root.nodeId, selector: 'input[type="file"]' })
    await page('DOM.setFileInputFiles', { nodeId, files: [process.env.SAW_TEST_IMAGE_PATH] })
    await until(() => evaluate(`!!document.querySelector('img[alt="Ảnh bằng chứng 1"]')`), 'evidence preview')
    await page('Network.setBlockedURLs', { urls: ['*/api/operation/stock-adjustments/images'] })
    await click('Gửi yêu cầu điều chỉnh'); await click('Xác nhận gửi')
    await until(async () => (await text()).includes('Chưa xác định') || (await text()).includes('Network') || (await text()).includes('kết nối'), 'upload failure')
    assert.equal(await evaluate(`document.querySelector('textarea').value`), 'Browser count discrepancy')
    assert.equal(requests.filter(r => r.method === 'POST' && new URL(r.url).pathname === '/api/operation/stock-adjustments').length, 0)
    await page('Network.setBlockedURLs', { urls: [] }); await click('Bỏ ảnh 1')
    checks.push('image preview/remove and failed upload retains form; no live storage asserted')
  }
  await click('Gửi yêu cầu điều chỉnh'); await click('Xác nhận gửi')
  await until(async () => (await text()).includes('Chi tiết phiếu điều chỉnh') && (await text()).includes('Browser count discrepancy'), 'count request saved')
  assert.match(await text(), /Chờ quản lý kho duyệt/)
  assert.match(await text(), /95/); assert.match(await text(), /-5/)
  const createdId = await evaluate('Number(location.pathname.split("/").at(-1))')
  await screenshot('stock-adjustment-count-detail.png')
  checks.push('count saves pending with difference, confirmation cancellation preserves input')
  await navigate(`/operation/stock-adjustments/create?batchId=${disposal}&kind=DISPOSAL`)
  await until(async () => (await text()).includes('Đề nghị loại bỏ toàn bộ lô'), 'disposal form')
  await fill('select[aria-label="Loại yêu cầu"]', 'COUNT')
  await until(() => evaluate(`document.querySelector('select[aria-label="Vị trí kiểm đếm"]')?.options.length === 4`), 'multiple inventory locations still require a selection')
  assert.equal(await evaluate(`document.querySelectorAll('textarea').length`), 0)
  await fill('select[aria-label="Loại yêu cầu"]', 'DISPOSAL')
  await until(async () => (await text()).includes('Đề nghị loại bỏ toàn bộ lô'), 'return to disposal clears position selection')
  assert.equal(await evaluate(`document.querySelectorAll('input[aria-label="Lượng thực đếm"]').length`), 0)
  assert.ok(await evaluate(`document.querySelectorAll('tbody tr').length >= 3`), 'all locations shown')
  await fill('textarea', 'Browser expired whole lot')
  await click('Gửi yêu cầu loại bỏ'); await click('Xác nhận gửi')
  await until(async () => (await text()).includes('Chi tiết phiếu điều chỉnh') && (await text()).includes('Browser expired whole lot'), 'disposal saved')
  assert.match(await text(), /tạm dừng bán/)
  await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'mobile no document overflow')
  await screenshot('stock-adjustment-disposal-mobile.png'); await page('Emulation.clearDeviceMetricsOverride')
  checks.push('expired multi-location disposal saved as one pending request, mobile detail')
  await navigate(`/operation/stock-adjustments/create?batchId=${stale}`)
  await until(() => evaluate(`!!document.querySelector('textarea')`), 'single stale position automatically selected')
  const staleScope=(await (await fetch(new URL(`/api/operation/stock-adjustments/batches/${stale}/scope?kind=COUNT`,api),{headers:{Authorization:`Bearer ${process.env.SAW_TEST_TOKEN}`}})).json()).data
  const staleStock=staleScope.stocks[0].inventoryId
  await until(() => evaluate(`!!document.querySelector('textarea')`), 'stale form')
  await fill('input[aria-label="Lượng thực đếm"]', '94'); await fill('textarea', 'Keep local discrepancy')
  const scope = (await (await fetch(new URL(`/api/operation/stock-adjustments/batches/${stale}/scope?kind=COUNT&inventoryId=${staleStock}`, api), { headers: { Authorization: `Bearer ${process.env.SAW_TEST_TOKEN}` } })).json()).data
  const duplicate = await fetch(new URL('/api/operation/stock-adjustments', api), { method: 'POST', headers: { Authorization: `Bearer ${process.env.SAW_TEST_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: '22222222-2222-4222-8222-222222222222', productBatchId: stale, requestKind: 'COUNT', inventoryId: Number(staleStock), actualQuantityKg: 96, adjustmentType: 'COUNTING_ERROR', reason: 'Other staff request', expectedSnapshot: scope.snapshot, imageIds: [] }) })
  assert.equal(duplicate.status, 200)
  await click('Gửi yêu cầu điều chỉnh'); await click('Xác nhận gửi')
  await until(async () => (await text()).includes('đang chờ duyệt'), 'conflict reason')
  assert.equal(await evaluate(`document.querySelector('textarea').value`), 'Keep local discrepancy')
  await click('Tải lại số liệu')
  await until(() => evaluate(`!!document.querySelector('fieldset:disabled textarea')`), 'locked after reload')
  assert.equal(await evaluate(`document.querySelector('textarea').value`), 'Keep local discrepancy', 'reload retains typed input')
  checks.push('conflict retains input, explicit reload locks form without auto retry')
  await navigate('/operation/stock-adjustments')
  await until(async () => (await text()).includes('Danh sách yêu cầu'), 'list')
  await fill('input[aria-label="Tìm phiếu điều chỉnh"]', 'does-not-exist-browser')
  await click('Áp dụng bộ lọc'); await until(async () => (await text()).includes('Chưa có phiếu điều chỉnh phù hợp.'), 'server search empty')
  checks.push('server search and list empty state')
  await authenticate('WAREHOUSE_MANAGER', process.env.SAW_TEST_MANAGER_TOKEN)
  await navigate('/operation/stock-adjustments'); await until(() => evaluate(`location.pathname==='/403'`), 'manager role guard')
  checks.push('staff route excludes manager; no approval UI')
  assert.deepEqual(errors, [])
  if (directory) await writeFile(path.join(directory, 'stock-adjustments-browser.json'), JSON.stringify({ result: 'Passed', checks, createdId }, null, 2))
  console.log(JSON.stringify({ result: 'Passed', checks, createdId }))
  await call('Browser.close')
} finally {
  socket?.close(); edge?.kill(); await vite.close()
  const resolved = path.resolve(temp)
  assert.equal(path.dirname(resolved), path.resolve(tmpdir())); assert.ok(path.basename(resolved).startsWith('saw-adjustment-browser-'))
  await rm(resolved, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 })
}
