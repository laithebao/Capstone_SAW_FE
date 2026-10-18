// FE checks with explicitly mocked API responses. No backend or warehouse data is changed.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { createServer } from 'vite'

const evidence = path.resolve(process.env.SAW_TEST_EVIDENCE_DIRECTORY || '../Capstone_SAW_BE/test-results/warehouse-operations-ui')
const temp = await mkdtemp(path.join(tmpdir(), 'saw-warehouse-ui-'))
const vite = await createServer({ define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api') }, server: { host: '127.0.0.1', port: 0 } })
const order = { id: 10, orderCode: 'PO-UI-001', distributorName: 'Nhà phân phối kiểm thử', approvedAt: '2026-10-17T16:14:20Z', expectedDeliveryDate: '2026-10-21', status: 'PARTIALLY_PICKED', approvedWeightKg: 15, reservedWeightKg: 15, pickedWeightKg: 5, canPick: true, pickingLockReason: null }
const detail = { order, lines: [{ id: 20, cropName: 'Xoài', requestedProductBatchId: 30, requestedBatchCode: 'LOT-UI-001', productName: 'Xoài kiểm thử', approvedWeightKg: 15, reservedWeightKg: 15, pickedWeightKg: 5, reservations: [{ id: 40, inventoryId: 50, productBatchId: 30, batchCode: 'LOT-UI-001', productName: 'Xoài kiểm thử', warehouseLocationId: 1, locationName: 'A-01', expiryDate: '2026-11-06', status: 'PARTIALLY_PICKED', reservedQuantityKg: 15, pickedQuantityKg: 5, canPick: true, pickingLockReason: null, history: [{ id: 60, quantityKg: 5, pickedAt: '2026-10-17T16:16:49Z', pickedByName: 'Nhân viên kiểm thử', note: null }] }] }] }
const adjustment = { id: 1, adjustmentCode: 'SA-UI-001', requestKind: 'COUNT', adjustmentType: 'DAMAGE', productBatchId: 30, batchCode: 'LOT-UI-001', productName: 'Xoài kiểm thử', locations: 'A-01', systemQuantity: 100, actualQuantity: 95, differenceQuantity: -5, status: 'PENDING', createdBy: 'Nhân viên kiểm thử', createdAt: '2026-10-17T17:52:00' }
const issue = { id: 2, issueCode: 'GI-UI-001', purchaseOrderId: 10, orderCode: order.orderCode, distributorName: order.distributorName, weightInKg: 15, issuedDate: '2026-10-18', operationStaffName: 'Nhân viên kiểm thử', issueStatus: 'DRAFT' }
const requests = [], checks = [], errors = []
let edge, socket
try {
  await mkdir(evidence, { recursive: true }); await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  const listener = net.createServer(); await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve))
  const port = listener.address().port; await new Promise(resolve => listener.close(resolve))
  edge = spawn(process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(temp, 'profile')}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
  let version
  for (let i = 0; i < 100; i++) { try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break } catch { await delay(100) } }
  assert.ok(version, 'Edge started')
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
  const until = async (check, label) => { for (let i = 0; i < 400; i++) { if (await check()) return; await delay(100) } throw new Error(`Timeout ${label}: ${(await text()).slice(0, 2000)}`) }
  const click = async label => { await until(() => evaluate(`!![...(document.querySelector('[role="dialog"]') ?? document).querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(label)} && !b.disabled)`), label); await evaluate(`[...(document.querySelector('[role="dialog"]') ?? document).querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(label)} && !b.disabled).click()`) }
  const fill = (selector, value) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); const p = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(p, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); })()`)
  const screenshot = async name => { const r = await page('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); await writeFile(path.join(evidence, name), Buffer.from(r.data, 'base64')) }
  const authenticate = async role => {
    if (bootstrap) await page('Page.removeScriptToEvaluateOnNewDocument', { identifier: bootstrap })
    const session = { user: { id: 1, name: 'Nhân viên kiểm thử', email: 'ui@test.invalid', role }, accessToken: 'ui-fixture-token', refreshToken: 'unused', expiresAt: new Date(Date.now() + 3600000).toISOString(), refreshTokenExpiresAt: new Date(Date.now() + 7200000).toISOString() }
    bootstrap = (await page('Page.addScriptToEvaluateOnNewDocument', { source: `sessionStorage.setItem('saw.auth-session', ${JSON.stringify(JSON.stringify(session))})` })).identifier
  }
  await page('Page.enable'); await page('Runtime.enable')
  handlers.set('Runtime.exceptionThrown', e => errors.push(e.exceptionDetails.text))
  handlers.set('Fetch.requestPaused', e => {
    const url = new URL(e.request.url), method = e.request.method
    requests.push({ path: url.pathname, query: url.search, method, body: e.request.postData ? JSON.parse(e.request.postData) : null })
    const pageResult = items => ({ items, totalCount: url.searchParams.get('search') ? 1 : 42, page: Number(url.searchParams.get('page') || 1), pageSize: Number(url.searchParams.get('pageSize') || 20) })
    let data
    if (url.pathname.endsWith('/locations')) data = [{ id: 1, code: 'A-01', name: 'A-01' }]
    else if (url.pathname === '/api/operation/picking-orders/10') data = detail
    else if (url.pathname.endsWith('/confirm-picking')) {
      const saved = structuredClone(detail); saved.order.pickedWeightKg = 15; saved.order.status = 'PICKED'; saved.order.canPick = false
      saved.lines[0].pickedWeightKg = 15; saved.lines[0].reservations[0].pickedQuantityKg = 15; saved.lines[0].reservations[0].canPick = false; saved.lines[0].reservations[0].status = 'PICKED'
      data = saved
    } else if (url.pathname === '/api/operation/picking-orders') data = pageResult([order])
    else if (url.pathname.endsWith('/stock-adjustments')) data = pageResult([adjustment])
    else if (url.pathname === '/api/operation/goods-issues') data = pageResult([issue])
    else data = []
    void page('Fetch.fulfillRequest', { requestId: e.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json; charset=utf-8' }], body: Buffer.from(JSON.stringify({ statusCode: 200, isSuccess: true, message: '', data, errors: null, timestamp: new Date().toISOString() })).toString('base64') }).catch(error => errors.push(error.message))
  })
  await page('Fetch.enable', { patterns: [{ urlPattern: '*/api/*' }] })
  await page('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await authenticate('OPERATION_STAFF')
  const lists = [
    { route: '/operation/picking-orders', endpoint: '/api/operation/picking-orders', sort: 'approved_desc', detail: '/operation/picking-orders/10', next: 'Trang sau' },
    { route: '/operation/goods-issues', endpoint: '/api/operation/goods-issues', sort: 'issuedAtDesc', detail: '/operation/goods-issues/2', next: 'Sau' },
    { route: '/operation/stock-adjustments', endpoint: '/api/operation/stock-adjustments', sort: 'createdDesc', detail: '/operation/stock-adjustments/1', next: 'Sau' },
    { route: '/warehouse-manager/stock-adjustments', endpoint: '/api/warehouse-manager/stock-adjustments', sort: 'createdDesc', detail: '/warehouse-manager/stock-adjustments/1', next: 'Sau' },
  ]
  for (const [index, screen] of lists.entries()) {
    if (index === 3) await authenticate('WAREHOUSE_MANAGER')
    await page('Page.navigate', { url: origin + screen.route })
    await until(() => evaluate(`!!document.querySelector('tbody td:last-child a svg')`), screen.route)
    assert.equal(await evaluate(`document.querySelectorAll('button[type="submit"]').length`), 1)
    assert.equal(await evaluate(`document.querySelectorAll('button[aria-label="Đặt lại bộ lọc"]').length`), 1)
    assert.equal((await text()).includes('Xóa bộ lọc'), false)
    assert.equal(await evaluate(`document.querySelector('thead th:last-child').textContent.trim()`), 'Thao tác')
    assert.equal(await evaluate(`document.querySelector('tbody td:last-child a').getAttribute('href')`), screen.detail)
    assert.equal(await evaluate(`document.querySelector('tbody td:last-child a').textContent.trim()`), '')
    const listRequests = () => requests.filter(r => r.path === screen.endpoint)
    const initialCount = listRequests().length
    await fill('form[aria-label="Tìm kiếm và bộ lọc"] input:not([type="date"])', 'UI-search')
    await delay(150); assert.equal(listRequests().length, initialCount, 'typing does not apply filters')
    await fill('form[aria-label="Tìm kiếm và bộ lọc"] input[type="date"]', '2026-10-01')
    await evaluate(`(() => { for (const select of document.querySelectorAll('form select')) { select.selectedIndex = 1; select.dispatchEvent(new Event('change', {bubbles:true})); } })()`)
    await click('Áp dụng bộ lọc')
    await until(() => Promise.resolve(listRequests().some(r => new URLSearchParams(r.query).get('search') === 'UI-search')), 'apply search')
    await until(() => evaluate(`!!document.querySelector('tbody td:last-child a svg')`), 'filtered rows')
    await fill('select[aria-label="Số dòng mỗi trang"]', '50')
    await until(() => Promise.resolve(new URLSearchParams(listRequests().at(-1).query).get('pageSize') === '50'), 'server page size')
    await evaluate(`document.querySelector('button[aria-label="Đặt lại bộ lọc"]').click()`)
    await until(() => Promise.resolve(!new URLSearchParams(listRequests().at(-1).query).get('search')), 'reset request')
    const reset = new URLSearchParams(listRequests().at(-1).query)
    for (const key of ['search', 'status', 'warehouseLocationId', 'requestKind', 'adjustmentType', 'fromDate', 'toDate']) assert.ok(!reset.get(key), `reset ${key}`)
    assert.equal(reset.get(index === 0 ? 'sort' : 'sortBy'), screen.sort); assert.equal(reset.get('page'), '1'); assert.equal(reset.get('pageSize'), '50')
    assert.equal(await evaluate(`document.querySelector('form input:not([type="date"])').value`), '')
    assert.equal(await evaluate(`document.querySelector('form input[type="date"]').value`), '')
    await until(() => evaluate(`!!document.querySelector('tbody td:last-child a svg')`), 'reset rows')
    await fill('select[aria-label="Số dòng mỗi trang"]', '20')
    await until(() => Promise.resolve(new URLSearchParams(listRequests().at(-1).query).get('pageSize') === '20'), 'page size 20')
    await until(() => evaluate(`!!document.querySelector('tbody td:last-child a svg')`), 'rows ready for next page')
    await click(screen.next)
    await until(() => Promise.resolve(new URLSearchParams(listRequests().at(-1).query).get('page') === '2'), 'next page')
    await evaluate(`document.querySelector('button[aria-label="Đặt lại bộ lọc"]').click()`)
    await until(() => Promise.resolve(new URLSearchParams(listRequests().at(-1).query).get('page') === '1'), 'reset returns to page one')
    await until(() => evaluate(`!!document.querySelector('tbody td:last-child a svg')`), 'table after reset')
    if (index >= 2) { assert.match(await text(), /18\/10\/2026/); assert.equal((await text()).includes('17T17:52'), false) }
    await screenshot(`list-${index + 1}.png`)
    await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), `mobile width ${screen.route}`)
    await screenshot(`list-${index + 1}-mobile.png`)
    await page('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
    checks.push(`${screen.route}: apply/reset/pagination, icon detail action, date display, desktop/mobile layout`)
  }
  await authenticate('OPERATION_STAFF'); await page('Page.navigate', { url: origin + '/operation/picking-orders/10' })
  await until(() => evaluate(`!!document.querySelector('textarea')`), 'picking detail')
  assert.equal(await evaluate(`document.querySelectorAll('a[href*="stock-adjustments/create"]').length`), 0)
  assert.equal((await text()).includes('Tải lại dữ liệu'), false)
  await fill('textarea', 'Giữ ghi chú sau khi đóng hộp thoại')
  const writes = () => requests.filter(r => r.method !== 'GET')
  assert.equal(await evaluate(`!![...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Báo cáo')`), false)
  assert.equal(writes().length, 0, 'opening the detail does not submit the form or call API')
  assert.equal(await evaluate(`document.querySelectorAll('[role="dialog"]').length`), 0)
  const alignment = await evaluate(`(() => { const badge = [...document.querySelectorAll('span')].find(el => el.textContent === 'Đang soạn một phần' && el.children.length === 1); const range=document.createRange();range.selectNodeContents(badge.lastChild); const box=badge.getBoundingClientRect(), text=range.getBoundingClientRect();return {height:box.height,offset:Math.abs(box.y+box.height/2-text.y-text.height/2)} })()`)
  assert.ok(alignment.height <= 32 && alignment.offset <= 2, JSON.stringify(alignment))
  await screenshot('picking-detail.png')
  await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'mobile picking detail fits viewport')
  await screenshot('picking-detail-mobile.png')
  await page('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await click('Xác nhận'); await click('Quay lại')
  assert.equal(await evaluate(`document.querySelector('textarea').value`), 'Giữ ghi chú sau khi đóng hộp thoại')
  assert.equal(writes().length, 0)
  await click('Xác nhận'); await click('Xác nhận')
  await until(async () => (await text()).includes('Đã xác nhận soạn hàng.'), 'confirm still works')
  assert.equal(writes().length, 1); assert.equal(writes()[0].body.quantityKg, 10); assert.equal(writes()[0].body.expectedPickedQuantityKg, 5)
  checks.push('picking detail: shortcuts/reload line removed; compact centered badge; report button removed; confirm/cancel retains notes and full-lot payload')
  assert.deepEqual(errors, [])
  await writeFile(path.join(evidence, 'browser-result.json'), JSON.stringify({ result: 'Passed', mode: 'Edge + Vite, mocked API; no SQL/backend assertions', checks }, null, 2))
  console.log(JSON.stringify({ result: 'Passed', checks, evidence }))
  await call('Browser.close')
} finally {
  socket?.close(); edge?.kill(); await vite.close()
  assert.equal(path.dirname(path.resolve(temp)), path.resolve(tmpdir())); assert.ok(path.basename(temp).startsWith('saw-warehouse-ui-'))
  await rm(temp, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 })
}
