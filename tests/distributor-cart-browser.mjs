// Cart regression with real Edge/Vite and deliberately delayed mock API. No real orders or DB writes.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { createServer } from 'vite'

const evidence = path.resolve(process.env.SAW_TEST_EVIDENCE_DIRECTORY || 'D:/SAWAuditArtifacts/distributor-cart-20261128')
const temp = await mkdtemp(path.join(tmpdir(), 'saw-distributor-cart-'))
const vite = await createServer({ define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api') }, server: { host: '127.0.0.1', port: 0 } })
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
  const screenshot = async name => { const r = await page('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(path.join(evidence, name), Buffer.from(r.data, 'base64')) }
  const authenticate = async role => {
    if (bootstrap) await page('Page.removeScriptToEvaluateOnNewDocument', { identifier: bootstrap })
    const session = { user: { id: 1, name: 'Nhân viên kiểm thử', email: 'ui@test.invalid', role }, accessToken: 'ui-fixture-token', refreshToken: 'unused', expiresAt: new Date(Date.now() + 3600000).toISOString(), refreshTokenExpiresAt: new Date(Date.now() + 7200000).toISOString() }
    bootstrap = (await page('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('saw.auth-session', ${JSON.stringify(JSON.stringify(session))})` })).identifier
  }
  await page('Page.enable'); await page('Runtime.enable')
  handlers.set('Runtime.exceptionThrown', e => errors.push(e.exceptionDetails.text))
  const lots = [
    { batchId: 1, batchCode: 'CART-A', productName: 'Gạo ST25', weightKg: 1000, wholeLotPrice: 5000000 },
    { batchId: 2, batchCode: 'CART-B', productName: 'Xoài Cát', weightKg: 500, wholeLotPrice: 3000000 },
    { batchId: 3, batchCode: 'CART-C', productName: 'Khoai tây', weightKg: 200, wholeLotPrice: 1000000 },
  ].map(lot => ({ ...lot, cropName: lot.productName, supplierName: 'Nhà cung cấp kiểm thử', origin: 'Đà Lạt', qualityGrade: 'A', harvestDate: '2026-11-27', expiryDate: '2027-01-01' }))
  let complete = true
  let profileChecks = 0
  handlers.set('Fetch.requestPaused', e => {
    void (async () => {
      const url = new URL(e.request.url), method = e.request.method
      requests.push({ path: url.pathname, method })
      let data = []
      if (url.pathname === '/api/user-profiles/me') {
        profileChecks++
        await delay(80)
        data = { accountId: 1, username: 'cart-test', email: 'cart@test.invalid', fullName: 'Nhà phân phối kiểm thử', phoneNumber: '0901234567', avatarUrl: null, roleCode: 'DISTRIBUTOR', isProfileComplete: complete, distributor: { distributorId: 1, distributorCode: 'DIST-TEST', distributorName: 'Công ty kiểm thử', taxCode: '1234567890', contactPerson: 'Người kiểm thử', phoneNumber: '0901234567', email: 'cart@test.invalid', address: 'Địa chỉ kiểm thử' } }
      } else if (url.pathname === '/api/distributor/orders/catalog') data = { items: url.searchParams.get('page') === '2' ? [lots[2]] : lots.slice(0, 2), totalCount: 11, page: Number(url.searchParams.get('page') || 1), pageSize: 10 }
      else if (/\/catalog\/\d+$/.test(url.pathname)) data = { ...lots.find(lot => lot.batchId === Number(url.pathname.split('/').at(-1))), categoryName: 'Nông sản', province: 'Lâm Đồng', district: '', ward: '', batchStatus: 'IN_STOCK', canPurchase: true, packagingType: 'Bao', packageCount: 10, packageUnitWeightKg: 50, minTempC: null, maxTempC: null, minHumidityPct: null, maxHumidityPct: null, qcResult: 'PASS', qcCompletedAt: '2026-11-27T01:00:00Z', inspectionStandardName: 'Tiêu chuẩn kiểm thử', inspectionStandardVersionNo: 1 }
      else if (url.pathname === '/api/notifications') data = { items: [], unreadCount: 0 }
      else if (url.pathname.endsWith('/popup/initialize')) data = { baselineIds: [] }
      await page('Fetch.fulfillRequest', { requestId: e.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json; charset=utf-8' }], body: Buffer.from(JSON.stringify({ isSuccess: true, statusCode: 200, data })).toString('base64') })
    })().catch(error => {
      // Route/profile changes abort pending requests before the delayed mock reply.
      if (!error.message.includes('Invalid InterceptionId')) errors.push(error.message)
    })
  })
  await page('Fetch.enable', { patterns: [{ urlPattern: '*/api/*' }] })
  await page('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await authenticate('DISTRIBUTOR')
  await page('Page.navigate', { url: origin + '/distributor/catalog' })
  const choose = async code => {
    await until(() => evaluate(`!![...document.querySelectorAll('.dist-market-card')].find(el => el.innerText.includes(${JSON.stringify(code)}))`), code)
    await evaluate(`[...document.querySelectorAll('.dist-market-card')].find(el => el.innerText.includes(${JSON.stringify(code)})).querySelector('.dist-market-actions button').click()`)
  }
  const openCart = () => evaluate("document.querySelector('.dist-selection-bar a').click()")
  const waitCart = async count => {
    await until(() => evaluate("!!document.querySelector('.dist-cart-empty, .dist-cart-item')"), 'cart loaded')
    assert.equal(await evaluate("document.querySelectorAll('.dist-cart-item').length"), count, 'all selected lots survive route/profile revalidation')
  }
  await choose('CART-A'); await choose('CART-B')
  await until(() => evaluate("document.querySelector('.header-cart-count')?.textContent === '2'"), 'header count')
  await openCart(); await waitCart(2)
  assert.match(await text(), /8\.000\.000/)
  checks.push('two selected lots and their total survive navigation to cart')
  await evaluate("document.querySelector('.dist-cart-heading a').click()")
  await until(() => evaluate("document.querySelectorAll('.dist-market-actions button[aria-pressed=true]').length === 2"), 'catalog selections retained')
  await click('Sau'); await choose('CART-C')
  await openCart(); await waitCart(3)
  await evaluate("document.querySelector('button[aria-label=\"Bỏ CART-A khỏi giỏ\"]').click()")
  await until(() => evaluate("document.querySelectorAll('.dist-cart-item').length === 2 && document.querySelector('.header-cart-count').textContent === '2'"), 'remove updates shared cart')
  const before = profileChecks
  await evaluate("window.dispatchEvent(new Event('saw:profile-updated'))")
  await until(() => profileChecks > before, 'profile refreshed')
  await waitCart(2)
  await click('Tiến hành đặt hàng')
  await until(() => evaluate("location.pathname === '/distributor/orders/new' && document.body.innerText.includes('CART-B') && document.body.innerText.includes('CART-C')"), 'checkout receives both lots')
  assert.equal(requests.filter(r => r.path === '/api/distributor/orders' && r.method === 'POST').length, 0)
  checks.push('cross-page selection, remove, profile refresh and checkout preserve exact lots without placing an order')
  await evaluate("document.querySelector('a.header-cart').click()")
  await waitCart(2); await screenshot('cart-desktop.png')
  await evaluate("document.querySelector('.dist-cart-heading a').click()")
  await until(() => evaluate("!!document.querySelector('.dist-selection-bar a') && !document.querySelector('.dist-selection-bar').inert"), 'selection bar ready')
  const desktop = await evaluate("(() => { const bar=document.querySelector('.dist-selection-bar'), button=bar.querySelector('a'); return {height:bar.getBoundingClientRect().height, buttonHeight:button.getBoundingClientRect().height} })()")
  assert.ok(desktop.height >= 84 && desktop.buttonHeight >= 48, JSON.stringify(desktop))
  await screenshot('selection-desktop.png')
  await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  assert.ok(await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), 'mobile page fits viewport')
  const mobile = await evaluate("(() => { const bar=document.querySelector('.dist-selection-bar'), button=bar.querySelector('a'); return {width:bar.getBoundingClientRect().width, buttonWidth:button.getBoundingClientRect().width, buttonHeight:button.getBoundingClientRect().height} })()")
  assert.ok(mobile.width <= 390 && mobile.buttonWidth >= 300 && mobile.buttonHeight >= 48, JSON.stringify(mobile))
  assert.ok(await evaluate("document.querySelector('.agri-chat-fab').getBoundingClientRect().bottom < document.querySelector('.dist-selection-bar').getBoundingClientRect().top"), 'AI launcher does not cover the cart action')
  await screenshot('selection-mobile.png')
  complete = false
  await page('Page.reload')
  await until(() => evaluate("location.pathname === '/account/profile' && document.body.innerText.includes('Vui lòng hoàn thiện hồ sơ')"), 'profile guard still enforced on refresh')
  assert.equal(await evaluate("!!document.querySelector('.dist-market-card')"), false)
  checks.push('larger desktop/mobile bar and profile completion guard remain correct')
  assert.deepEqual(errors, [])
  await writeFile(path.join(evidence, 'results.json'), JSON.stringify({ result: 'Passed', mode: 'Edge/Vite with delayed mocked API; no real orders or DB writes', checks }, null, 2))
  console.log(JSON.stringify({ result: 'Passed', checks, evidence }))
  await call('Browser.close')
} finally {
  socket?.close(); edge?.kill(); await vite.close()
  assert.equal(path.dirname(path.resolve(temp)), path.resolve(tmpdir())); assert.ok(path.basename(temp).startsWith('saw-distributor-cart-'))
  await rm(temp, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 })
}
