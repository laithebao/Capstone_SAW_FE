// Real Edge/Vite + isolated API/SQL; invoked by ProductBatchDetailSqlTests. No app data is edited.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { createServer } from 'vite'

const api = new URL(process.env.SAW_TEST_API_URL || '')
assert.equal(api.hostname, '127.0.0.1', 'Use only the isolated loopback fixture API')
const batchId = Number(process.env.SAW_TEST_BATCH_ID)
const emptyId = Number(process.env.SAW_TEST_EMPTY_BATCH_ID)
const pendingId = Number(process.env.SAW_TEST_PENDING_BATCH_ID)
const receiptId = Number(process.env.SAW_TEST_RECEIPT_ID)
assert.ok(batchId > 0 && emptyId > 0 && pendingId > 0 && receiptId > 0 && process.env.SAW_TEST_TOKEN)
const temp = await mkdtemp(path.join(tmpdir(), 'saw-uc29-browser-'))
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
    const view = await evaluate('({path: location.pathname, text: document.body.innerText.slice(0, 1800)})')
    throw new Error(`Timed out: ${name}; view=${JSON.stringify(view)}`)
  }
  const text = () => evaluate('document.body.innerText')
  const section = label => evaluate(`document.querySelector('section[aria-label="${label}"]')?.innerText || ''`)
  const navigate = id => page('Page.navigate', { url: `${origin}/operation/product-batches/${id}` })
  await page('Page.enable'); await page('Runtime.enable'); await page('Network.enable')
  const errors = [], requests = []
  handlers.set('Runtime.exceptionThrown', e => errors.push(e.exceptionDetails.text))
  handlers.set('Network.requestWillBeSent', e => { if (e.request.url.includes('/api/')) requests.push(e.request) })
  const session = { user: { id: 1, name: 'UC29 Browser', email: 'uc29@example.invalid', role: 'OPERATION_STAFF' },
    accessToken: process.env.SAW_TEST_TOKEN, refreshToken: 'unused', expiresAt: new Date(Date.now() + 3600000).toISOString(),
    refreshTokenExpiresAt: new Date(Date.now() + 7200000).toISOString() }
  await page('Page.addScriptToEvaluateOnNewDocument', {
    source: `sessionStorage.setItem('saw.auth-session', ${JSON.stringify(JSON.stringify(session))});`,
  })

  await navigate(batchId)
  await until(async () => (await section('Kết quả kiểm định QC')).includes('Đạt (PASS)'), 'saved QC PASS')
  assert.match(await section('Kết quả kiểm định QC'), /Hạng chất lượng đã lưu\s+E/)
  assert.match(await section('Kết quả kiểm định QC'), /Đã hoàn tất/)
  assert.match(await section('Phiếu nhập liên quan'), /Phiếu nháp|Nháp/)
  assert.match(await section('Lịch sử lô hàng'), /Chuyển kho/)
  assert.match(await section('Lịch sử lô hàng'), /Điều chỉnh tồn/)
  assert.match(await section('Lịch sử lô hàng'), /Phiếu xuất kho/)
  assert.match(await section('Lịch sử lô hàng'), /saved status reason/)
  assert.match(await text(), /Nhà cung cấp khai báo/)
  assert.match(await text(), /Staff kiểm nhận tại kho/)
  assert.equal(await evaluate(`!!document.querySelector('a[href="/operation/product-batches/${batchId}/edit"]')`), false)
  const receiptLink = `a[href="/operation/goods-receipts/${receiptId}"]`
  assert.ok(await evaluate(`!!document.querySelector(${JSON.stringify(receiptLink)})`))
  await evaluate(`document.querySelector(${JSON.stringify(receiptLink)}).click()`)
  await until(() => evaluate(`location.pathname === '/operation/goods-receipts/${receiptId}'`), 'existing receipt detail route')
  await until(async () => (await text()).includes('CHI TIẾT PHIẾU NHẬP'), 'receipt detail loaded')

  await navigate(emptyId)
  await until(async () => (await section('Kết quả kiểm định QC')).includes('Chưa có phiếu kiểm định QC.'), 'no QC')
  assert.match(await section('Phiếu nhập liên quan'), /Chưa có phiếu nhập/)
  assert.match(await section('Lịch sử lô hàng'), /Chưa có giao dịch kho/)
  assert.equal((await section('Kết quả kiểm định QC')).includes('PASS'), false)
  assert.ok(await evaluate(`!!document.querySelector('a[href="/operation/product-batches/${emptyId}/edit"]')`))

  await navigate(pendingId)
  await until(async () => (await section('Kết quả kiểm định QC')).includes('Phiếu QC mới nhất chưa có kết quả cuối cùng'), 'newest draft supersedes old PASS')
  assert.equal((await section('Kết quả kiểm định QC')).includes('PASS'), false)
  assert.match(await section('Kết quả kiểm định QC'), /Hạng chất lượng đã lưu\s+Chưa ghi nhận/)
  assert.equal(await evaluate(`!!document.querySelector('a[href="/operation/product-batches/${pendingId}/edit"]')`), false)

  await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await navigate(batchId)
  await until(async () => (await section('Phiếu nhập liên quan')).includes('WEB-'), 'mobile sections')
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), true, 'no page overflow at 390px')

  // UI fault-state checks are injected HTTP failures only; saved-data checks above use the real API.
  handlers.set('Fetch.requestPaused', e => {
    void page('Fetch.fulfillRequest', { requestId: e.requestId, responseCode: 500,
      responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
      body: Buffer.from(JSON.stringify({ isSuccess: false, message: 'UC29 isolated read error' })).toString('base64') })
  })
  await page('Fetch.enable', { patterns: [{ urlPattern: `*/api/operation/product-batches/${batchId}` }] })
  await navigate(batchId)
  await until(async () => (await text()).includes('UC29 isolated read error'), 'error state')
  assert.equal(await section('Kết quả kiểm định QC'), '')
  await page('Fetch.disable')
  await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent === 'Thử lại').click()`)
  await until(async () => (await section('Kết quả kiểm định QC')).includes('Đạt (PASS)'), 'read retry')
  await navigate('invalid')
  await until(async () => (await text()).includes('Mã lô hàng không hợp lệ'), 'invalid ID')
  assert.ok(requests.every(r => ['GET', 'OPTIONS'].includes(r.method)), 'viewing must never write')
  assert.deepEqual(errors, [])
  console.log('PASS UC29: Edge + isolated API/SQL saved QC E/PASS, receipt route, status/warehouse history, empty, mobile, GET only; error/retry injected, no production writes.')
  await call('Browser.close')
} finally {
  socket?.close(); edge?.kill(); await vite.close()
  const resolved = path.resolve(temp)
  assert.equal(path.dirname(resolved), path.resolve(tmpdir()))
  assert.ok(path.basename(resolved).startsWith('saw-uc29-browser-'))
  await rm(resolved, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 })
}
