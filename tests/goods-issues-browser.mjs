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
const main = Number(process.env.SAW_TEST_ORDER_ID), stale = Number(process.env.SAW_TEST_STALE_ISSUE_ID)
assert.ok(main > 0 && stale > 0 && process.env.SAW_TEST_TOKEN && process.env.SAW_TEST_MANAGER_TOKEN)
const directory = process.env.SAW_TEST_EVIDENCE_DIRECTORY
const temp = await mkdtemp(path.join(tmpdir(), 'saw-issue-browser-'))
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
  await navigate(`/operation/goods-issues/create?orderId=${main}`)
  await until(() => evaluate(`!!document.querySelector('input[type="checkbox"]:not(:disabled)')`), 'whole-lot allocation')
  assert.equal(await evaluate(`document.querySelectorAll('input[type="number"]').length`),0)
  assert.match(await text(), /Chọn nguyên lô để xuất/)
  await fill('input[aria-label="Người nhận"]', 'Browser receiver'); await fill('textarea', 'Browser draft note')
  await evaluate(`(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Lưu nháp'); b.click(); b.click() })()`)
  await until(async () => (await text()).includes('Chi tiết phiếu xuất') && (await text()).includes('Browser draft note'), 'draft saved')
  assert.equal(requests.filter(r => r.method === 'POST' && new URL(r.url).pathname === '/api/operation/goods-issues').length, 1, 'double click is one create')
  const createdId = await evaluate('Number(location.pathname.split("/").at(-1))')
  await click('Chỉnh sửa phiếu nháp'); await until(() => evaluate(`!!document.querySelector('textarea')`), 'edit form')
  await fill('textarea', 'Browser revised note'); await click('Lưu thay đổi')
  await until(async () => (await text()).includes('Đã lưu thay đổi phiếu nháp.') && (await text()).includes('Browser revised note'), 'edited draft')
  await until(() => evaluate(`!![...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Xác nhận xuất kho')`), 'refreshed draft')
  await click('Xác nhận xuất kho'); await click('Quay lại kiểm tra')
  assert.match(await text(), /Browser revised note/)
  await click('Xác nhận xuất kho'); await click('Đồng ý xuất kho')
  await until(async () => (await text()).includes('Đã xác nhận xuất kho.') && !(await text()).includes('Chỉnh sửa phiếu nháp'), 'committed read only')
  await screenshot('goods-issue-committed.png')
  checks.push('create validated kg, double-click, edit persisted, cancel confirmation, confirm committed readonly')
  await authenticate('DISTRIBUTOR', process.env.SAW_TEST_BUYER_TOKEN)
  await navigate(`/distributor/orders/${main}`)
  await until(async () => (await text()).includes('Đã xuất kho'), 'buyer sees saved whole-lot issue')
  assert.equal((await text()).includes('Hủy đơn hàng'), false)
  await authenticate('OPERATION_STAFF', process.env.SAW_TEST_TOKEN)
  checks.push('one whole-lot issue; distributor saved status compatible without cancellation')
  await navigate('/operation/goods-issues')
  await until(async () => (await text()).includes('Quản lý phiếu xuất kho') && !(await text()).includes('Đang tải...'), 'list')
  const saved = await fetch(`${api.origin}/api/operation/goods-issues/${createdId}`, { headers: { Authorization: `Bearer ${process.env.SAW_TEST_TOKEN}` } }).then(r => r.json())
  await fill('input[placeholder="Mã phiếu, mã đơn hoặc mã lô"]', saved.data.summary.issueCode); await click('Áp dụng bộ lọc')
  await until(() => evaluate(`document.querySelectorAll('tbody tr').length===1`), 'server filter')
  assert.ok(requests.some(r => new URL(r.url).searchParams.get('search') === saved.data.summary.issueCode))
  await fill('select[aria-label="Số dòng mỗi trang"]', '50')
  await until(() => Promise.resolve(requests.some(r => new URL(r.url).searchParams.get('pageSize') === '50')), 'page size')
  checks.push('server list search/page size, saved committed state')
  await navigate(`/operation/goods-issues/${stale}`)
  await until(async () => (await text()).includes('Chỉnh sửa phiếu nháp'), 'stale draft initial')
  await click('Chỉnh sửa phiếu nháp'); await fill('textarea', 'Keep local input')
  const other = await fetch(`${api.origin}/api/operation/goods-issues/${stale}`, { headers: { Authorization: `Bearer ${process.env.SAW_TEST_TOKEN}` } }).then(r => r.json())
  const remote = await fetch(`${api.origin}/api/operation/goods-issues/${stale}/draft`, { method: 'PUT', headers: { Authorization: `Bearer ${process.env.SAW_TEST_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: crypto.randomUUID(), expectedSnapshot: other.data.snapshot, issuedDate: other.data.summary.issuedDate, receiverName: null, note: 'Concurrent staff edit', lines: other.data.lines.map(l => ({ reservationId: l.reservationId, weightInKg: l.weightInKg })) }) })
  assert.equal(remote.status, 200)
  await click('Lưu thay đổi')
  await until(async () => (await text()).includes('Phiếu đã được người khác thay đổi'), 'snapshot conflict')
  assert.equal(await evaluate('document.querySelector("textarea").value'), 'Keep local input')
  const count = requests.filter(r => r.method === 'PUT').length; await delay(400)
  assert.equal(requests.filter(r => r.method === 'PUT').length, count, 'no automatic retry')
  await screenshot('goods-issue-draft-conflict.png')
  await click('Tải lại phiếu')
  await until(async () => (await text()).includes('Concurrent staff edit') && !(await text()).includes('Phiếu đã được người khác thay đổi'), 'explicit refresh reads saved version')
  assert.equal(await evaluate('document.querySelectorAll("textarea").length'), 0)
  await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'mobile no document overflow')
  await screenshot('goods-issue-mobile.png'); await page('Emulation.clearDeviceMetricsOverride')
  checks.push('stale draft 409 retains local fields without retry, mobile viewport')
  await authenticate('WAREHOUSE_MANAGER', process.env.SAW_TEST_MANAGER_TOKEN)
  await navigate('/operation/goods-issues'); await until(() => evaluate(`location.pathname==='/403'`), 'manager role guard')
  checks.push('nonstaff UI blocked')
  assert.deepEqual(errors, [])
  if (directory) await writeFile(path.join(directory, 'goods-issue-browser.json'), JSON.stringify({ result: 'Passed', checks, createdId }, null, 2))
  console.log(JSON.stringify({ result: 'Passed', checks, createdId }))
  await call('Browser.close')
} finally {
  socket?.close(); edge?.kill(); await vite.close()
  const resolved = path.resolve(temp)
  assert.equal(path.dirname(resolved), path.resolve(tmpdir())); assert.ok(path.basename(resolved).startsWith('saw-issue-browser-'))
  await rm(resolved, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 })
}
