// Real Edge + real isolated API/SQL fixture. Invoked by GoodsReceiptSqlTests with SAW_TEST_BROWSER=1.
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
const batchId = Number(process.env.SAW_TEST_BATCH_ID)
const supplierId = Number(process.env.SAW_TEST_SUPPLIER_ID)
const locationId = Number(process.env.SAW_TEST_LOCATION_ID)
const batchCode = process.env.SAW_TEST_BATCH_CODE
assert.ok(batchId > 0 && supplierId > 0 && locationId > 0 && batchCode && process.env.SAW_TEST_TOKEN)
const temp = await mkdtemp(path.join(tmpdir(), 'saw-receipts-browser-'))
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
  await navigate('/operation/goods-receipts')
  await until(() => evaluate('location.pathname === "/login"'), 'Guest route protection')
  const session = { user: { id: 1, name: 'Receipt test', email: 'receipt@test.invalid', role: 'OPERATION_STAFF' }, accessToken: process.env.SAW_TEST_TOKEN,
    refreshToken: 'isolated-unused', expiresAt: new Date(Date.now() + 3600000).toISOString(), refreshTokenExpiresAt: new Date(Date.now() + 7200000).toISOString() }
  await evaluate(`sessionStorage.setItem('saw.auth-session', ${JSON.stringify(JSON.stringify(session))})`)
  await navigate('/operation/goods-receipts')
  await until(async () => (await text()).includes('QUẢN LÝ PHIẾU NHẬP'), 'list')
  await click('Tạo phiếu nhập')
  await until(() => evaluate('location.pathname === "/operation/goods-receipts/create" && !!document.querySelector("form select")'), 'supplier form')
  await setValue('select', supplierId)
  await until(() => evaluate(`!!document.querySelector('select[aria-label="Lô nhập kho"]')`), 'eligible list')
  await setValue('input[aria-label="Tìm lô đủ điều kiện"]', batchCode)
  await delay(200) // Allow React to replace the prior unfiltered select during loading.
  await until(() => evaluate(`!!document.querySelector('select[aria-label="Lô nhập kho"] option[value="${batchId}"]')`), 'eligible search')
  await setValue('select[aria-label="Lô nhập kho"]', batchId)
  await until(async () => (await text()).includes('Số liệu kiểm nhận dùng cho phiếu'), 'verified preview')
  assert.ok((await text()).includes('1.000 kg'))
  assert.equal(await evaluate('document.querySelectorAll("input[type=number]").length'), 0)
  await setValue('form > fieldset:last-of-type select', locationId)
  await setValue('textarea', 'Browser receiving test')
  await click('Lưu nháp')
  await until(async () => (await text()).includes('Đã lưu phiếu nhập nháp'), 'draft saved')
  const detailPath = await evaluate('location.pathname')
  await click('← Quay lại danh sách')
  await until(async () => (await text()).includes('QUẢN LÝ PHIẾU NHẬP'), 'back list')
  await setValue('input[aria-label="Mã phiếu hoặc mã lô"]', batchCode)
  await click('Áp dụng bộ lọc')
  await until(async () => (await text()).includes(batchCode), 'search draft')
  await evaluate(`document.querySelector('a[href="${detailPath}"]').click()`)
  await until(async () => (await text()).includes('Browser receiving test'), 'reopened draft')
  const receiptApi = new URL(`/api${detailPath}`, api)
  const headers = { Authorization: `Bearer ${process.env.SAW_TEST_TOKEN}`, 'Content-Type': 'application/json' }
  const changeElsewhere = async note => {
    const read = await fetch(receiptApi, { headers }); assert.equal(read.status, 200)
    const body = await read.json(); const r = body.data
    const changed = await fetch(`${receiptApi}/draft`, { method: 'PUT', headers, body: JSON.stringify({
      warehouseLocationId: r.warehouseLocationId, receivedDate: r.receivedDate, note, expectedSnapshot: r.snapshot,
    }) })
    assert.equal(changed.status, 200)
  }
  await click('Chỉnh sửa phiếu nháp')
  await until(() => evaluate('!!document.querySelector("textarea")'), 'draft edit form')
  await setValue('textarea', 'My unsaved note')
  await changeElsewhere('Other staff edit')
  await click('Lưu thay đổi')
  await until(async () => (await text()).includes('đã được người khác thay đổi'), 'stale edit conflict')
  assert.equal(await evaluate('document.querySelector("textarea").value'), 'My unsaved note')
  assert.equal(await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Lưu thay đổi').disabled`), true)
  handlers.set('Page.javascriptDialogOpening', () => { void page('Page.handleJavaScriptDialog', { accept: true }) })
  await click('Tải lại dữ liệu mới nhất')
  await until(() => evaluate('document.querySelector("textarea")?.value === "Other staff edit"'), 'explicit reload replaces stale form')
  await setValue('textarea', 'Browser receiving test')
  await click('Lưu thay đổi')
  await until(async () => (await text()).includes('Đã lưu thay đổi phiếu nháp') && !await evaluate('!!document.querySelector("textarea")'), 'edit saved')
  await until(async () => (await text()).includes('Browser receiving test'), 'updated detail')
  await click('Xác nhận nhập kho')
  await changeElsewhere('New note after dialog opened')
  await click('Xác nhận')
  await until(async () => (await text()).includes('đã được người khác thay đổi'), 'stale confirm rejected')
  await until(async () => (await text()).includes('New note after dialog opened'), 'conflict detail refreshed')
  await click('Chỉnh sửa phiếu nháp')
  await until(() => evaluate('!!document.querySelector("textarea")'), 'reopen edit')
  await setValue('textarea', 'Browser receiving test')
  await until(() => evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent==='Lưu thay đổi' && !b.disabled)`), 'edit locations loaded')
  await click('Lưu thay đổi')
  await until(async () => !await evaluate('!!document.querySelector("textarea")') && (await text()).includes('Browser receiving test'), 'latest changes saved')
  await click('Xác nhận nhập kho')
  await until(() => evaluate('!!document.querySelector("[role=dialog]")'), 'summary dialog')
  await click('Hủy')
  assert.ok((await text()).includes('Browser receiving test'))
  await click('Xác nhận nhập kho'); await click('Xác nhận')
  await until(async () => (await text()).includes('Tồn kho đã được cập nhật'), 'committed')
  await until(async () => (await text()).includes('Phiếu đã xác nhận, không thể sửa hoặc xóa.'), 'committed detail reload')
  await navigate(detailPath)
  await until(async () => (await text()).includes('Phiếu đã xác nhận, không thể sửa hoặc xóa.'), 'refresh committed')
  assert.equal(await evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent==='Xác nhận nhập kho')`), false)
  await page('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true })
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'mobile detail overflow')
  await navigate('/operation/goods-receipts')
  await until(() => evaluate(`!!document.querySelector('input[aria-label="Mã phiếu hoặc mã lô"]')`), 'mobile list')
  await setValue('input[aria-label="Mã phiếu hoặc mã lô"]', 'NO-SUCH-RECEIPT-TEST')
  await click('Áp dụng bộ lọc')
  await until(async () => (await text()).includes('Không có phiếu nhập phù hợp bộ lọc.'), 'empty filtered state')
  handlers.set('Fetch.requestPaused', e => { void page('Fetch.failRequest', { requestId: e.requestId, errorReason: 'InternetDisconnected' }) })
  await page('Fetch.enable', { patterns: [{ urlPattern: '*api/operation/goods-receipts*' }] })
  await evaluate(`document.querySelector('button[aria-label="Làm mới"]').click()`)
  await until(() => evaluate('!!document.querySelector("[role=alert]")'), 'network error state')
  await page('Fetch.disable')
  await evaluate(`document.querySelector('button[aria-label="Làm mới"]').click()`)
  await until(async () => (await text()).includes('Không có phiếu nhập phù hợp bộ lọc.') && !(await evaluate('!!document.querySelector("[role=alert]")')), 'retry')
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'mobile list overflow')
  session.user.role = 'SUPPLIER'
  await evaluate(`sessionStorage.setItem('saw.auth-session', ${JSON.stringify(JSON.stringify(session))})`)
  await navigate('/operation/goods-receipts/create')
  await until(() => evaluate('location.pathname === "/403"'), 'role guard')
  assert.deepEqual(errors, [])
  console.log('PASS: real Edge/API/isolated SQL draft -> edit -> stale edit preserved -> explicit reload -> save -> stale confirm rejected -> reviewed confirm -> refresh; search, empty/error/retry, mobile, Guest/role guards.')
  await call('Browser.close')
} finally {
  socket?.close(); edge?.kill(); await vite.close()
  const resolved = path.resolve(temp)
  if (path.dirname(resolved) === path.resolve(tmpdir()) && path.basename(resolved).startsWith('saw-receipts-browser-'))
    await rm(resolved, { recursive: true, force: true, maxRetries: 15, retryDelay: 300 })
}
