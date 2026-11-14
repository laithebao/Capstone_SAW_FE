// Run with: node tests/user-profile-browser.mjs
// Real Edge/Vite with isolated API responses; does not connect to the application database.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { build } from 'vite'

const roles = ['ADMINISTRATOR', 'WAREHOUSE_MANAGER', 'QC_STAFF', 'OPERATION_STAFF', 'DISTRIBUTOR', 'SUPPLIER']
const profiles = new Map(roles.map((role, index) => [role, {
  accountId: index + 1, username: `profile_${role}`, email: `${role.toLowerCase()}@test.invalid`,
  fullName: `Người dùng ${role}`, phoneNumber: '0901234567', roleCode: role, avatarUrl: null,
  distributor: role === 'DISTRIBUTOR' ? { distributorId: 1, distributorCode: 'DIS-000001', distributorName: 'Công ty Phân phối',
    taxCode: '0123456789', contactPerson: 'Người liên hệ', phoneNumber: '0902222222', email: 'contact@test.invalid', address: 'Hà Nội' } : null,
}]))
const supplier = { supplierId: 1, supplierCode: 'SUP-000001', supplierName: 'Hợp tác xã Nông sản', taxCode: '0987654321',
  phoneNumber: '0903333333', email: 'supplier@test.invalid', contactPerson: 'Đại diện', legalRepresentative: 'Đại diện', address: 'Đồng Tháp', profileStatus: 'ACTIVE', growingAreas: [],
  cropTypes: [{ cropTypeId: 1, cropCode: 'MANGO', cropName: 'Xoài', categoryName: 'Trái cây' }], certifications: [], documents: [] }
let failRead = false, failWrite = false, failProfileFields = false, failSupplierFields = false
const requests = [], errors = []
const temp = await mkdtemp(path.join(tmpdir(), 'saw-user-profile-browser-'))
const built = path.join(temp, 'dist')
await build({
  cacheDir: path.join(temp, 'vite-cache'),
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api') },
  logLevel: 'error',
  build: { outDir: built, reportCompressedSize: false },
})
const httpServer = createServer(async (req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1')
      if (!url.pathname.startsWith('/api/')) {
        const file = url.pathname.startsWith('/assets/') ? path.resolve(built, url.pathname.slice(1)) : path.join(built, 'index.html')
        if (!file.startsWith(built + path.sep)) { res.statusCode = 404; res.end(); return }
        try {
          res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html')
          res.end(await readFile(file))
        } catch { res.statusCode = 404; res.end() }
        return
      }
      const role = req.headers.authorization?.replace('Bearer isolated-', '')
      requests.push({ role, method: req.method, path: url.pathname })
      const json = (body, status = 200) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)) }
      if (url.pathname === '/api/notifications') return json({ data: { items: [], unreadCount: 0 } })
      if (url.pathname === '/api/GrowingAreas') return json([])
      if (url.pathname === '/api/crop-types') return json({ data: { items: supplier.cropTypes } })
      if (url.pathname === '/api/suppliers/me/profile') {
        if (req.method === 'PUT') {
          let body = ''; for await (const chunk of req) body += chunk
          const request = JSON.parse(body)
          assert.equal(request.taxCode, supplier.taxCode)
          if (failSupplierFields) return json({ title: 'Validation failed', errors: { ContactPerson: ['Người liên hệ không hợp lệ từ API.'], Email: ['Email không hợp lệ từ API.'] } }, 400)
          Object.assign(supplier, request)
        }
        return json(supplier)
      }
      if (url.pathname === '/api/user-profiles/me') {
        if (req.method === 'GET') return failRead ? json({ message: 'Không thể tải hồ sơ thử nghiệm.' }, 503) : json({ data: profiles.get(role) })
        if (req.method === 'PUT') {
          let body = ''; for await (const chunk of req) body += chunk
          const request = JSON.parse(body)
          assert.deepEqual(Object.keys(request).sort(), ['distributor', 'fullName', 'phoneNumber'])
          // Match the running API variant that rejects an omitted read-only TaxCode.
          if (request.distributor && !request.distributor.taxCode) return json({ errors: { 'Distributor.TaxCode': ['The TaxCode field is required.'] } }, 400)
          const current = profiles.get(role)
          if (request.distributor) assert.equal(request.distributor.taxCode, current.distributor.taxCode)
          if (failProfileFields) return json({ message: 'Validation failed', errors: ['Số điện thoại liên hệ không hợp lệ từ API.', 'Email liên hệ không hợp lệ từ API.'] }, 422)
          if (failWrite) return json({ message: 'Hồ sơ đã thay đổi. Vui lòng tải lại.' }, 409)
          await delay(200)
          const updated = { ...current, fullName: request.fullName.trim(), phoneNumber: request.phoneNumber?.trim() || null,
            distributor: request.distributor ? { ...current.distributor, ...request.distributor, distributorName: request.distributor.distributorName.trim() } : null }
          profiles.set(role, updated)
          return json({ data: updated })
        }
      }
      return json({ message: 'Unexpected fixture request' }, 404)
})
const vite = { httpServer, listen: () => new Promise(resolve => httpServer.listen(0, '127.0.0.1', resolve)), close: () => new Promise(resolve => httpServer.close(resolve)) }
let edge, socket
try {
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  const listener = net.createServer()
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve))
  const debugPort = listener.address().port
  await new Promise(resolve => listener.close(resolve))
  edge = spawn(process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-sync',
    '--disable-features=msImplicitSignin',
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
    const id = ++nextId
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Browser command timed out: ${method}`)) }, 20000)
    pending.set(id, { resolve, reject, timeout }); socket.send(JSON.stringify({ id, method, params, sessionId }))
  })
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data)
    if (message.id) {
      const task = pending.get(message.id); pending.delete(message.id)
      clearTimeout(task?.timeout)
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
  const until = async (condition, label) => {
    for (let i = 0; i < 450; i++) { if (await condition()) return; await delay(100) }
    throw new Error(`Timed out: ${label}; ${await evaluate('location.pathname + "\\n" + document.body.innerText + "\\n" + document.readyState + "\\n" + document.documentElement.outerHTML.slice(-1200)')}; browser errors: ${errors.join('\n')}`)
  }
  const navigate = route => page('Page.navigate', { url: origin + route })
  const click = label => until(() => evaluate(`(() => { const e=[...document.querySelectorAll('button,a')].find(e=>e.textContent.trim()===${JSON.stringify(label)} || e.getAttribute('aria-label')===${JSON.stringify(label)}); if (!e || e.disabled) return false; e.click(); return true; })()`), `click ${label}`)
  const setInput = (selector, value) => evaluate(`(() => { const e=document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e),'value').set.call(e,${JSON.stringify(value)}); e.dispatchEvent(new Event('input',{bubbles:true})); })()`)
  const setValue = (name, value) => setInput(`[name="${name}"]`, value)
  const screenshot = async (name, fullPage = true) => {
    if (!process.env.SAW_PROFILE_ARTIFACT_DIR) return
    await mkdir(process.env.SAW_PROFILE_ARTIFACT_DIR, { recursive: true })
    const result = await page('Page.captureScreenshot', { format: 'png', captureBeyondViewport: fullPage })
    await writeFile(path.join(process.env.SAW_PROFILE_ARTIFACT_DIR, `${name}.png`), Buffer.from(result.data, 'base64'))
  }
  const assertInlineError = async (name, field = name) => {
    const info = await evaluate(`(() => {
      const input = document.querySelector('[name="${name}"]');
      const error = document.querySelector('[data-field-error="${field}"]');
      return { invalid: input?.getAttribute('aria-invalid'), describedBy: input?.getAttribute('aria-describedby'), errorId: error?.id,
        text: error?.textContent, color: error ? (() => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1; const context = canvas.getContext('2d'); context.fillStyle = getComputedStyle(error).color; context.fillRect(0, 0, 1, 1); return [...context.getImageData(0, 0, 1, 1).data]; })() : null,
        inputBottom: input?.getBoundingClientRect().bottom, errorTop: error?.getBoundingClientRect().top };
    })()`)
    assert.equal(info.invalid, 'true')
    assert.ok(info.text)
    assert.equal(info.describedBy, info.errorId)
    assert.ok(info.errorTop >= info.inputBottom - 1, `Error must appear below ${name}`)
    const channels = info.color
    assert.ok(channels[0] > channels[1] * 1.3 && channels[0] > channels[2], `Error must be red for ${name}`)
  }
  const assertVisibleNotification = async () => {
    const bounds = await evaluate(`(() => { const e = document.querySelector('[data-form-notification]'); const r = e?.getBoundingClientRect(); return r && { top: r.top, bottom: r.bottom, right: r.right, left: r.left, height: innerHeight, width: innerWidth, position: getComputedStyle(e).position }; })()`)
    assert.ok(bounds)
    assert.equal(bounds.position, 'fixed')
    assert.ok(bounds.top >= 0 && bounds.bottom <= bounds.height + 1)
    assert.ok(bounds.left >= 0 && bounds.right <= bounds.width + 1)
  }
  await page('Page.enable'); await page('Runtime.enable'); await page('Network.enable'); await page('Log.enable')
  handlers.set('Runtime.exceptionThrown', event => errors.push(event.exceptionDetails.exception?.description || event.exceptionDetails.text))
  handlers.set('Network.loadingFailed', event => { if (!event.canceled) errors.push(`Network: ${event.errorText}`) })
  handlers.set('Log.entryAdded', event => { if (event.entry.level === 'error' && event.entry.source !== 'network') errors.push(event.entry.text) })
  handlers.set('Page.javascriptDialogOpening', () => { void page('Page.handleJavaScriptDialog', { accept: true }) })
  await page('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await navigate('/login')
  await until(() => evaluate('!!document.querySelector("form")'), 'login')
  for (const role of roles) {
    const profile = profiles.get(role)
    const session = { user: { id: profile.accountId, role, name: profile.fullName, email: profile.email },
      accessToken: `isolated-${role}`, refreshToken: 'unused', expiresAt: new Date(Date.now() + 3600000).toISOString(),
      refreshTokenExpiresAt: new Date(Date.now() + 7200000).toISOString() }
    await evaluate(`localStorage.setItem('saw.auth-session', ${JSON.stringify(JSON.stringify(session))})`)
    await navigate('/account/change-password')
    await until(() => evaluate('!!document.querySelector("header a[aria-label]")'), `${role} header`)
    const start = requests.length
    await evaluate('document.querySelector("header a[aria-label]").click()')
    if (role === 'SUPPLIER') {
      await until(() => evaluate('location.pathname === "/supplier/profile" && document.body.innerText.includes("Hồ sơ Nhà cung cấp")'), 'supplier existing profile')
      assert.equal(requests.slice(start).some(request => request.path === '/api/user-profiles/me'), false)
      await screenshot('supplier-profile-desktop')
      await click('Chỉnh sửa thông tin')
      await until(() => evaluate('location.pathname === "/supplier/profile/edit" && !!document.querySelector("input[name=taxCode]")'), 'supplier edit')
      assert.equal(await evaluate('document.querySelector("input[name=taxCode]").readOnly'), true)
      assert.equal(await evaluate('document.querySelector("input[name=taxCode]").value'), supplier.taxCode)
      assert.equal(await evaluate(`(() => {
        const save = document.querySelector('button[type="submit"]');
        const cancel = [...save.parentElement.querySelectorAll('button')].find(e => e.textContent.includes('Hủy'));
        const password = [...save.parentElement.querySelectorAll('a')].find(e => e.textContent === 'Đổi mật khẩu');
        return !!cancel && !!password && password.getBoundingClientRect().top >= cancel.getBoundingClientRect().bottom;
      })()`), true)
      const beforeInvalid = requests.filter(r => r.method === 'PUT').length
      await setValue('phoneNumber', '1234567890')
      await page('Emulation.setDeviceMetricsOverride', { width: 1440, height: 500, deviceScaleFactor: 1, mobile: false })
      await evaluate('window.scrollTo(0, document.documentElement.scrollHeight)')
      await evaluate('document.querySelector("form").requestSubmit()')
      await until(() => evaluate('[...document.querySelectorAll("[role=alert]")].some(e => e.textContent.includes("điện thoại"))'), 'supplier phone validation')
      await assertInlineError('phoneNumber')
      await assertVisibleNotification()
      assert.ok(await evaluate('window.scrollY > 0'))
      await setValue('phoneNumber', '090 123 4567')
      await setValue('email', 'user@host')
      await evaluate('document.querySelector("form").requestSubmit()')
      await until(() => evaluate('[...document.querySelectorAll("[role=alert]")].some(e => e.textContent.includes("Email"))'), 'supplier email validation')
      await assertInlineError('email')
      await assertVisibleNotification()
      assert.equal(requests.filter(r => r.method === 'PUT').length, beforeInvalid)
      await setValue('email', 'supplier@example.com')
      failSupplierFields = true
      await evaluate('document.querySelector("form").requestSubmit()')
      await until(() => evaluate('document.querySelector("[data-field-error=contactPerson]")?.textContent.includes("API")'), 'supplier API field error')
      await assertInlineError('contactPerson')
      await assertInlineError('email')
      await assertVisibleNotification()
      await click('Xem ô cần sửa')
      await until(() => evaluate('document.activeElement?.name === "contactPerson"'), 'supplier focus first invalid field')
      await delay(400)
      await screenshot('supplier-profile-field-errors', false)
      failSupplierFields = false
      await setValue('contactPerson', 'Liên hệ hợp lệ')
      await setValue('email', 'supplier@example.com')
      await evaluate('document.querySelector("form").requestSubmit()')
      await until(() => evaluate('location.pathname === "/supplier/profile" && document.body.innerText.includes("Hồ sơ Nhà cung cấp")'), 'supplier save')
      assert.equal(supplier.taxCode, '0987654321')
      assert.equal(supplier.phoneNumber, '0901234567')
      await page('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
    } else {
      await until(() => evaluate('location.pathname === "/account/profile" && !!document.querySelector("input[name=fullName]")'), `${role} personal profile`)
      assert.equal(await evaluate('document.querySelector("input[name=fullName]").matches(":disabled")'), true)
      assert.equal(await evaluate('!!document.querySelector("input[name=taxCode]")'), role === 'DISTRIBUTOR')
      assert.equal(await evaluate('document.body.innerText.includes("Vùng trồng")'), false)
      await click('Chỉnh sửa thông tin')
      assert.equal(await evaluate(`(() => {
        const bar = document.querySelector('[data-profile-actions]');
        const save = bar.querySelector('button[type="submit"]');
        return save?.form?.id === 'user-profile-form' && !!bar.querySelector('a[href="/account/change-password"]') && [...bar.querySelectorAll('button')].some(e => e.textContent.includes('Hủy')) && document.querySelectorAll('button[type="submit"]').length === 1;
      })()`), true)
      if (role === 'DISTRIBUTOR') {
        assert.equal(await evaluate('document.querySelector("input[name=taxCode]").matches(":disabled")'), true)
        assert.equal(await evaluate('document.querySelector("input[name=taxCode]").readOnly'), true)
        // Even DOM tampering cannot replace the registered value used for saving.
        await setValue('taxCode', '9999999999')
      }
      await setValue('fullName', 'Tên chưa lưu')
      await click('Hủy thay đổi')
      assert.equal(await evaluate('document.querySelector("input[name=fullName]").value'), profile.fullName)
      await click('Chỉnh sửa thông tin')
      await setValue('fullName', ` Cập nhật ${role} `)
      const beforeInvalid = requests.filter(r => r.method === 'PUT').length
      await setValue('phoneNumber', '1234567890')
      await click('Lưu thay đổi')
      await until(() => evaluate('document.querySelector("[role=alert]")?.textContent.includes("điện thoại")'), `${role} phone validation`)
      await assertInlineError('phoneNumber')
      await assertVisibleNotification()
      assert.equal(requests.filter(r => r.method === 'PUT').length, beforeInvalid)
      if (role === 'QC_STAFF') {
        await click('Hủy thay đổi')
        assert.equal(await evaluate('!!document.querySelector("[data-form-notification]") || !!document.querySelector("[data-field-error]")'), false)
        assert.equal(await evaluate('document.querySelector("input[name=fullName]").value'), profile.fullName)
        await click('Chỉnh sửa thông tin')
        await setValue('fullName', ` Cập nhật ${role} `)
      }
      await setValue('phoneNumber', '0909999999')
      if (role === 'DISTRIBUTOR') {
        await setValue('distributorName', 'Công ty Phân phối Mới')
        await setValue('businessEmail', 'user@host')
        await click('Lưu thay đổi')
        await until(() => evaluate('document.querySelector("[role=alert]")?.textContent.includes("Email")'), 'distributor email validation')
        await assertInlineError('businessEmail', 'distributor.email')
        assert.equal(requests.filter(r => r.method === 'PUT').length, beforeInvalid)
        await setValue('businessEmail', 'orders@example.com')
        await setValue('fullName', ' ')
        await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 500, deviceScaleFactor: 1, mobile: true })
        await delay(350)
        await evaluate('window.scrollTo(0, document.documentElement.scrollHeight)')
        await click('Lưu thay đổi')
        await until(() => evaluate('!!document.querySelector("[data-field-error=fullName]")'), 'scrolled profile error')
        await assertInlineError('fullName')
        await assertVisibleNotification()
        assert.ok(await evaluate('window.scrollY > 0'))
        assert.equal(await evaluate(`(() => { const r = document.querySelector('[data-profile-actions] button[type="submit"]').getBoundingClientRect(); return r.top >= 64 && r.bottom <= innerHeight; })()`), true)
        await screenshot('distributor-profile-feedback-scrolled', false)
        await click('Đóng thông báo')
        assert.equal(await evaluate('!!document.querySelector("[data-form-notification]")'), false)
        await assertInlineError('fullName')
        await click('Lưu thay đổi')
        await click('Xem ô cần sửa')
        await until(() => evaluate('document.activeElement?.name === "fullName"'), 'focus first profile field')
        await delay(400)
        await screenshot('distributor-profile-field-errors-mobile', false)
        await setValue('fullName', ` Cập nhật ${role} `)
        await until(() => evaluate('!document.querySelector("[data-field-error=fullName]")'), 'clear corrected field error')
        await page('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
        failProfileFields = true
        await click('Lưu thay đổi')
        await until(() => evaluate('document.getElementById("profile-distributor.email-error")?.textContent.includes("API")'), 'profile API field error')
        await assertInlineError('businessPhoneNumber', 'distributor.phoneNumber')
        await assertInlineError('businessEmail', 'distributor.email')
        await assertVisibleNotification()
        failProfileFields = false
        failWrite = true
        await click('Lưu thay đổi')
        await until(() => evaluate('document.querySelector("[role=alert]")?.textContent.includes("Hồ sơ đã thay đổi")'), 'profile conflict')
        assert.equal(await evaluate('document.querySelector("input[name=distributorName]").value'), 'Công ty Phân phối Mới')
        failWrite = false
      }
      await click('Lưu thay đổi')
      assert.equal(await evaluate('document.querySelector("button[type=submit]").disabled'), true)
      await until(() => evaluate('document.querySelector("[role=status]")?.textContent.includes("thành công")'), `${role} save success`)
      assert.equal(await evaluate('document.querySelector("header").textContent.includes("Cập nhật")'), true)
      const savedSession = await evaluate('JSON.parse(localStorage.getItem("saw.auth-session"))')
      assert.equal(savedSession.user.name, `Cập nhật ${role}`)
      assert.equal(savedSession.accessToken, session.accessToken)
      assert.equal(savedSession.refreshToken, session.refreshToken)
      if (role === 'DISTRIBUTOR') assert.equal(profiles.get(role).distributor.taxCode, '0123456789')
      await page('Page.reload')
      await until(() => evaluate('document.querySelector("input[name=fullName]")?.value.startsWith("Cập nhật")'), 'saved profile survives reload')
      await screenshot(`${role.toLowerCase()}-profile-desktop`)
      if (role === 'ADMINISTRATOR') {
        await navigate('/admin/crop-types/new')
        await until(() => evaluate(`!!document.querySelector(${JSON.stringify('input[placeholder="5"]')})`), 'crop storage inputs')
        for (const [placeholder, value] of [['5', '5.678'], ['10', '10.123'], ['85', '85.125'], ['90', '90.456']]) {
          await setInput(`input[placeholder="${placeholder}"]`, value)
          assert.equal(await evaluate(`document.querySelector('input[placeholder="${placeholder}"]').validity.stepMismatch`), false)
        }
        await navigate('/account/profile')
        await until(() => evaluate('!!document.querySelector("input[name=fullName]")'), 'return to profile')
      }
    }
    await click('Đổi mật khẩu')
    await until(() => evaluate('location.pathname === "/account/change-password" && !!document.querySelector("input[type=password]")'), `${role} change password`)
  }
  // Exercise retry and small-screen layout using a normal staff profile.
  const staff = profiles.get('QC_STAFF')
  const staffSession = { user: { id: staff.accountId, role: 'QC_STAFF', name: staff.fullName, email: staff.email },
    accessToken: 'isolated-QC_STAFF', refreshToken: 'unused', expiresAt: new Date(Date.now() + 3600000).toISOString(), refreshTokenExpiresAt: new Date(Date.now() + 7200000).toISOString() }
  await evaluate(`localStorage.setItem('saw.auth-session', ${JSON.stringify(JSON.stringify(staffSession))})`)
  failRead = true
  await navigate('/account/profile')
  await until(() => evaluate('!!document.querySelector("[role=alert]")'), 'failed read')
  failRead = false
  await click('Thử lại')
  await until(() => evaluate('!!document.querySelector("input[name=fullName]")'), 'read retry')
  await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await delay(400) // Allow the existing sidebar's responsive transition to finish.
  await click('Chỉnh sửa thông tin')
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'Profile fits mobile width')
  await screenshot('personal-profile-mobile')
  assert.deepEqual(errors, [])
  console.log('PASS: six roles; correct save/cancel/password placement; inline red errors with ARIA associations; client and API field errors; viewport notification while scrolled; dismiss/focus/correction; supplier action order; save/reload/session and mobile layout.')
} finally {
  socket?.close()
  if (edge && edge.exitCode == null) {
    const stopped = new Promise(resolve => edge.once('exit', resolve)); edge.kill(); await stopped
  }
  await vite.close()
  await rm(temp, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
}
