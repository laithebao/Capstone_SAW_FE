// Focused browser UI checks using mocked APIs; real SQL/API checks run separately.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { createServer } from 'vite'

const evidence = path.resolve(process.env.SAW_TEST_EVIDENCE_DIRECTORY || '../Capstone_SAW_BE/test-results/bigupdate-ui')
const temp = await mkdtemp(path.join(tmpdir(), 'saw-bigupdate-ui-'))
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
  const screenshot = async name => { const r = await page('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); await writeFile(path.join(evidence, name), Buffer.from(r.data, 'base64')) }
  const authenticate = async role => {
    if (bootstrap) await page('Page.removeScriptToEvaluateOnNewDocument', { identifier: bootstrap })
    const session = { user: { id: 1, name: 'Nhân viên kiểm thử', email: 'ui@test.invalid', role }, accessToken: 'ui-fixture-token', refreshToken: 'unused', expiresAt: new Date(Date.now() + 3600000).toISOString(), refreshTokenExpiresAt: new Date(Date.now() + 7200000).toISOString() }
    bootstrap = (await page('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('saw.auth-session', ${JSON.stringify(JSON.stringify(session))})` })).identifier
  }
  await page('Page.enable'); await page('Runtime.enable')
  handlers.set('Runtime.exceptionThrown', e => errors.push(e.exceptionDetails.exception?.description ?? e.exceptionDetails.text))
  const categories = [
    { categoryId: 1, parentId: null, code: 'TC', name: 'Trái cây', isActive: true, sortOrder: 0 },
    { categoryId: 2, parentId: 1, code: 'XOAI', name: 'Xoài', isActive: true, sortOrder: 0 },
  ]
  const crop = { id: 1, code: 'TC_XOAI_DALAT_25112026', name: 'Xoài Đà Lạt', categoryId: 2, parentCategoryId: 1, childCategoryName: 'Xoài', categoryName: 'Trái cây', isActive: true, defaultUnit: 'kg', createdAt: '2026-11-25T01:00:00Z' }
  let popupPending = [], currentRole = 'ADMINISTRATOR', savedContract
  const profile = { supplierId: 1, accountId: 1, supplierCode: 'SUP_TEST', supplierName: 'Nhà cung cấp thử nghiệm', taxCode: '0123456789', address: 'Địa chỉ khai báo', legalRepresentative: 'Đại diện đã khai báo', contactPerson: 'Người liên hệ', phoneNumber: '0901234567', email: 'test@example.invalid', profileStatus: 'ACTIVE', growingAreas: [{ growingAreaId: 1, areaName: 'Vùng trồng nhập tay', areaInHectares: 12 }], cropTypes: [{ cropTypeId: 1, cropCode: crop.code, cropName: crop.name, categoryName: 'Trái cây' }], certifications: [], documents: [] }
  handlers.set('Fetch.requestPaused', e => {
    const url = new URL(e.request.url), method = e.request.method
    let payload = null; try { payload = JSON.parse(e.request.postData || 'null') } catch {}
    requests.push({ path: url.pathname, method, payload, raw: e.request.postData })
    let data = [], raw = false
    if (url.pathname.startsWith('/api/categories')) data = categories
    else if (url.pathname === '/api/crop-types') data = { items: [crop], totalCount: 1, page: 1, pageSize: 100 }
    else if (url.pathname === '/api/notifications') data = { items: [], unreadCount: 0 }
    else if (url.pathname === '/api/notifications/popup/initialize') { data = { baselineIds: popupPending.map(x => x.id) } }
    else if (url.pathname === '/api/notifications/popup/acknowledge') { popupPending = popupPending.filter(x => !payload?.includes(x.id)); data = {} }
    else if (url.pathname === '/api/notifications/popup/poll') data = popupPending.filter(x => !(payload?.baselineIds ?? []).includes(x.id)).slice(0, 20)
    else if (url.pathname === '/api/notifications/popup') data = popupPending.slice(0, 20)
    else if (url.pathname === '/api/supply-contracts/options') data = { suppliers: [{ id: 1, code: 'SUP_TEST', name: profile.supplierName, cropTypeIds: [1] }], cropTypes: [{ id: 1, code: crop.code, name: crop.name, categoryName: 'Trái cây' }] }
    else if (url.pathname === '/api/supply-contracts/preview') data = { content: `HỢP ĐỒNG THU MUA NÔNG SẢN\nBÊN A: SMART AGRI-WAREHOUSE (SAW)\nBÊN B: ${payload?.supplierId ? profile.supplierName : 'Chưa cung cấp'}\n${crop.code}\nĐơn giá ${payload?.unitPriceVndPerKg ?? 0}` }
    else if (url.pathname === '/api/supply-contracts' && method === 'POST') { savedContract = { ...payload, id: 1, contractCode: 'HD_TEST', documentContent: 'Snapshot', status: 'PENDING_SUPPLIER', supplierName: profile.supplierName, cropTypeName: crop.name, warehouseManagerName: 'Quản lý thử nghiệm', revision: 1, createdAt: new Date().toISOString(), isEffective: false }; data = savedContract }
    else if (url.pathname === '/api/supply-contracts/1') data = savedContract
    else if (url.pathname === '/api/supply-contracts') data = { items: savedContract ? [savedContract] : [], totalCount: savedContract ? 1 : 0, page: 1, pageSize: 20 }
    else if (url.pathname === '/api/suppliers/me/profile') { data = profile; raw = true }
    else if (url.pathname === '/api/GrowingAreas') { data = profile.growingAreas; raw = true }
    else if (url.pathname.includes('/me')) data = { id: 1, name: 'Người kiểm thử', fullName: 'Người kiểm thử', email: 'test@example.invalid', role: currentRole }
    void page('Fetch.fulfillRequest', { requestId: e.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json; charset=utf-8' }], body: Buffer.from(JSON.stringify(raw ? data : { statusCode: 200, isSuccess: true, message: '', data })).toString('base64') }).catch(err => errors.push(err.message))
  })
  await page('Fetch.enable', { patterns: [{ urlPattern: '*/api/*' }] })
  await page('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await authenticate('ADMINISTRATOR')
  await page('Page.navigate', { url: origin + '/admin/crop-types/new' })
  await until(() => evaluate('!!document.querySelector("select option[value=\\\"1\\\"]") && !document.querySelector("select").disabled'), 'crop categories loaded')
  await fill('select', '1'); await fill('select:nth-of-type(1)', '1')
  await until(() => evaluate('!!document.querySelectorAll("select")[1]?.querySelector("option[value=\\\"2\\\"]")'), 'child options loaded')
  await evaluate(`(() => { const select = document.querySelectorAll('select')[1]; select.value='2'; select.dispatchEvent(new Event('change',{bubbles:true})); })()`)
  await fill('input[maxlength="150"]', 'Xoài Đà Lạt')
  await until(() => evaluate('document.querySelector("input[maxlength=\\\"50\\\"]").value.startsWith("TC_XOAI_DALAT_")'), 'automatic crop code')
  assert.equal((await text()).includes('Tên khoa học'), false)
  await fill('input[maxlength="50"]', 'MANUAL_CODE')
  await fill('input[maxlength="150"]', 'Xoài Cát Hòa Lộc')
  assert.equal(await evaluate('document.querySelector("input[maxlength=\\\"50\\\"]").value'), 'MANUAL_CODE')
  assert.equal((await text()).includes('Tạo lại mã tự động'), false)
  assert.equal(await evaluate('!!document.querySelector("a[href=\\\"/admin/categories\\\"]")'), true)
  await screenshot('crop-type.png'); checks.push('Crop form: category cascade, Unicode auto-code, dirty code, no regeneration link and sidebar')
  await delay(250)
  popupPending = Array.from({ length: 4 }, (_, i) => ({ id: 100 + i, type: 'TEST', title: 'Popup thử ' + i, message: 'Thông báo mới', isRead: false, createdAt: new Date().toISOString() }))
  await evaluate('window.dispatchEvent(new Event("focus"))')
  await until(() => evaluate('document.querySelectorAll("button[aria-label=\\\"Đóng thông báo\\\"]").length === 3'), 'three popups')
  await until(() => evaluate('document.body.innerText.includes("Popup thử 3")'), 'queued fourth popup')
  assert.equal(requests.some(x => /\/read(?:-all)?$/.test(x.path)), false)
  checks.push('Popup: max three, fourth queued, auto-hide does not mark read')
  currentRole = 'WAREHOUSE_MANAGER'; await authenticate(currentRole)
  await page('Page.navigate', { url: origin + '/warehouse-manager/contracts' })
  await until(() => evaluate('document.body.innerText.includes("Tạo và gửi hợp đồng")'), 'contracts')
  await click('Tạo và gửi hợp đồng')
  await until(() => evaluate('!!document.querySelector("input[aria-label=\\\"Nhà cung cấp\\\"]")'), 'contract form')
  assert.equal(await evaluate('document.querySelector("input[aria-label=\\\"Loại nông sản\\\"]").disabled'), true)
  await fill('input[aria-label="Nhà cung cấp"]', 'SUP_TEST'); await evaluate('document.querySelector("input[aria-label=\\\"Nhà cung cấp\\\"]").focus()')
  await until(() => evaluate('!!document.querySelector("[role=option]")'), 'supplier option'); await evaluate('document.querySelector("[role=option]").click()')
  await fill('input[aria-label="Loại nông sản"]', 'XOAI'); await evaluate('document.querySelector("input[aria-label=\\\"Loại nông sản\\\"]").focus()')
  await until(() => evaluate('!!document.querySelector("[role=option]")'), 'crop option'); await evaluate('document.querySelector("[role=option]").click()')
  await fill('input[aria-label="Đơn giá thu mua"]', '1000,10')
  await fill('input[type=number]', '500')
  assert.equal(await evaluate('document.querySelector("input[aria-label=\\\"Đơn giá thu mua\\\"]").value'), '1.000,10')
  assert.equal(await evaluate('document.querySelectorAll("input[type=file]").length'), 0)
  await until(() => evaluate('document.querySelector("section[aria-label=\\\"Xem trước hợp đồng\\\"]").innerText.includes("1000.1")'), 'live preview')
  await screenshot('contract.png')
  await click('Tạo và gửi nhà cung cấp')
  await until(() => requests.some(x => x.path === '/api/supply-contracts' && x.method === 'POST'), 'contract submit')
  assert.match(requests.find(x => x.path === '/api/supply-contracts' && x.method === 'POST').raw, /"unitPriceVndPerKg":1000\.10/)
  checks.push('Contract: searchable supplier/crop, supplier gating, live preview, no upload, exact numeric price')
  currentRole = 'SUPPLIER'; await authenticate(currentRole)
  await page('Page.navigate', { url: origin + '/supplier/profile/edit' })
  await until(() => evaluate('document.querySelector("input[placeholder=\\\"Nhập tên vùng trồng\\\"]")?.value === "Vùng trồng nhập tay"'), 'supplier hand-entered area')
  assert.equal(await evaluate('document.querySelectorAll("select[aria-label=\\\"Category cha\\\"]").length'), 1)
  assert.equal(await evaluate('[...document.querySelectorAll("aside a")].some(x => ["Chứng nhận","Thông báo"].includes(x.textContent.trim()))'), false)
  await screenshot('supplier-profile.png'); checks.push('Supplier: stored text area, category selector, sidebar and certificate functionality retained')
  assert.deepEqual(errors, [])
  await writeFile(path.join(evidence, 'results.json'), JSON.stringify({ verification: 'mocked-api browser UI', checks, errors }, null, 2))
  console.log(JSON.stringify({ passed: checks.length, verification: 'mocked-api browser UI', evidence }))
} finally {
  try { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ id: 99999, method: 'Browser.close' })) } catch {}
  socket?.close(); await delay(500); edge?.kill(); await vite.close()
  if (path.resolve(temp).startsWith(path.resolve(tmpdir()) + path.sep + 'saw-bigupdate-ui-')) await rm(temp, { recursive: true, force: true, maxRetries: 12, retryDelay: 250 }).catch(() => {})
}
