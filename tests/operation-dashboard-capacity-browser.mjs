// FE checks with explicitly mocked API responses. No backend or warehouse data is changed.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { createServer } from 'vite'

const evidence = path.resolve(process.env.SAW_TEST_EVIDENCE_DIRECTORY || '../Capstone_SAW_BE/test-results/operation-dashboard-capacity')
const temp = await mkdtemp(path.join(tmpdir(), 'saw-warehouse-ui-'))
const vite = await createServer({ define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api') }, server: { host: '127.0.0.1', port: 0 } })
const order = { id: 10, orderCode: 'PO-UI-001', distributorName: 'Nhà phân phối kiểm thử', approvedAt: '2026-10-17T16:14:20Z', expectedDeliveryDate: '2026-10-21', status: 'PARTIALLY_PICKED', approvedWeightKg: 15, reservedWeightKg: 15, pickedWeightKg: 5, canPick: true, pickingLockReason: null }
const adjustment = { id: 1, adjustmentCode: 'SA-UI-001', requestKind: 'COUNT', adjustmentType: 'DAMAGE', productBatchId: 30, batchCode: 'LOT-UI-001', productName: 'Xoài kiểm thử', locations: 'A-01', systemQuantity: 100, actualQuantity: 95, differenceQuantity: -5, status: 'PENDING', createdBy: 'Nhân viên kiểm thử', createdAt: '2026-10-17T17:52:00' }
const issue = { id: 2, issueCode: 'GI-UI-001', purchaseOrderId: 10, orderCode: order.orderCode, distributorName: order.distributorName, weightInKg: 15, issuedDate: '2026-10-18', operationStaffName: 'Nhân viên kiểm thử', issueStatus: 'DRAFT' }
const requests = [], errors = []
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
    bootstrap = (await page('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('saw.auth-session', ${JSON.stringify(JSON.stringify(session))})` })).identifier
  }
  await page('Page.enable'); await page('Runtime.enable')
  handlers.set('Runtime.exceptionThrown', e => errors.push(e.exceptionDetails.text))
  let phase = 'populated', free = 40
  const receipt = { id: 3, receiptCode: 'GR-UI-003', batchCode: 'LOT-UI-001', locationName: 'A-01', weightInKg: 50 }
  const qc = { id: 1, inspectionCode: 'QC-UI-001', batchCode: 'LOT-UI-001', productName: 'Xoài', cropTypeName: 'Xoài', inspectionStatus: 'COMPLETED', qcResult: 'PASS', qualityGrade: 'B', startedAt: '2026-11-18T01:00:00Z' }
  const options = () => ({ suppliers: [{ id: 1, name: 'HTX test' }], locations: [
    { id: 1, name: 'A-01', isActive: true, maxWeightKg: 100, usedWeightKg: 100 - free, remainingWeightKg: free },
    { id: 2, name: 'A-02', isActive: true, maxWeightKg: 100, usedWeightKg: 0, remainingWeightKg: 100 },
    { id: 3, name: 'A-03', isActive: true, maxWeightKg: null, usedWeightKg: 0, remainingWeightKg: null },
  ] })
  handlers.set('Fetch.requestPaused', e => {
    const url = new URL(e.request.url)
    requests.push({ path: url.pathname, query: url.search, method: e.request.method })
    const result = (items, count) => ({ items: phase === 'empty' ? [] : items, totalCount: phase === 'empty' ? 0 : count, page: 1, pageSize: 3 })
    let data = [], responseCode = 200
    if (url.pathname.includes('/notifications')) data = { items: [], unreadCount: 0 }
    else if (url.pathname === '/api/operation/goods-receipts/filters') data = options()
    else if (url.pathname.endsWith('/eligible-batches')) data = { items: [{ id: 30, supplierId: 1, batchCode: 'LOT-UI-001', productName: 'Xoài', supplierName: 'HTX test', quantity: 5, unit: 'Bao', weightInKg: 50, qualityGrade: 'B' }], totalCount: 1, page: 1, pageSize: 10 }
    else if (url.pathname === '/api/operation/goods-receipts') data = result([receipt], 12)
    else if (url.pathname === '/api/operation/goods-issues') data = result([issue], 9)
    else if (url.pathname === '/api/operation/stock-adjustments') data = result([adjustment], 7)
    else if (url.pathname === '/api/operation/picking-orders') {
      const status = url.searchParams.get('status')
      data = result([{ ...order, id: ['APPROVED', 'RESERVED', 'PARTIALLY_PICKED', 'PARTIALLY_ISSUED'].indexOf(status) + 10, status }], 10)
      if (phase === 'error') { responseCode = 500; data = null }
    } else if (url.pathname === '/api/qc-inspections') data = { items: [qc], totalCount: 1, page: 1, pageSize: 100 }
    void page('Fetch.fulfillRequest', { requestId: e.requestId, responseCode, responseHeaders: [{ name: 'Content-Type', value: 'application/json; charset=utf-8' }], body: Buffer.from(JSON.stringify({ statusCode: responseCode, isSuccess: responseCode === 200, message: responseCode === 500 ? 'Test API unavailable' : '', data, errors: null })).toString('base64') }).catch(error => errors.push(error.message))
  })
  await page('Fetch.enable', { patterns: [{ urlPattern: '*/api/*' }] })
  await page('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await authenticate('OPERATION_STAFF')
  await page('Page.navigate', { url: origin + '/operation' })
  await until(() => evaluate(`document.body.innerText.includes('GR-UI-003')`), 'live dashboard')
  const counts = await evaluate(`Array.from(document.querySelectorAll('[aria-busy] > div:first-of-type > a p')).map(e => Number(e.textContent))`)
  assert.deepEqual(counts, [12, 9, 40, 7], 'counts use all server totals, not preview lengths')
  assert.equal((await text()).includes('Chuyển kho'), false)
  const labels = await evaluate(`Array.from(document.querySelector('nav[aria-label="Điều hướng chính"]').querySelectorAll('a')).map(e => e.textContent.trim())`)
  assert.deepEqual(labels, ['Bảng điều khiển', 'Quản lý lô hàng', 'Nhập kho', 'Xuất kho', 'Đơn hàng chờ soạn', 'Điều chỉnh tồn'])
  assert.equal(await evaluate(`!!document.querySelector('nav[aria-label="Lối tắt vận hành"]')`), false)
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('button')).some(button => button.textContent.trim() === 'Làm mới')`), false)
  assert.equal(await evaluate(`document.querySelector('a[href="/operation/goods-receipts/3"]').textContent.includes('GR-UI-003')`), true)
  assert.equal(requests.filter(r => r.path.endsWith('/picking-orders')).some(r => new URLSearchParams(r.query).get('status') === 'CANCELLED'), false)
  await screenshot('operation-dashboard.png')
  const focus = () => evaluate(`window.dispatchEvent(new Event('focus'))`)
  phase = 'empty'; await focus()
  await until(() => evaluate(`document.querySelectorAll('[aria-busy] > div:first-of-type > a p').length === 4 && Array.from(document.querySelectorAll('[aria-busy] > div:first-of-type > a p')).every(e => e.textContent === '0')`), 'refresh empty state')
  phase = 'error'; await focus()
  await until(() => evaluate(`!!document.querySelector('[role="alert"]')`), 'API failure')
  assert.equal(await evaluate(`!!document.querySelector('[aria-busy]')`), false, 'failed queries must not display fake zeros')
  phase = 'populated'; await focus()
  await until(() => evaluate(`document.body.innerText.includes('GR-UI-003')`), 'automatic retry')
  await page('Page.navigate', { url: origin + '/operation/goods-receipts/create' })
  await until(() => evaluate(`!!document.querySelector('select[aria-label="Nhà cung cấp"]')`), 'create form')
  await fill('select[aria-label="Nhà cung cấp"]', '1')
  await until(() => evaluate(`!!document.querySelector('select[aria-label="Lô nhập kho"] option[value="30"]')`), 'eligible lot')
  await fill('select[aria-label="Lô nhập kho"]', '30')
  await until(() => evaluate(`!!document.querySelector('#receipt-location')`), 'capacity options')
  assert.equal(await evaluate(`document.querySelector('#receipt-location option[value="1"]').textContent.trim()`), 'A-01 · Thiếu 10 kg')
  assert.equal(await evaluate(`document.querySelector('#receipt-location option[value="2"]').textContent.trim()`), 'A-02')
  assert.match(await evaluate(`document.querySelector('#receipt-location option[value="3"]').textContent`), /Chưa đặt giới hạn/)
  await fill('#receipt-location', '1')
  await until(() => evaluate(`document.body.innerText.includes('Vị trí hiện không đủ chỗ')`), 'selected capacity warning')
  assert.match(await evaluate(`document.querySelector('#receipt-location-capacity').textContent`), /Còn trống 40 kg/)
  await fill('textarea', 'Giữ ghi chú khi làm mới sức chứa')
  free = 60; await click('Làm mới sức chứa')
  await until(() => evaluate(`document.querySelector('#receipt-location-capacity')?.textContent.includes('Còn trống 60 kg')`), 'updated selected capacity')
  assert.equal(await evaluate(`document.querySelector('#receipt-location option[value="1"]').textContent.trim()`), 'A-01')
  assert.equal(await evaluate(`document.querySelector('#receipt-location').value`), '1')
  assert.equal(await evaluate(`document.querySelector('textarea').value`), 'Giữ ghi chú khi làm mới sức chứa')
  await screenshot('receipt-capacity.png')
  await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'receipt mobile fits')
  await authenticate('QC_STAFF'); await page('Page.navigate', { url: origin + '/qc' })
  await until(() => evaluate(`!!document.querySelector('tbody td')`), 'QC table')
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('thead th')).map(e => e.textContent.trim())`), ['Mã phiếu', 'Lô hàng', 'Sản phẩm', 'Trạng thái', 'Kết quả', 'Hạng', 'Ngày bắt đầu', ''])
  assert.equal(await evaluate(`document.querySelector('tbody td:nth-child(5)').textContent.trim()`), 'ĐẠT')
  assert.equal(await evaluate(`document.querySelector('tbody td:nth-child(6)').textContent.trim()`), 'B')
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('tbody td:nth-child(4) span')).whiteSpace`), 'nowrap')
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'QC table scrolls inside container on mobile')
  await page('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await screenshot('qc-dashboard.png')
  assert.equal(requests.some(r => r.method !== 'GET'), false, 'read-only UI smoke performs no mutations')
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ result: 'Passed', mode: 'Edge + Vite with mocked API', checks: ['live totals/preview links', 'menu order', 'refresh/empty/error/retry', 'capacity/insufficient/unconfigured/refresh preserves form', 'QC separate grade/nowrap/mobile'], evidence }))
  await call('Browser.close')
} finally {
  socket?.close(); edge?.kill(); await vite.close()
  assert.equal(path.dirname(path.resolve(temp)), path.resolve(tmpdir())); assert.ok(path.basename(temp).startsWith('saw-warehouse-ui-'))
  await rm(temp, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 })
}
