// Admin, Supplier and Warehouse Manager UI regression. APIs are mocked; no real business data is changed.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { createServer } from 'vite'

const evidence = path.resolve(process.env.SAW_TEST_EVIDENCE_DIRECTORY || 'D:/SAWAuditArtifacts/role-ui-20261128')
const temp = await mkdtemp(path.join(tmpdir(), 'saw-role-ui-'))
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
  handlers.set('Runtime.exceptionThrown', e => errors.push(e.exceptionDetails.exception?.description ?? e.exceptionDetails.text))
  const issues = [], pages = []
  const paged = items => ({ items, totalCount: items.length, page: 1, pageSize: 20 })
  const categories = [{ categoryId: 1, parentId: null, code: 'TC', name: 'Trái cây', isActive: true, sortOrder: 0 }, { categoryId: 2, parentId: 1, code: 'XOAI', name: 'Xoài', isActive: true, sortOrder: 0 }]
  const crop = { id: 1, code: 'TC_XOAI_CATHOALOC_28112026', name: 'Xoài Cát Hòa Lộc', categoryId: 2, parentCategoryId: 1, childCategoryName: 'Xoài', categoryName: 'Trái cây', isActive: true, defaultUnit: 'kg', createdAt: '2026-11-28T01:00:00Z' }
  const profile = { supplierId: 1, accountId: 1, supplierCode: 'SUP_UI', supplierName: 'Hợp tác xã Nông sản Cát Hòa Lộc', taxCode: '0123456789', address: 'Địa chỉ vùng trồng và cơ sở cung cấp nông sản kiểm thử', legalRepresentative: 'Đại diện kiểm thử', contactPerson: 'Người liên hệ kiểm thử', phoneNumber: '0901234567', email: 'ui@example.invalid', profileStatus: 'ACTIVE', growingAreas: [{ growingAreaId: 1, areaName: 'Vùng trồng Cát Hòa Lộc', areaInHectares: 12 }], cropTypes: [{ cropTypeId: 1, cropCode: crop.code, cropName: crop.name, categoryName: 'Trái cây' }], certifications: [], documents: [] }
  const documentText = ['CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', 'Độc lập - Tự do - Hạnh phúc', '', 'HỢP ĐỒNG THU MUA NÔNG SẢN', 'Số: HD_UI · Phiên bản: 1', 'Ngày gửi: 28/11/2026 (giờ Việt Nam)', '', 'BÊN A: SMART AGRI-WAREHOUSE (SAW)', 'Địa chỉ: Địa chỉ kiểm thử giao diện', '', 'BÊN B: ' + profile.supplierName, 'Địa chỉ: ' + profile.address, ...Array.from({ length: 12 }, (_, i) => `Điều ${i + 1}. Điều khoản kiểm thử giao diện`, )].join('\n')
  let role = 'WAREHOUSE_MANAGER'
  const contract = () => ({ id: 1, contractCode: 'HD_UI_20261128', supplierId: 1, cropTypeId: 1, supplierName: profile.supplierName, cropTypeName: crop.name, cropCode: crop.code, warehouseManagerName: 'Quản lý kiểm thử', deliveryQuantityKg: 1000, deliveryPeriod: 'WEEK', unitPriceVndPerKg: 25000, unitPriceExact: '25000.00', startDate: '2026-11-28', endDate: '2027-01-28', status: role === 'ADMINISTRATOR' ? 'PENDING_ADMIN' : role === 'SUPPLIER' ? 'PENDING_SUPPLIER' : 'APPROVED', revision: 1, createdAt: '2026-11-28T01:00:00Z', isEffective: role === 'WAREHOUSE_MANAGER', documentContent: documentText, documentHash: 'ui-test-hash', terms: 'Điều khoản kiểm thử', supplierRespondedAt: null, supplierRejectionReason: null, adminName: null, adminReviewedAt: null, adminRejectionReason: null, cancellationRequestedAt: null, cancellationRequestReason: null, cancelledAt: null, cancellationReason: null, attachmentFileName: null, attachmentContentType: null, attachmentUploadedAt: null, hasOverdueDelivery: false, overdueDeliveryDueDate: null })
  const location = { id: 1, code: 'KHO_UI', name: 'Kho bảo quản nông sản Cát Hòa Lộc', maxWeightKg: 10000, usedWeightKg: 2000 }
  handlers.set('Fetch.requestPaused', e => {
    const url = new URL(e.request.url), method = e.request.method
    requests.push({ path: url.pathname, method })
    let data = [], raw = false
    const p = url.pathname
    if (p === '/api/notifications') data = { items: [], unreadCount: 0 }
    else if (p.endsWith('/popup/initialize')) data = { baselineIds: [] }
    else if (p.startsWith('/api/categories')) data = categories
    else if (p === '/api/crop-types/1') data = crop
    else if (p.startsWith('/api/crop-types')) data = paged([crop])
    else if (p === '/api/suppliers/me/profile') { data = profile; raw = true }
    else if (p === '/api/GrowingAreas') { data = []; raw = true }
    else if (p === '/api/SupplierBatches') {
      data = { summary: { totalDeclaredBatches: 0, pendingApprovalBatches: 0, pendingQCBatches: 0, approvedBatches: 0, rejectedBatches: 0 }, batches: { items: [], totalCount: 0, pageIndex: 1, pageSize: 20, totalPages: 0 } }
      raw = true
    }
    else if (p === '/api/supply-contracts/options') data = { suppliers: [{ id: 1, code: 'SUP_UI', name: profile.supplierName, cropTypeIds: [1] }], cropTypes: [{ id: 1, code: crop.code, name: crop.name, categoryName: 'Trái cây' }] }
    else if (p === '/api/supply-contracts/preview') data = { content: documentText }
    else if (p === '/api/supply-contracts/1') data = contract()
    else if (p === '/api/supply-contracts') data = paged([contract()])
    else if (p === '/api/supply-contracts/eligible-for-batch') data = []
    else if (p === '/api/warehouse-locations') data = [location]
    else if (p === '/api/warehouse-settings/capacity') data = { maxCapacityKg: 20000, currentStoredWeightKg: 2000 }
    else if (p.endsWith('/inventory/levels')) data = { totalOnHandKg: 2000, totalAvailableKg: 1800, totalReservedKg: 200, activeLocationCount: 1, lowStockItemCount: 0, generatedAt: '2026-11-28T01:00:00Z', locations: [{ locationId: 1, locationCode: location.code, zoneName: location.name, rackName: null, binName: null, locationStatus: 'ACTIVE', quantityOnHandKg: 2000, reservedQuantityKg: 200, availableQuantityKg: 1800, maxWeightKg: 10000, utilizationPercent: 20, batchCount: 2, lowStockItemCount: 0, lastUpdatedAt: '2026-11-28T01:00:00Z' }] }
    else if (p.endsWith('/inventory/capacity')) data = { configuredCapacityKg: 10000, usedWeightKg: 2000, availableWeightKg: 8000, utilizationPercent: 20, nearCapacityCount: 0, overcrowdedCount: 0, generatedAt: '2026-11-28T01:00:00Z', locations: [{ locationId: 1, locationCode: location.code, zoneName: location.name, usedWeightKg: 2000, maxWeightKg: 10000, availableWeightKg: 8000, utilizationPercent: 20, status: 'AVAILABLE' }] }
    else if (p.endsWith('/inventory/quality-distribution')) data = { totalBatchCount: 2, totalQuantityOnHandKg: 2000, gradedBatchCount: 2, ungradedBatchCount: 0, leadingGrade: 'A', generatedAt: '2026-11-28T01:00:00Z', grades: [{ grade: 'A', batchCount: 2, quantityOnHandKg: 2000, percentage: 100 }] }
    else if (p === '/api/admin/dashboard') data = { totalAccounts: 6, activeAccounts: 6, pendingAccounts: 0, totalCropTypes: 1, activeCropTypes: 1, totalBatches: 2, pendingBatches: 0, totalSuppliers: 1, totalDistributors: 1, roleDistribution: [{ label: 'Quản trị viên', value: 1 }], weeklyActivity: [], auditActivity: [] }
    else if (p.endsWith('/user-access/accounts')) data = { ...paged([{ id: 1, username: 'ui-test', email: 'ui@example.invalid', fullName: 'Người kiểm thử giao diện', roleName: 'Nhà cung cấp', roleId: 4, status: 'ACTIVE', lastLoginAt: '2026-11-28T01:00:00Z' }]), counts: { ACTIVE: 1 } }
    else if (p.endsWith('/user-access/roles')) data = [{ id: 1, code: 'ADMINISTRATOR', name: 'Quản trị viên' }]
    else if (p.endsWith('/operation/product-batches/filters')) data = { suppliers: [], cropTypes: [], statuses: [] }
    else if (p.endsWith('/operation/product-batches')) data = paged([])
    else if (p.endsWith('/stock-adjustments/locations')) data = [{ id: location.id, code: location.code }]
    else if (/audit-logs|warehouse-manager\/orders|stock-adjustments|sale-offers/.test(p)) data = paged([])
    const body = JSON.stringify(raw ? data : { isSuccess: true, statusCode: 200, data })
    void page('Fetch.fulfillRequest', { requestId: e.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json; charset=utf-8' }], body: Buffer.from(body).toString('base64') }).catch(error => { if (!error.message.includes('Invalid InterceptionId')) errors.push(error.message) })
  })
  await page('Fetch.enable', { patterns: [{ urlPattern: '*/api/*' }] })
  const navigate = async route => {
    await page('Page.navigate', { url: origin + route })
    await until(() => evaluate("!!document.querySelector('main h1') || !!document.querySelector('[role=alert]')"), route)
    await delay(350)
  }
  const audit = async name => {
    const result = await evaluate(`(() => ({overflow:document.documentElement.scrollWidth > innerWidth + 2,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,heading:document.querySelector('main h1')?.textContent,errors:[...document.querySelectorAll('[role=alert]')].map(e=>e.innerText).filter(Boolean),offenders:[...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>innerWidth+3&&e.getBoundingClientRect().width>0).slice(0,4).map(e=>({tag:e.tagName,class:e.className,width:e.getBoundingClientRect().width}))}))()`)
    pages.push({ name, ...result })
    await writeFile(path.join(evidence, 'audit-progress.json'), JSON.stringify({ pages, issues, errors }, null, 2))
    if (result.overflow) { issues.push({ name, kind: 'page-overflow', ...result }); await screenshot(name + '.png') }
    if (errors.length) throw new Error(errors.join('\n'))
  }
  const auditDialog = async name => {
    await until(() => evaluate("!!document.querySelector('[role=dialog], dialog[open]')"), name)
    await delay(400)
    const result = await evaluate(`(() => {const d=[...document.querySelectorAll('[role=dialog],dialog[open]')].at(-1),r=d.getBoundingClientRect(),points=[{x:r.left+Math.min(24,r.width/2),y:r.top+24},{x:r.right-Math.min(24,r.width/2),y:r.top+24}],covered=points.filter(p=>!d.contains(document.elementFromPoint(p.x,p.y)));return {covered:covered.length,bounds:{left:r.left,top:r.top,right:r.right,bottom:r.bottom},width:innerWidth,height:innerHeight,overflow: d.scrollWidth>d.clientWidth+3,fieldsBeforePreview:!d.querySelector('.contract-create-fields')||innerWidth>=1024||d.querySelector('.contract-create-fields').getBoundingClientRect().top<=d.querySelector('section[aria-label="Xem trước hợp đồng"]').getBoundingClientRect().top}})()`)
    if (result.covered || result.bounds.left < -2 || result.bounds.top < -2 || result.bounds.right > result.width+2 || result.bounds.bottom > result.height+2 || result.overflow) issues.push({ name, kind: 'dialog-layout', ...result })
    if (!result.fieldsBeforePreview) issues.push({ name, kind: 'mobile-form-after-document' })
    await screenshot(name + '.png')
  }
  const openContract = async () => {
    await until(() => evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent.includes('HD_UI')) || [...document.querySelectorAll('tr')].some(r=>r.innerText.includes('HD_UI'))"), 'contract record')
    await evaluate("(() => {const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('HD_UI')); if(b)b.click();else [...document.querySelectorAll('tr')].find(r=>r.innerText.includes('HD_UI')).querySelector('button').click()})()")
  }
  const routes = {
    ADMINISTRATOR: ['/admin', '/admin/user-access', '/admin/categories', '/admin/crop-types', '/admin/crop-types/new', '/admin/crop-types/1/edit', '/admin/inspection-standards', '/admin/inspection-standards/new', '/admin/warehouse-capacity', '/admin/audit-logs', '/admin/contracts'],
    SUPPLIER: ['/supplier', '/supplier/batches', '/supplier/batches/new', '/supplier/profile', '/supplier/profile/edit', '/supplier/contracts'],
    WAREHOUSE_MANAGER: ['/warehouse-manager', '/warehouse-manager/inventory', '/warehouse-manager/capacity', '/warehouse-manager/quality', '/operation/product-batches', '/warehouse-manager/sale-offers', '/warehouse-manager/orders', '/warehouse-manager/stock-adjustments', '/warehouse-manager/contracts'],
  }
  for (const width of (process.env.SAW_UI_WIDTH ? [Number(process.env.SAW_UI_WIDTH)] : [1440, 390])) {
    await page('Emulation.setDeviceMetricsOverride', { width, height: width === 1440 ? 1000 : 844, deviceScaleFactor: 1, mobile: width !== 1440 })
    for (const [actor, screens] of Object.entries(routes)) {
      if (process.env.SAW_UI_ACTOR && process.env.SAW_UI_ACTOR !== actor) continue
      role = actor; await authenticate(role)
      for (const route of screens.filter(r => !process.env.SAW_UI_ROUTE || process.env.SAW_UI_ROUTE === r)) {
        await navigate(route)
        await audit(`${width}-${actor}-${route.replaceAll('/', '-')}`)
      }
      if (process.env.SAW_UI_ROUTE) continue
      console.log('Screens checked: ' + width + ' ' + actor + ' (' + pages.length + ')');
      await openContract(); await auditDialog(`${width}-${actor}-contract-detail`)
      if (role !== 'WAREHOUSE_MANAGER') {
        await click(role === 'ADMINISTRATOR' ? 'Xác nhận duyệt' : 'Xác nhận và gửi Admin')
        await auditDialog(`${width}-${actor}-contract-confirmation`)
        await evaluate("document.querySelector('[aria-labelledby=final-confirmation-title] button').click()")
        assert.equal(await evaluate("!!document.querySelector('[aria-labelledby=final-confirmation-title]')"), false)
      }
      if (role === 'WAREHOUSE_MANAGER') {
        await navigate('/warehouse-manager/contracts'); await click('Tạo và gửi hợp đồng'); await auditDialog(`${width}-${actor}-contract-create`)
        await fill('input[aria-label="Nhà cung cấp"]', 'SUP_UI')
        await evaluate("document.querySelector('input[aria-label=\"Nhà cung cấp\"]').focus()")
        await until(() => evaluate("!!document.querySelector('[role=option]')"), 'supplier suggestions')
        assert.equal(await evaluate("(() => {const el=document.querySelector('[role=option]');el.scrollIntoView({block:'nearest'});const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.left+10,r.top+10))})()"), true, 'supplier option is not covered')
        await evaluate("document.querySelector('[role=option]').click()")
        await fill('input[aria-label="Loại nông sản"]', 'XOAI')
        await evaluate("document.querySelector('input[aria-label=\"Loại nông sản\"]').focus()")
        await until(() => evaluate("!!document.querySelector('[role=option]')"), 'crop suggestions')
        await evaluate("document.querySelector('[role=option]').click()")
        await fill('input[aria-label="Đơn giá thu mua"]', '25000')
        await fill('input[type=number]', '1000')
        await auditDialog(`${width}-${actor}-contract-filled`)
        await click('Hủy')
        await until(() => evaluate("!document.querySelector('[role=dialog]')"), 'cancel closes form')
        assert.equal(await evaluate("document.body.style.overflow === 'hidden'"), false, 'background scrolling restored')
      }
      if (role === 'ADMINISTRATOR') {
        await navigate('/admin/categories'); await click('Thêm danh mục cha'); await auditDialog(`${width}-admin-category`)
        await navigate('/admin/warehouse-capacity'); await click('Thêm vị trí'); await auditDialog(`${width}-admin-capacity`)
      }
    }
  }
  await writeFile(path.join(evidence, 'audit-results.json'), JSON.stringify({ mode: 'Real Edge/Vite, mocked API, no warehouse writes', pages, issues, errors }, null, 2))
  console.log(JSON.stringify({ pages: pages.length, issues, errors }, null, 2))
  assert.deepEqual(issues, [])
  assert.deepEqual(errors, [])
  assert.equal(requests.some(r => r.method !== 'GET' && !/notifications|supply-contracts\/preview/.test(r.path)), false, 'review must not send or approve contracts')
  await call('Browser.close')
} finally {
  try { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ id: 99999, method: 'Browser.close' })) } catch {}
  socket?.close(); await delay(500); edge?.kill(); await vite.close()
  if (path.resolve(temp).startsWith(path.resolve(tmpdir()) + path.sep + 'saw-role-ui-')) await rm(temp, { recursive: true, force: true, maxRetries: 12, retryDelay: 250 }).catch(() => {})
}
