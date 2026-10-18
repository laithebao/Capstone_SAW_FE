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
const cases = JSON.parse(process.env.SAW_TEST_RESOLUTION_CASES || '[]')
assert.equal(cases.length, 3)
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
  const click = async label => { await until(() => evaluate(`!![...document.querySelectorAll('button')].findLast(b => b.textContent.trim() === ${JSON.stringify(label)} && !b.disabled)`), label); await evaluate(`[...document.querySelectorAll('button')].findLast(b => b.textContent.trim() === ${JSON.stringify(label)} && !b.disabled).click()`) }
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
  const switchTo = async (role, token, route) => { await authenticate(role, token); await navigate(route) }
  for (const c of cases) {
    await switchTo('OPERATION_STAFF', process.env.SAW_TEST_TOKEN, `/operation/picking-orders/${c.order}`)
    await until(async () => (await text()).includes('Báo hao hụt / Lập phiếu kiểm đếm'), 'staff linked adjustment CTAs')
    assert.ok((await text()).includes('Báo lô hỏng / Lập phiếu loại bỏ'))
    await navigate(`/operation/stock-adjustments/create?batchId=${c.batch}&kind=${c.kind}`)
    await until(() => evaluate(`!!document.querySelector('textarea[aria-label="Lý do điều chỉnh"]')`), 'existing adjustment form')
    assert.match(await text(), /Đơn liên quan/)
    if (c.kind === 'COUNT') await fill('input[aria-label="Lượng thực đếm"]', '80')
    await fill('textarea[aria-label="Lý do điều chỉnh"]', 'Browser verified ' + c.flow)
    await click(c.kind === 'COUNT' ? 'Gửi yêu cầu điều chỉnh' : 'Gửi yêu cầu loại bỏ')
    await click('Xác nhận gửi')
    await until(async () => (await text()).includes('Chi tiết phiếu điều chỉnh') && (await text()).includes('Chờ quản lý kho'), 'staff saved pending adjustment')
    const id = await evaluate('Number(location.pathname.split("/").at(-1))')
    await screenshot(c.flow + '-staff-pending.png')
    await switchTo('WAREHOUSE_MANAGER', process.env.SAW_TEST_MANAGER_TOKEN, managerRoute(id)); await ready()
    assert.equal((await text()).includes('Hủy đơn, giữ phiếu chờ xử lý'), false)
    await evaluate(`document.querySelector('button[aria-label="Thông báo"]').click()`)
    await until(async () => (await text()).includes('Có phiếu điều chỉnh tồn cần xử lý'), 'persistent inbox')
    assert.ok(await evaluate(`!!document.querySelector('#notification-inbox a[href="/warehouse-manager/stock-adjustments/${id}"]')`))
    assert.equal(await evaluate(`/SA-[A-F0-9]{32}|(?:ACCEPT|DECLINE)\\s*[·-]\\s*\\d+/.test(document.querySelector('#notification-inbox').innerText)`), false, 'inbox contains readable content instead of workflow identifiers')
    await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`)
    if (c.kind === 'COUNT') {
      await fill('input[aria-label="Giá đề xuất nguyên lô"]', '8500000')
      await fill('textarea[aria-label="Nội dung đề xuất"]', 'Còn nguyên phần lô 80 kg đủ điều kiện giao. Giá cả lô 8.500.000 đ.')
      await click('Gửi đề xuất'); await click('Xác nhận')
      await until(async () => (await text()).includes('Chờ khách phản hồi'), 'sent proposal')
      assert.equal((await text()).includes('Đề xuất phiên bản'), false)
      assert.equal((await text()).includes('Hủy đơn, giữ phiếu chờ xử lý'), false)
      await switchTo('DISTRIBUTOR', c.customerToken, `/distributor/orders/${c.order}`)
      await until(async () => (await text()).includes('Đề xuất điều chỉnh') && (await text()).includes('8.500.000'), 'own customer proposal')
      assert.equal((await text()).includes('Phiên bản 1'), false)
      assert.match(await text(), /100 kg.*80 kg/)
      assert.equal(await evaluate(`[...document.querySelectorAll('h3')].some(e => e.textContent.startsWith(${JSON.stringify('Lô ')} + ${JSON.stringify(c.batchCode)}))`), true, 'customer can identify exactly which batch changes')
      await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
      assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'))
      await screenshot(c.flow + '-customer-mobile.png'); await page('Emulation.clearDeviceMetricsOverride')
      await click(c.flow === 'decline' ? 'Từ chối và hủy đơn' : 'Đồng ý đề xuất')
      await fill('[role="dialog"] textarea', c.flow === 'decline' ? 'Không tiếp tục mua phần lô này.' : 'Đồng ý giá nguyên lô mới.')
      await click('Xác nhận phản hồi')
      await until(async () => !(await evaluate(`!!document.querySelector('[role="dialog"]')`)) && (await text()).includes(c.flow === 'decline' ? 'Đơn đã hủy' : 'Bạn đã đồng ý'), 'customer response persisted')
      await switchTo('WAREHOUSE_MANAGER', process.env.SAW_TEST_MANAGER_TOKEN, managerRoute(id)); await ready()
    }
    await click(c.kind === 'DISPOSAL' ? 'Duyệt loại bỏ và hủy đơn' : c.flow === 'accept' ? 'Duyệt điều chỉnh và tiếp tục đơn' : 'Duyệt điều chỉnh tồn sau hủy đơn')
    assert.ok((await text()).includes(c.orderCode), 'review confirmation identifies affected order')
    await click('Xác nhận quyết định')
    await until(async () => (await text()).includes('Đã duyệt') && (await text()).includes('Đã xử lý'), 'manager final review')
    await screenshot(c.flow + '-manager-final.png')
    if (c.kind === 'COUNT') {
      await navigate('/warehouse-manager/sale-offers')
      await until(() => evaluate(`[...document.querySelectorAll('tbody tr')].some(row => row.innerText.includes(${JSON.stringify(c.batchCode)}))`), 'sale offer after approval')
      const offer = await evaluate(`(() => { const row = [...document.querySelectorAll('tbody tr')].find(row => row.innerText.includes(${JSON.stringify(c.batchCode)})); return { text: row.innerText, price: row.querySelector('input')?.value } })()`)
      if (c.flow === 'decline') assert.equal(offer.price, '8500000', 'approved proposal price is already filled without re-entry')
      else assert.match(offer.text, /8\.500\.000/, 'sold lot shows its effective order price')
    }
    await switchTo('OPERATION_STAFF', process.env.SAW_TEST_TOKEN, `/operation/picking-orders/${c.order}`)
    if (c.flow === 'accept') {
      await until(async () => (await text()).includes('80 kg') && await evaluate(`!![...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Xác nhận'&&!b.disabled)`), 'new 80kg fulfillment target')
      await click('Xác nhận'); await click('Xác nhận')
      await until(async () => (await text()).includes('Đã soạn đủ'), 'whole remaining lot picked')
    } else {
      await until(async () => (await text()).includes('Đơn đã hủy'), 'staff cancelled status')
      assert.equal(await evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Xác nhận'&&!b.disabled)`), false)
    }
    await switchTo('DISTRIBUTOR', c.customerToken, `/distributor/orders/${c.order}`)
    await until(async () => (await text()).includes(c.flow === 'accept' ? 'Đã có hiệu lực' : 'Lý do hủy:'), 'customer sees durable final outcome')
    await screenshot(c.flow + '-customer-final.png')
    checks.push(c.flow + ': real Staff form → Manager → Distributor response when required → Manager final → Staff outcome')
  }
  // A client-side role claim cannot bypass the API role. Its 403 must open the real
  // Forbidden route, rather than a missing /forbidden page.
  await switchTo('OPERATION_STAFF', process.env.SAW_TEST_MANAGER_TOKEN, '/operation/stock-adjustments')
  await until(() => evaluate(`location.pathname === '/403'`), 'server 403 redirects to the registered Forbidden route')
  checks.push('tampered client role is denied by API; 403 uses the registered route')
  assert.deepEqual(errors, [])
  if (directory) await writeFile(path.join(directory, 'stock-adjustment-order-resolution-browser.json'), JSON.stringify({ result: 'Passed', checks }, null, 2))
  console.log(JSON.stringify({ result: 'Passed', checks }))
  await call('Browser.close')
} finally {
  socket?.close(); edge?.kill(); await vite.close()
  const resolved = path.resolve(temp)
  assert.equal(path.dirname(resolved), path.resolve(tmpdir())); assert.ok(path.basename(resolved).startsWith('saw-adjustment-browser-'))
  await rm(resolved, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 })
}
