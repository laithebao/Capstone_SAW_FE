// Run with: node tests/supplier-batches-browser.mjs
// Real browser, isolated in-memory API responses; no application database is used.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { createServer } from 'vite'

const areas = [
  { growingAreaId: 11, areaName: 'Vườn A', province: 'Đồng Tháp', district: 'Huyện A', ward: 'Xã A' },
  { growingAreaId: 12, areaName: 'Vườn B', province: 'Đồng Tháp', district: 'Huyện A', ward: 'Xã B' },
]
let detail = {
  batchId: 1, batchCode: 'LH-TEST', cropTypeId: 1, growingAreaId: 11, productName: 'Cam', cropTypeName: 'Cam',
  ...areas[0], currentStatus: 'SUBMITTED', statusDisplayName: 'Chờ tiếp nhận',
  harvestDate: '2026-01-01', declaredQuantity: 100, unit: 'Kg', weightInKg: 100,
  receivedQuantity: 0, verifiedQuantity: null, verifiedWeightInKg: null,
  updatedAt: null, createdAt: '2026-01-01T00:00:00Z', documents: [], statusHistory: [],
}
const requests = []
let cancelCount = 0, updateCount = 0, failCancel = false, failRefresh = false, listTotalPages = 2
const temp = await mkdtemp(path.join(tmpdir(), 'saw-supplier-browser-'))
const vite = await createServer({
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api') },
  server: { host: '127.0.0.1', port: 0 },
  plugins: [{ name: 'supplier-test-api', configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url, 'http://127.0.0.1')
      if (!url.pathname.startsWith('/api/')) return next()
      requests.push({ method: req.method, url })
      const json = (body, status = 200) => {
        res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body))
      }
      if (url.pathname === '/api/suppliers/me/profile') return json({ supplierId: 1, phoneNumber: '0900000000', profileStatus: 'ACTIVE', growingAreas: areas, cropTypes: [
        { cropTypeId: 1, cropName: 'Cam', cropCode: 'CAM', categoryName: 'Trái cây' },
      ] })
      if (url.pathname === '/api/SupplierBatches') return json({
        summary: { totalDeclaredBatches: 12, pendingApprovalBatches: 12 },
        batches: { items: [{ ...detail, status: detail.currentStatus, statusDisplayName: detail.statusDisplayName, quantityInTons: 0.1 }],
          pageIndex: Number(url.searchParams.get('pageIndex') || 1), totalPages: listTotalPages, totalCount: 12, pageSize: 10 },
      })
      if (url.pathname === '/api/SupplierBatches/1/status') {
        if (failRefresh) return json({ message: 'Tải lại thất bại' }, 503)
        return json({ data: detail })
      }
      if (url.pathname === '/api/SupplierBatches/1' && req.method === 'PUT') {
        let body = ''; for await (const chunk of req) body += chunk
        const changed = JSON.parse(body)
        assert.equal(changed.growingAreaId, 11)
        assert.equal(changed.expectedCreatedAt, detail.createdAt)
        updateCount++; detail = { ...detail, productName: changed.productName, updatedAt: '2026-01-02T00:00:00Z' }
        return json({ data: detail })
      }
      if (url.pathname === '/api/SupplierBatches/1/cancel') {
        cancelCount++
        await delay(350)
        if (failCancel) return json({ message: 'Lô hàng đã thay đổi. Vui lòng tải lại.' }, 409)
        detail = { ...detail, currentStatus: 'CANCELLED', statusDisplayName: 'Đã hủy' }
        return json({ message: 'Đã hủy' })
      }
      return json({ message: 'Unexpected mock request' }, 404)
    })
  } }],
})
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
    const id = ++nextId; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params, sessionId }))
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
    console.error(await evaluate('location.pathname + "\\n" + document.body.innerText'))
    console.error(requests.map(r => `${r.method} ${r.url.pathname}${r.url.search}`))
    throw new Error(`Timed out: ${name}`)
  }
  const text = () => evaluate('document.body.innerText')
  const navigate = route => page('Page.navigate', { url: origin + route })
  const click = label => until(() => evaluate(`(() => { const e=[...document.querySelectorAll('button,a')].find(e=>e.textContent.trim()===${JSON.stringify(label)}); if (!e || e.disabled) return false; e.click(); return true; })()`), `button ready: ${label}`)
  const setValue = (selector, value) => evaluate(`(() => { const e=document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e),'value').set.call(e,${JSON.stringify(String(value))}); e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true})); })()`)
  await page('Page.enable'); await page('Runtime.enable')
  const errors = [], nativeDialogs = []
  handlers.set('Runtime.exceptionThrown', e => errors.push(e.exceptionDetails.text))
  handlers.set('Page.javascriptDialogOpening', e => { nativeDialogs.push(e.type); void page('Page.handleJavaScriptDialog', { accept: false }) })
  await page('Emulation.setDeviceMetricsOverride', { width: 1365, height: 900, deviceScaleFactor: 1, mobile: false })
  await navigate('/login')
  await until(() => evaluate('location.pathname === "/login" && !!document.querySelector("form")'), 'login')
  const session = { user: { id: 1, name: 'Supplier test', email: 'supplier@test.invalid', role: 'SUPPLIER' },
    accessToken: 'isolated-test-token', refreshToken: 'unused', expiresAt: new Date(Date.now() + 3600000).toISOString(),
    refreshTokenExpiresAt: new Date(Date.now() + 7200000).toISOString() }
  await evaluate(`sessionStorage.setItem('saw.auth-session', ${JSON.stringify(JSON.stringify(session))})`)
  await navigate('/supplier/batches')
  await until(() => evaluate(`document.querySelectorAll('select[aria-label="Lọc vùng trồng"] option').length === 3`), 'area options')
  const options = await evaluate(`[...document.querySelector('select[aria-label="Lọc trạng thái lô hàng"]').options].map(e=>e.value)`)
  assert.ok(options.includes('IN_STOCK'))
  for (const hidden of ['RESERVED', 'PARTIALLY_ISSUED', 'ISSUED']) assert.ok(!options.includes(hidden))
  assert.ok(!(await text()).includes('TIÊU THỤ'))
  const areaText = await evaluate(`document.querySelector('select[aria-label="Lọc vùng trồng"]').textContent`)
  assert.ok(areaText.includes('Vườn A · Xã A · Huyện A · Đồng Tháp'))
  assert.ok(areaText.includes('Vườn B · Xã B · Huyện A · Đồng Tháp'))
  await until(() => evaluate('!document.querySelector("button:has(svg.lucide-chevron-right)").disabled'), 'next page ready')
  await evaluate('document.querySelector("button:has(svg.lucide-chevron-right)").click()')
  await until(() => requests.at(-1).url.searchParams.get('pageIndex') === '2', 'page 2 request')
  await setValue('select[aria-label="Lọc vùng trồng"]', 12)
  await until(() => requests.at(-1).url.searchParams.get('growingAreaId') === '12', 'exact area request')
  assert.equal(requests.at(-1).url.searchParams.get('pageIndex'), '1')
  assert.ok(!requests.at(-1).url.searchParams.has('province'))
  assert.ok(!requests.at(-1).url.searchParams.has('consumptionStatus'))
  await setValue('select[aria-label="Lọc trạng thái lô hàng"]', 'IN_STOCK')
  await until(() => requests.at(-1).url.searchParams.get('status') === 'IN_STOCK', 'stored filter')
  await click('Xem toàn bộ danh sách')
  await until(() => requests.at(-1).url.pathname === '/api/SupplierBatches' && !requests.at(-1).url.searchParams.has('status') && !requests.at(-1).url.searchParams.has('growingAreaId'), 'clear filters')

  await setValue('select[aria-label="Lọc vùng trồng"]', 11)
  await setValue('select[aria-label="Lọc trạng thái lô hàng"]', 'SUBMITTED')
  await setValue('input[placeholder="Tìm mã lô, sản phẩm..."]', 'Cam')
  await until(() => requests.at(-1).url.searchParams.get('keyword') === 'Cam', 'keyword ready before tab switch')
  await until(() => evaluate('!document.querySelector("button:has(svg.lucide-chevron-right)").disabled'), 'page ready before tab switch')
  await evaluate('document.querySelector("button:has(svg.lucide-chevron-right)").click()')
  await until(() => requests.at(-1).url.searchParams.get('pageIndex') === '2', 'page two before tab switch')
  detail.productName = 'Cam từ dữ liệu mới'; listTotalPages = 1
  await delay(550)
  await evaluate('window.dispatchEvent(new Event("focus"))')
  await until(async () => requests.at(-1).url.searchParams.get('pageIndex') === '1' && (await text()).includes('Cam từ dữ liệu mới'), 'foreground refresh and page clamping')
  assert.equal(requests.at(-1).url.searchParams.get('growingAreaId'), '11')
  assert.equal(requests.at(-1).url.searchParams.get('status'), 'SUBMITTED')
  assert.equal(requests.at(-1).url.searchParams.get('keyword'), 'Cam')
  detail.productName = 'Cam'; listTotalPages = 2

  await navigate('/supplier/batches/1/edit')
  await until(() => evaluate('document.querySelector("input[name=productName]")?.value === "Cam"'), 'edit loaded')
  await click('Lưu thay đổi')
  await until(async () => (await text()).includes('Cập nhật lô hàng thành công'), 'update success popup')
  assert.equal(updateCount, 1)
  assert.ok(await evaluate('document.querySelector("dialog").open'))
  assert.equal(await evaluate('location.pathname'), '/supplier/batches/1')
  await click('Đã hiểu')
  await until(() => evaluate('!document.querySelector("dialog")'), 'update popup dismissed')
  const readsBeforeReload = requests.filter(r => r.url.pathname.endsWith('/status')).length
  await page('Page.reload')
  await until(async () => requests.filter(r => r.url.pathname.endsWith('/status')).length > readsBeforeReload && (await text()).includes('Chi tiết lô hàng'), 'detail reloaded')
  assert.equal(await evaluate('!!document.querySelector("dialog")'), false)

  detail = { ...detail, currentStatus: 'PENDING_QC', statusDisplayName: 'Chờ kiểm định QC' }
  await delay(550)
  await evaluate('window.dispatchEvent(new Event("focus"))')
  await until(async () => (await text()).includes('Chờ kiểm định QC'), 'detail refreshes after staff accepts batch')
  assert.equal(await evaluate('[...document.querySelectorAll("button")].some(e=>e.textContent.trim()==="Hủy lô hàng")'), false)
  detail = { ...detail, currentStatus: 'SUBMITTED', statusDisplayName: 'Chờ tiếp nhận' }
  await delay(550)
  await evaluate('document.dispatchEvent(new Event("visibilitychange"))')
  await until(() => evaluate('[...document.querySelectorAll("button")].some(e=>e.textContent.trim()==="Hủy lô hàng")'), 'visible tab refreshes detail')

  await click('Hủy lô hàng')
  await until(() => evaluate('document.querySelector("dialog")?.open'), 'cancel confirmation')
  const readsDuringConfirmation = requests.filter(r => r.url.pathname.endsWith('/status')).length
  await evaluate('window.dispatchEvent(new Event("focus"))')
  await delay(100)
  assert.equal(requests.filter(r => r.url.pathname.endsWith('/status')).length, readsDuringConfirmation, 'Confirmation retains its loaded version')
  await click('Giữ lô hàng')
  assert.equal(cancelCount, 0)
  await click('Hủy lô hàng')
  await page('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await page('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await until(() => evaluate('!document.querySelector("dialog")'), 'escape dismisses confirmation')
  assert.equal(cancelCount, 0)
  failCancel = true
  await click('Hủy lô hàng'); await click('Xác nhận hủy lô')
  assert.ok(await evaluate('[...document.querySelectorAll("dialog button")].every(e=>e.disabled)'))
  await until(async () => (await text()).includes('Lô hàng đã thay đổi. Vui lòng tải lại.'), 'cancel failure visible in popup')
  assert.ok(!(await text()).includes('Hủy lô hàng thành công'))
  failCancel = false; failRefresh = true
  await click('Xác nhận hủy lô')
  await until(async () => (await text()).includes('Hủy lô hàng thành công'), 'cancel success popup')
  await until(async () => (await text()).includes('chưa tải lại được chi tiết'), 'refresh failure remains separate from cancellation')
  assert.equal(cancelCount, 2)
  assert.equal(await evaluate('[...document.querySelectorAll("button")].some(e=>e.textContent.trim()==="Hủy lô hàng")'), false)
  await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  const rect = await evaluate('(() => { const r=document.querySelector("dialog").getBoundingClientRect(); return { left:r.left, right:r.right, width:innerWidth }; })()')
  assert.ok(rect.left >= 0 && rect.right <= rect.width, 'Popup fits mobile viewport')
  const screenshot = await page('Page.captureScreenshot', { format: 'png' })
  if (process.env.SAW_SUPPLIER_SCREENSHOT) await writeFile(process.env.SAW_SUPPLIER_SCREENSHOT, Buffer.from(screenshot.data, 'base64'))
  await click('Đã hiểu')
  failRefresh = false
  detail = { ...detail, currentStatus: 'ISSUED', statusDisplayName: 'Đã xuất hết', receivedQuantity: 100,
    warehousedAt: '2026-01-02T00:00:00Z', statusHistory: [
      { oldStatus: 'IN_STOCK', newStatus: 'ISSUED', changedAt: '2026-01-03T00:00:00Z' },
      { oldStatus: 'APPROVED_FOR_STORAGE', newStatus: 'IN_STOCK', changedAt: '2026-01-02T00:00:00Z' },
    ] }
  await navigate('/supplier/batches/1')
  await until(async () => (await text()).includes('Đã nhập kho'), 'stored detail')
  assert.ok(!(await text()).includes('Đã xuất hết'))
  assert.deepEqual(nativeDialogs, [])
  assert.deepEqual(errors, [])
  console.log('PASS: supplier filters, foreground refresh, pagination clamping, update/cancel popups, failure handling, mobile dialog, and warehouse progress boundary')
} finally {
  socket?.close()
  if (edge && edge.exitCode == null) {
    const stopped = new Promise(resolve => edge.once('exit', resolve)); edge.kill(); await stopped
  }
  await vite.close()
  await rm(temp, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
}
