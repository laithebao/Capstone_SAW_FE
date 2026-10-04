// Real headless Edge + Vite, with isolated API/image fixtures. No DB writes or extra npm packages.
// Run: node tests/qr-code-browser.mjs (Windows Edge; override EDGE_PATH if needed).
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { createServer } from 'vite'

const temp = await mkdtemp(path.join(tmpdir(), 'saw-uc55-browser-'))
const downloads = path.join(temp, 'downloads')
await mkdir(downloads)
const vite = await createServer({ server: { host: '127.0.0.1', port: 0 } })
let edge, socket
try {
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  const listener = net.createServer()
  await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve))
  const debugPort = listener.address().port
  await new Promise((resolve) => listener.close(resolve))
  edge = spawn(process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${path.join(temp, 'profile')}`, 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' })
  let version
  for (let i = 0; i < 100; i++) {
    try { version = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json(); break } catch { await delay(100) }
  }
  assert.ok(version, 'Headless Edge did not start')
  socket = new WebSocket(version.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
  let nextId = 0
  const pending = new Map()
  const handlers = new Map()
  const call = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++nextId
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params, sessionId }))
  })
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data)
    if (message.id) {
      const promise = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) promise?.reject(new Error(message.error.message))
      else promise?.resolve(message.result)
    } else handlers.get(message.method)?.(message.params, message.sessionId)
  }
  const { targetId } = await call('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await call('Target.attachToTarget', { targetId, flatten: true })
  const page = (method, params) => call(method, params, sessionId)
  const evaluate = async (expression) => {
    const result = await page('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const until = async (test, description) => {
    for (let i = 0; i < 150; i++) { if (await test()) return; await delay(100) }
    throw new Error(`Timed out: ${description}`)
  }
  await page('Page.enable')
  await call('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true })
  const session = { user: { id: 1, name: 'UC55 Browser Test', email: 'test@example.invalid', role: 'OPERATION_STAFF' },
    accessToken: 'isolated-browser-fixture', refreshToken: 'unused', expiresAt: new Date(Date.now() + 3600000).toISOString(),
    refreshTokenExpiresAt: new Date(Date.now() + 7200000).toISOString() }
  await page('Page.addScriptToEvaluateOnNewDocument', {
    source: `sessionStorage.setItem('saw.auth-session', ${JSON.stringify(JSON.stringify(session))});`,
  })
  const batch = { id: 555, batchCode: 'UC55-TEST', productName: 'Gạo kiểm thử', supplierName: 'Nhà cung cấp kiểm thử',
    cropTypeName: 'Gạo', categoryName: 'Ngũ cốc', growingAreaName: 'Đà Lạt', quantity: 10, unit: 'Bao', weightInKg: 100,
    verifiedQuantity: 10, verifiedWeightInKg: 100, harvestDate: '2026-09-01', createdAt: '2026-09-02T00:00:00Z', updatedAt: null,
    expectedDeliveryDate: null, expiryDate: null, packagingType: 'Bao', packageCount: 10, packageUnitWeightKg: 10,
    verifiedPackagingType: null, verifiedPackageCount: null, verifiedPackageUnitWeightKg: null,
    expectedMinTempC: null, expectedMaxTempC: null, expectedMinHumidityPct: null, expectedMaxHumidityPct: null,
    shelfLifeDaysSnapshot: null, batchStatus: 'APPROVED_FOR_STORAGE', canUpdateReceivingInformation: false,
    receivingUpdateLockReason: 'Lô hàng đã được QC tiếp nhận. Không thể cập nhật thông tin kiểm nhận.' }
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64')
  let state = 'PENDING', apiError = false, qrRequests = 0, hold = true
  const deferred = []
  const imageUrl = 'https://res.cloudinary.com/uc55-test/image/upload/qr.png'
  const traceUrl = 'https://trace.example.invalid/trace/public-token'
  const requests = [], errors = []
  handlers.set('Runtime.exceptionThrown', (event) => errors.push(event.exceptionDetails.text))
  await page('Runtime.enable')
  handlers.set('Fetch.requestPaused', (event) => {
    const reply = async () => {
      const { request, requestId } = event
      requests.push(request)
      const headers = [{ name: 'Access-Control-Allow-Origin', value: origin },
        { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' },
        { name: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS' }]
      if (request.method === 'OPTIONS') return page('Fetch.fulfillRequest', { requestId, responseCode: 204, responseHeaders: headers })
      if (request.url === imageUrl) {
        assert.equal(Object.keys(request.headers).some(key => key.toLowerCase() === 'authorization'), false)
        return page('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [...headers, { name: 'Content-Type', value: 'image/png' }], body: png.toString('base64') })
      }
      const isQr = request.url.includes('/qr-code')
      if (isQr) {
        qrRequests++
        if (hold) await new Promise(resolve => deferred.push(resolve))
      }
      const messages = { PENDING: 'Đang chờ tạo QR.', INELIGIBLE: 'Lô chưa đủ điều kiện tạo QR.', UNAVAILABLE: 'QR đã bị vô hiệu hóa.', READY: 'QR đã sẵn sàng.' }
      const data = isQr ? { productBatchId: 555, batchCode: batch.batchCode, status: state, message: messages[state],
        publicToken: state === 'READY' ? 'public-token' : null, traceabilityUrl: state === 'READY' ? traceUrl : null,
        qrImageUrl: state === 'READY' ? imageUrl : null, generatedAt: state === 'READY' ? '2026-10-02T00:00:00Z' : null } : batch
      await page('Fetch.fulfillRequest', { requestId, responseCode: isQr && apiError ? 500 : 200,
        responseHeaders: [...headers, { name: 'Content-Type', value: 'application/json' }],
        body: Buffer.from(JSON.stringify({ isSuccess: !apiError, data, message: apiError ? 'QR API test error' : 'OK' })).toString('base64') })
    }
    void reply().catch(error => errors.push(error.message))
  })
  await page('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/*' }, { urlPattern: 'https://res.cloudinary.com/uc55-test/*' }] })
  await page('Page.navigate', { url: `${origin}/operation/product-batches/555` })
  const text = () => evaluate(`document.querySelector('section[aria-label="Mã QR truy xuất lô hàng"]')?.innerText || ''`)
  await until(async () => (await text()).includes('Đang tải thông tin QR'), 'loading state')
  hold = false; deferred.splice(0).forEach(resolve => resolve())
  await until(async () => (await text()).includes('Đang chờ tạo QR'), 'pending state')
  const refresh = () => evaluate(`document.querySelector('button[aria-label="Tải lại thông tin QR"]').click()`)
  state = 'READY'; await refresh()
  await until(async () => (await text()).includes('Tải PNG'), 'ready state')
  await until(() => evaluate(`document.querySelector('img[alt="Mã QR lô UC55-TEST"]')?.naturalWidth > 0`), 'image load')
  assert.equal(await evaluate(`document.querySelector('a[href="${traceUrl}"]')?.target`), '_blank')
  await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent === 'Tải PNG').click()`)
  let downloaded
  await until(async () => { try { downloaded = await readFile(path.join(downloads, 'QR-UC55-TEST.png')); return true } catch { return false } }, 'PNG downloaded from a cross-origin response')
  assert.deepEqual(downloaded, png)
  for (const status of ['INELIGIBLE', 'UNAVAILABLE']) {
    state = status; await refresh()
    await until(async () => (await text()).includes(status === 'INELIGIBLE' ? 'chưa đủ điều kiện' : 'vô hiệu hóa'), status)
    assert.equal((await text()).includes('Tải PNG'), false)
  }
  apiError = true; await refresh()
  await until(async () => (await text()).includes('QR API test error'), 'API error')
  apiError = false; state = 'READY'; await refresh()
  await until(async () => (await text()).includes('Tải PNG'), 'retry success')
  assert.ok(qrRequests >= 6)
  assert.ok(requests.every(request => ['GET', 'OPTIONS'].includes(request.method)), 'GET UI must never generate/write')
  assert.deepEqual(errors, [])
  console.log('PASS: real Edge loading/pending/ready/ineligible/unavailable/error/retry + cross-origin PNG download; mocked API/storage, no DB changes.')
  await call('Browser.close')
} finally {
  socket?.close()
  edge?.kill()
  await vite.close()
  // Delete only the unique test directory created by this script under the OS temp root.
  const resolved = path.resolve(temp)
  assert.equal(path.dirname(resolved), path.resolve(tmpdir()))
  assert.ok(path.basename(resolved).startsWith('saw-uc55-browser-'))
  await rm(resolved, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 })
}
