// Real headless Edge + Vite, with isolated API/image fixtures. No DB writes or extra npm packages.
// Run: node tests/traceability-browser.mjs (Windows Edge; override EDGE_PATH if needed).
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { createServer } from 'vite'

const temp = await mkdtemp(path.join(tmpdir(), 'saw-uc09-browser-'))
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
  await page('Runtime.enable')
  await page('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true })
  if (process.env.TRACEABILITY_LIVE_URL) {
    // Explicit opt-in: read an existing public QR with the real API. Never write business data.
    const liveUrl = new URL(process.env.TRACEABILITY_LIVE_URL)
    assert.match(liveUrl.pathname, /^\/trace\/[a-f0-9]{64}$/)
    const response = await fetch(new URL(`/api/public/traceability/${liveUrl.pathname.split('/').pop()}`, liveUrl))
    assert.equal(response.status, 200)
    const { data } = await response.json()
    const errors = [], requests = []
    handlers.set('Runtime.exceptionThrown', e => errors.push(e.exceptionDetails.text))
    handlers.set('Network.requestWillBeSent', e => { if (e.request.url.includes('/api/')) requests.push(e.request) })
    await page('Network.enable')
    await page('Page.navigate', { url: liveUrl.href })
    await until(() => evaluate(`document.body.innerText.includes(${JSON.stringify(data.batchCode)})`), 'real public batch')
    assert.equal(await evaluate('sessionStorage.length'), 0)
    await evaluate(`[...document.querySelectorAll('summary')].find(s=>s.textContent.includes('Xem kết quả từng tiêu chí')).click()`)
    for (const c of data.quality.criteria) assert.ok(await evaluate(`document.body.innerText.includes(${JSON.stringify(c.name)})`))
    assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true)
    await mkdir('docs/screenshots', { recursive: true })
    const metrics = await page('Page.getLayoutMetrics')
    const shot = await page('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: 375, height: metrics.cssContentSize.height, scale: 1 } })
    await writeFile('docs/screenshots/uc09-mobile.png', Buffer.from(shot.data, 'base64'))
    await page('Emulation.setDeviceMetricsOverride', { width: 1365, height: 900, deviceScaleFactor: 1, mobile: false })
    await delay(200)
    assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true)
    const desktop = await page('Page.captureScreenshot', { format: 'png' })
    await writeFile('docs/screenshots/uc09-desktop.png', Buffer.from(desktop.data, 'base64'))
    assert.ok(requests.length > 0)
    assert.ok(requests.every(r => r.method === 'GET' && !Object.keys(r.headers).some(k => k.toLowerCase() === 'authorization')))
    assert.deepEqual(errors, [])
    console.log(`PASS: real Guest API/browser for ${data.batchCode}; mobile/desktop screenshots saved; read-only, no phone scan claimed.`)
  } else {
  const token = 'a'.repeat(64), nextToken = 'b'.repeat(64)
  const fixture = { batchCode: 'PUBLIC-BATCH', productName: 'Gạo truy xuất', cropTypeName: 'Gạo', supplierName: 'Nhà cung cấp công khai',
    origin: { areaName: 'Đà Lạt', province: 'Lâm Đồng', region: 'Tây Nguyên' }, harvestDate: '2026-09-01', expiryDate: null,
    quality: { grade: 'B', result: 'PASS', startedAt: '2026-09-03T09:00:00Z', completedAt: '2026-09-03T10:00:00Z',
      standard: { code: 'STD-TEST', name: 'Tiêu chuẩn gạo', version: 1 }, sampling: { ratioPercent: 10, sampleWeightKg: 2 },
      gradeExplanation: 'Hạng chung theo kết quả đã lưu.', determiningCriteria: ['Độ ẩm'],
      criteria: [
        { code: 'N', name: 'Độ ẩm', groupLabel: 'Kiểm nghiệm', dataType: 'NUMBER', unit: '%', numericValue: 12.5, textValue: null, booleanValue: null, hasResult: true, evaluatedGrade: 'B', isPassed: true, assessmentBasis: 'Các khoảng bao gồm cả cận dưới và cận trên.', rules: [{ grade: 'B', minValue: 10, maxValue: 15, requiredTextValue: null, isFailRule: false }] },
        { code: 'T', name: 'Màu sắc', groupLabel: 'Cảm quan', dataType: 'TEXT', unit: null, numericValue: null, textValue: 'Trắng', booleanValue: null, hasResult: true, evaluatedGrade: 'A', isPassed: true, assessmentBasis: 'Đối chiếu nội dung.', rules: [{ grade: 'A', minValue: null, maxValue: null, requiredTextValue: 'Trắng', isFailRule: false }] },
        { code: 'P', name: 'Kiểm tra bổ sung', groupLabel: 'Kiểm nghiệm', dataType: 'BOOLEAN', unit: null, numericValue: null, textValue: null, booleanValue: null, hasResult: false, evaluatedGrade: null, isPassed: null, assessmentBasis: 'Chưa có kết quả ghi nhận.', rules: [] }
      ] },
    milestones: [{ type: 'QC_COMPLETED', label: 'Hoàn tất kiểm định chất lượng', occurredAt: '2026-09-03T10:00:00' },
      { type: 'RECEIVED', label: 'Đã nhập kho', occurredAt: '2026-09-04T10:00:00' }] }
  let responseCode = 200, hold = true, offline = false
  const requests = [], deferred = [], errors = []
  handlers.set('Runtime.exceptionThrown', event => errors.push(event.exceptionDetails.text))
  handlers.set('Fetch.requestPaused', event => {
    const respond = async () => {
      requests.push(event.request)
      assert.equal(event.request.method, 'GET')
      assert.equal(Object.keys(event.request.headers).some(key => key.toLowerCase() === 'authorization'), false)
      if (offline) return page('Fetch.failRequest', { requestId: event.requestId, errorReason: 'InternetDisconnected' })
      const isNext = event.request.url.endsWith(nextToken)
      const data = isNext ? { ...fixture, batchCode: 'NEXT-BATCH' } : fixture
      return page('Fetch.fulfillRequest', { requestId: event.requestId, responseCode,
        responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
        body: Buffer.from(JSON.stringify({ statusCode: responseCode, message: 'PRIVATE_ERROR_MUST_NOT_RENDER', data: responseCode === 200 ? data : null })).toString('base64') })
    }
    if (hold) deferred.push(respond)
    else respond().catch(error => errors.push(error.message))
  })
  await page('Fetch.enable', { patterns: [{ urlPattern: '*api/public/traceability/*' }] })
  const text = () => evaluate('document.body.innerText')
  const navigate = tokenValue => page('Page.navigate', { url: `${origin}/trace/${tokenValue}` })
  const release = async () => { hold = false; await Promise.all(deferred.splice(0).map(respond => respond())) }
  await navigate(token)
  await until(async () => (await text()).includes('Đang tải thông tin'), 'guest loading')
  await until(() => deferred.length > 0, 'request intercepted')
  await release()
  await until(async () => (await text()).includes('PUBLIC-BATCH'), 'guest traceability')
  assert.equal(await evaluate('location.pathname'), `/trace/${token}`)
  assert.ok((await text()).includes('Đà Lạt'))
  await evaluate(`[...document.querySelectorAll('summary')].find(s=>s.textContent.includes('Xem kết quả từng tiêu chí')).click()`)
  assert.ok((await text()).includes('Chưa có kết quả'))
  assert.ok((await text()).includes('12,5 %'))
  assert.ok((await text()).includes('Trắng'))
  await evaluate(`[...document.querySelectorAll('summary')].find(s=>s.textContent.includes('Ngưỡng và yêu cầu')).click()`)
  assert.ok((await text()).includes('≥ 10 và ≤ 15 %'))
  for (const removed of ['Kiểm nhận tại kho', 'Thông tin đóng gói', 'Khu vực lưu trữ', 'APPROVED_FOR_STORAGE']) assert.equal((await text()).includes(removed), false)
  assert.equal((await text()).includes('Đăng nhập'), false)
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true, 'mobile overflow')
  // Token changes use SPA navigation, so old result state must disappear before the next response.
  hold = true
  await evaluate(`history.pushState({}, '', '/trace/${nextToken}'); dispatchEvent(new PopStateEvent('popstate'))`)
  await until(async () => (await text()).includes('Đang tải thông tin'), 'new token loading')
  assert.equal((await text()).includes('PUBLIC-BATCH'), false)
  await until(() => deferred.length > 0, 'next token request')
  await release()
  await until(async () => (await text()).includes('NEXT-BATCH'), 'next token result')
  // Even with a persisted authenticated session, this client must never send its token.
  const session = { user: { id: 1, name: 'Test', email: 'test@example.invalid', role: 'SUPPLIER' }, accessToken: 'private-token',
    refreshToken: 'unused', expiresAt: new Date(Date.now() + 3600000).toISOString(), refreshTokenExpiresAt: new Date(Date.now() + 7200000).toISOString() }
  await evaluate(`sessionStorage.setItem('saw.auth-session', ${JSON.stringify(JSON.stringify(session))})`)
  await navigate(token)
  await until(async () => (await text()).includes('PUBLIC-BATCH'), 'authenticated public result')
  for (const [status, message] of [[404, 'Batch information not found.'], [410, 'This batch is no longer available.'],
    [500, 'Không tải được thông tin'], [401, 'Không tải được thông tin'], [403, 'Không tải được thông tin']]) {
    responseCode = status; await navigate(token)
    await until(async () => (await text()).includes(message), `HTTP ${status} state`)
    assert.equal(await evaluate('location.pathname'), `/trace/${token}`, 'no auth redirect')
    assert.equal((await text()).includes('PRIVATE_ERROR'), false)
    assert.equal((await text()).includes('PUBLIC-BATCH'), false)
  }
  offline = true; await navigate(token)
  await until(async () => (await text()).includes('Không tải được thông tin'), 'network error')
  offline = false; responseCode = 200
  await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('Thử lại')).click()`)
  await until(async () => (await text()).includes('PUBLIC-BATCH'), 'retry success')
  const beforeInvalid = requests.length
  await navigate('bad-token')
  await until(async () => (await text()).includes('Batch information not found.'), 'invalid token state')
  assert.equal(requests.length, beforeInvalid, 'invalid token should not call API')
  session.user.role = 'OPERATION_STAFF'
  await evaluate(`sessionStorage.setItem('saw.auth-session', ${JSON.stringify(JSON.stringify(session))})`)
  await page('Page.navigate', { url: `${origin}/operation` })
  await until(async () => (await text()).includes('Công việc vận hành'), 'Operation dashboard')
  assert.equal(await evaluate(`document.querySelector('#btn-primary-action') === null`), true, 'Operation primary create receipt action hidden')
  assert.deepEqual(errors, [])
  console.log('PASS: real Edge guest/authenticated public UI, mobile layout, loading, 404/410/500/401/403/network retry, token switch, no auth headers; mocked API, no DB writes.')
  }
  await call('Browser.close')
} finally {
  socket?.close()
  edge?.kill()
  await vite.close()
  // Delete only the unique test directory created by this script under the OS temp root.
  const resolved = path.resolve(temp)
  assert.equal(path.dirname(resolved), path.resolve(tmpdir()))
  assert.ok(path.basename(resolved).startsWith('saw-uc09-browser-'))
  await rm(resolved, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 })
}
