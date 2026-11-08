// Real headless Edge + Vite, with isolated API/image fixtures. No DB writes or extra npm packages.
// Run: node tests/receiving-workflows-browser.mjs; controlled API mocks, no SQL/storage writes.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { createServer } from 'vite'

const temp = await mkdtemp(path.join(tmpdir(), 'saw-receiving-workflows-browser-'))
const vite = await createServer({ define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api') }, server: { host: '127.0.0.1', port: 0 } })
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
  // Windows Edge may open a sync dialog even in a fresh headless profile. Close only that test-browser target.
  handlers.set('Target.targetCreated', e => {
    if (e.targetInfo.url.startsWith('edge://sync-confirmation-dialog')) void call('Target.closeTarget', { targetId: e.targetInfo.targetId })
  })
  await call('Target.setDiscoverTargets', { discover: true })
  for (const target of (await call('Target.getTargets')).targetInfos) {
    if (target.url.startsWith('edge://sync-confirmation-dialog')) await call('Target.closeTarget', { targetId: target.targetId })
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
    for (let i = 0; i < 300; i++) { if (await test()) return; await delay(100) }
    throw new Error(`Timed out: ${description}; view=${JSON.stringify(await evaluate('({path:location.pathname,text:document.body.innerText.slice(0,1500)})'))}`)
  }
  await page('Page.enable'); await page('Runtime.enable')
  const errors = [], requests = []
  const completed = []
  handlers.set('Runtime.exceptionThrown', e => errors.push(e.exceptionDetails.exception?.description || e.exceptionDetails.text))
  const session = role => ({ user: { id: 1, name: 'Receiving test user', email: 'receiving@test.invalid', role },
    accessToken: 'isolated-mock-api', refreshToken: 'unused', expiresAt: new Date(Date.now()+3600000).toISOString(),
    refreshTokenExpiresAt: new Date(Date.now()+7200000).toISOString() })
  let role = 'OPERATION_STAFF'
  const auth = async () => {
    await page('Page.addScriptToEvaluateOnNewDocument', { source: role==='GUEST'?"sessionStorage.removeItem('saw.auth-session');":`sessionStorage.setItem('saw.auth-session',${JSON.stringify(JSON.stringify(session(role)))});` })
  }
  await auth()
  const fields = { productName: 'Receiving test rice', supplierName: 'Supplier A', cropTypeName: 'Rice', categoryName: 'Grain',
    growingAreaName: 'Farm', growingAreaId: 1, cropTypeId: 1, supplierId: 2, harvestDate: '2026-01-01', unit: 'Box',
    quantity: 100, declaredQuantity: 100, weightInKg: 1000, createdAt: '2026-01-02T00:00:00', updatedAt: '2026-01-03T00:00:00',
    expectedDeliveryDate: null, expiryDate: null, packagingType: 'Supplier box', packageCount: 100, packageUnitWeightKg: 10,
    expectedMinTempC: null, expectedMaxTempC: null, expectedMinHumidityPct: null, expectedMaxHumidityPct: null,
    shelfLifeDaysSnapshot: null, note: 'Supplier only note', receivingNote: 'Staff only note',
    verifiedQuantity: 100, verifiedWeightInKg: 1200, verifiedPackagingType: null, verifiedPackageCount: null,
    verifiedPackageUnitWeightKg: null, rejectionReason: null, batchStatus: 'PENDING_QC', canUpdateReceivingInformation: true,
    receivingUpdateLockReason: null, latestQcInspection: null, goodsReceipts: [], statusHistory: [], warehouseTransactions: [] }
  let apiError = false, qcLocked = false, delayA = false, cancelledA = 0
  let unitFixture = null
  let qcSamplingSaved = false
  let releaseA
  const heldA = () => new Promise(resolve => { releaseA = resolve })
  handlers.set('Fetch.requestPaused', e => {
    const reply = async () => {
      const url = new URL(e.request.url); const pathname = url.pathname; const query = url.searchParams
      requests.push({ path: pathname, query: url.search, method: e.request.method, body: e.request.postData })
      let data, status = 200, message = 'OK'
      if (pathname.endsWith('/submitted-suppliers')) data = [{id:2,name:'Supplier A'},{id:3,name:'Supplier B'}]
      else if (pathname.endsWith('/submitted')) data = [{id:query.get('supplierId')==='3'?8:7,batchCode:'DECL-'+query.get('supplierId'),productName:'Cà rốt Đà Lạt Nông xã Xanh',cropTypeName:'Cà rốt Đà Lạt',declaredQuantity:unitFixture?.declaredQuantity??100,unit:unitFixture?.unit??'Box'}]
      else if (/\/submitted\/\d+$/.test(pathname)) {
        const id = Number(pathname.split('/').at(-1)); if (id === 7 && delayA) await heldA()
        data = { ...fields, id, batchCode: 'DECL-'+id, supplierId: id===8?3:2, declaredQuantity:id===8?20:100, weightInKg:id===8?200:1000, ...unitFixture }
      } else if (pathname.endsWith('/verify')) {
        data = { id:7, batchCode:'DECL-7', batchStatus:'PENDING_QC', ...JSON.parse(e.request.postData) }
      } else if (pathname.endsWith('/reject')) data = { id:7,batchCode:'DECL-7',batchStatus:'REJECTED',rejectionReason:JSON.parse(e.request.postData).reason }
      else if (pathname.endsWith('/receiving-details')) {
        if (unitFixture) data = { ...fields, ...unitFixture, ...JSON.parse(e.request.postData), id:7, batchCode:'B-7' }
        else { qcLocked = true; status = 409; message = 'Lô hàng đã được QC tiếp nhận. Không thể cập nhật thông tin kiểm nhận.'; data = null }
      }
      else if (pathname.endsWith('/qr-code')) data = { productBatchId:7,status:'INELIGIBLE',message:'Fixture QR',publicToken:null,traceabilityUrl:null,qrImageUrl:null }
      else if (pathname === '/api/operation/product-batches/filters') data = {suppliers:[{id:2,name:'Supplier A'}],cropTypes:[{id:1,name:'Rice'}],statuses:['PENDING_QC']}
      else if (/\/product-batches\/\d+$/.test(pathname)) {
        const id=Number(pathname.split('/').at(-1))
        if (id===999999){status=404;message='Product batch not found.';data=null}
        else data = {...fields,...unitFixture,id,batchCode:'B-'+id,canUpdateReceivingInformation:!qcLocked,receivingUpdateLockReason:qcLocked?'Lô hàng đã được QC tiếp nhận. Không thể cập nhật thông tin kiểm nhận.':null,
          ...(id===9?{batchStatus:'REJECTED',rejectionReason:'Receiving damage'}:{}),
          ...(id===10?{latestQcInspection:{id:5,inspectionCode:'QC-PROGRESS',inspectionStatus:'IN_PROGRESS',qcResult:null,qualityGrade:null,startedAt:'2026-10-01T00:00:00',completedAt:null,qcStaffName:null,note:null}}:{})}
      } else if (pathname==='/api/inspection-standards/published-versions') data=[]
      else if (pathname==='/api/qc-inspections/13/sampling-ratio') { qcSamplingSaved=true; data=null }
      else if (pathname==='/api/qc-inspections/13') data={id:13,inspectionCode:'QC-RECEIVED',productBatchId:1,batchCode:'LIST-1',productName:'Cà rốt Đà Lạt',cropTypeName:'Cà rốt Đà Lạt',qcAccountId:1,qcAccountName:'QC Test',standardCode:'STANDARD',standardName:'Fixture',versionNo:1,inspectionStatus:'IN_PROGRESS',qcResult:null,qualityGrade:null,samplingRatio:0.1,sampleSize:qcSamplingSaved?10:12.5,startedAt:'2026-10-19T00:00:00',completedAt:null,criteriaResults:[],images:[],environmentLogs:[],sensoryResult:null,labResult:null,expectedMinTempC:null,expectedMaxTempC:null,expectedMinHumidityPct:null,expectedMaxHumidityPct:null}
      else if (pathname==='/api/operation/product-batches') {
        const current=Number(query.get('page')||1), size=Number(query.get('pageSize')||20), empty=query.get('batchCode')==='MISSING'
        data={items:empty?[]:Array.from({length:Math.min(size,25-(current-1)*size)},(_,i)=>({...fields,...unitFixture,id:(current-1)*size+i+1,batchCode:'LIST-'+((current-1)*size+i+1)})),totalCount:empty?0:25,page:current,pageSize:size}
        if(apiError){status=500;message='Isolated list read error';data=null}
      } else if(pathname==='/api/operation/goods-receipts/filters') data={suppliers:[{id:2,name:'Supplier A'},{id:3,name:'Supplier B'}],locations:[{id:1,name:'A1',isActive:true},{id:2,name:'B1',isActive:true}]}
      else if(pathname==='/api/operation/goods-receipts') {const current=Number(query.get('page')||1);data={items:[{id:1,receiptCode:'GR-UI',batchCode:'B-1',productName:'Rice',supplierName:'Supplier A',receivedQuantity:10,unit:'Box',weightInKg:100,locationName:'A1',receivedDate:'2026-01-14',receiptStatus:query.get('status')||'DRAFT'}],totalCount:21,page:current,pageSize:10}}
      else {status=404;message='Unexpected fixture route';data=null}
      await page('Fetch.fulfillRequest',{requestId:e.requestId,responseCode:status,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify({isSuccess:status===200,data,message})).toString('base64')})
    }
    void reply().catch(error => {
      // AbortController cancelled A while selecting B: CDP cannot fulfil that obsolete request.
      if (e.request.url.includes('/submitted/7') && error.message === 'Invalid InterceptionId.') cancelledA++
      else errors.push(error.message)
    })
  })
  await page('Fetch.enable',{patterns:[{urlPattern:'*/api/*'}]})
  const text = () => evaluate('document.body.innerText')
  const navigate = route => page('Page.navigate',{url:origin+route})
  const click = label => until(()=>evaluate(`(()=>{const e=[...document.querySelectorAll('button,a')].find(e=>e.textContent.trim()===${JSON.stringify(label)});if(!e||e.disabled)return false;e.click();return true})()`),`click ${label}`)
  const set = (selector,value) => until(()=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||e.disabled)return false;const value=${JSON.stringify(String(value))};if(e.tagName==='SELECT'&&![...e.options].some(o=>o.value===value))return false;Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e),'value').set.call(e,value);e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));return true})()`),selector)
  const val = label => evaluate(`document.querySelector('[aria-label="${label}"]')?.value`)

  await navigate('/operation/product-batches')
  await until(async()=> (await text()).includes('LIST-1'),'UC26 list')
  assert.deepEqual(await evaluate("[...document.querySelectorAll('thead th')].map(e=>e.textContent.trim())"),['Mã lô','Sản phẩm / loại','Nhà cung cấp','Ngày tạo','Trạng thái hiện tại','Thao tác'])
  assert.equal(await evaluate("document.querySelector('tbody tr').children.length"),6)
  await click('Sau'); await until(async()=> (await text()).includes('LIST-11'),'page2')
  await set('[aria-label="Sắp xếp"]','createdAtAsc'); await click('Áp dụng bộ lọc')
  await until(()=>Promise.resolve(requests.some(r=>r.path.endsWith('/product-batches')&&r.query.includes('createdAtAsc')&&r.query.includes('page=1'))),'sort resets page')
  await set('[aria-label="Mã lô hàng"]','MISSING');await click('Áp dụng bộ lọc')
  await until(async()=> (await text()).includes('No product batches found.'),'empty')
  await set('[aria-label="Mã lô hàng"]','');await click('Áp dụng bộ lọc');await until(async()=> (await text()).includes('LIST-1'),'clear filter')
  completed.push('TC_UC26_004')
  apiError=true;await evaluate(`document.querySelector('[aria-label="Làm mới danh sách và bộ lọc"]').click()`)
  await until(async()=> (await text()).includes('Failed to retrieve product batch data.'),'list error')
  apiError=false;await click('Thử lại');await until(async()=> (await text()).includes('LIST-1'),'list retry');completed.push('TC_UC26_008')
  for(const other of ['GUEST','SUPPLIER','DISTRIBUTOR','QC_STAFF','WAREHOUSE_MANAGER','ADMINISTRATOR']){role=other;await auth();await navigate('/operation/product-batches');await until(()=>evaluate(`location.pathname==='${other==='GUEST'?'/login':'/403'}'`),'outside UI role')}
  role='OPERATION_STAFF';await auth()
  completed.push('TC_UC26_006:UI')

  await navigate('/operation/product-batches/create')
  await set('select[aria-label="Nhà cung cấp"]',2)
  await until(()=>evaluate(`!!document.querySelector('select[aria-label="Khai báo chờ xử lý"] option[value="7"]')`),'declaration option')
  await set('select[aria-label="Khai báo chờ xử lý"]',7)
  await until(()=> val('Số lượng kiểm nhận').then(v=>v==='100'),'prefill')
  assert.equal(await evaluate('document.querySelector(\'select[aria-label="Khai báo chờ xử lý"] option:checked\').textContent.trim()'),'DECL-2 · Cà rốt Đà Lạt · Cà rốt Đà Lạt Nông xã Xanh')
  assert.equal(await val('Ghi chú tiếp nhận của staff'),'')
  assert.equal(await evaluate('document.querySelectorAll("dl input,dl textarea").length'),0)
  completed.push('TC_UC27_008')
  await set('[aria-label="Ghi chú tiếp nhận của staff"]','Unsaved staff note');await set('[aria-label="Số lượng kiểm nhận"]',123)
  const putBefore = requests.filter(r=>r.method==='PUT').length
  await click('Từ chối');await set('[aria-label="Lý do từ chối"]','Unsaved reason')
  await evaluate(`document.querySelector('[role="dialog"] button').click()`)
  assert.equal(await val('Số lượng kiểm nhận'),'123');assert.equal(await val('Ghi chú tiếp nhận của staff'),'Unsaved staff note')
  assert.equal(requests.filter(r=>r.method==='PUT').length,putBefore);completed.push('TC_UC27_006')
  await set('[aria-label="Số lượng kiểm nhận"]','');await set('[aria-label="Khối lượng kiểm nhận"]',0)
  await click('Từ chối');await set('[aria-label="Lý do từ chối"]',' Damaged ');await click('Xác nhận từ chối')
  await until(async()=> (await text()).includes('Đã từ chối lô hàng.'),'reject invalid confirm input')
  assert.deepEqual(JSON.parse(requests.findLast(r=>r.path.endsWith('/reject')).body),{reason:'Damaged'})
  completed.push('TC_UC27_005')
  await delay(1800) // wait for the receipt-page success navigation, then start a distinct scenario
  await navigate('/operation/product-batches/create');delayA=true
  await set('select[aria-label="Nhà cung cấp"]',2);await until(()=>evaluate(`!!document.querySelector('select[aria-label="Khai báo chờ xử lý"] option[value="7"]')`),'A option')
  await set('select[aria-label="Khai báo chờ xử lý"]',7);await until(()=>Promise.resolve(!!releaseA),'delayed A request')
  await set('select[aria-label="Nhà cung cấp"]',3);await until(()=>evaluate(`!!document.querySelector('select[aria-label="Khai báo chờ xử lý"] option[value="8"]')`),'B option')
  await set('select[aria-label="Khai báo chờ xử lý"]',8);await until(()=>val('Số lượng kiểm nhận').then(v=>v==='20'),'B data')
  delayA=false;releaseA();await delay(300)
  assert.equal(await val('Số lượng kiểm nhận'),'20');assert.equal(await val('Ghi chú tiếp nhận của staff'),'');completed.push('TC_UC27_007')

  await navigate('/operation/product-batches/7/edit');await until(()=>val('Số lượng kiểm nhận').then(v=>v==='100'),'open update')
  const saves = requests.filter(r=>r.path.endsWith('/receiving-details')).length
  await click('Lưu thay đổi');await until(async()=> (await text()).includes('Lô hàng đã được QC tiếp nhận'),'QC save conflict')
  assert.equal(await evaluate('!!document.querySelector("form")'),false)
  await evaluate("window.dispatchEvent(new Event('focus'))");await delay(300)
  assert.equal(requests.filter(r=>r.path.endsWith('/receiving-details')).length,saves+1,'no automatic save retry')
  await navigate('/operation/product-batches/7/edit');await until(async()=> (await text()).includes('Lô hàng đã được QC tiếp nhận'),'direct URL locked')
  assert.equal(await evaluate('!!document.querySelector("form")'),false);completed.push('TC_UC28_010')

  await navigate('/operation/product-batches/7');await until(async()=> (await text()).includes('+200 kg'),'receiving delta')
  assert.match(await text(),/Supplier only note/);assert.match(await text(),/Staff only note/)
  await until(async()=> (await text()).includes('Chưa có lịch sử trạng thái.'),'empty status history')
  await navigate('/operation/product-batches/9');await until(async()=> (await text()).includes('Receiving damage'),'reject reason');completed.push('TC_UC29_007')
  await navigate('/operation/product-batches/10');await until(async()=> (await text()).includes('Đang kiểm định'),'in-progress latest UI')
  assert.equal((await text()).includes('Đạt (PASS)'),false);completed.push('TC_UC29_003:IN_PROGRESS-UI','TC_UC29_005:empty-UI')
  await navigate('/operation/product-batches/0');await until(async()=> (await text()).includes('Mã lô hàng không hợp lệ'),'zero ID')
  await navigate('/operation/product-batches/999999');await until(async()=> (await text()).includes('Product batch not found.'),'missing ID');completed.push('TC_UC29_008:missing-UI')

  await navigate('/operation/goods-receipts');await until(async()=> (await text()).includes('GR-UI'),'goods list')
  await click('Sau');await until(()=>Promise.resolve(requests.some(r=>r.path==='/api/operation/goods-receipts'&&r.query.includes('page=2'))),'goods page2')
  await set('select[aria-label="Nhà cung cấp"]',2);await set('select[aria-label="Vị trí kho"]',1);await set('select[aria-label="Trạng thái"]','COMMITTED')
  await click('Áp dụng bộ lọc');await until(()=>Promise.resolve(requests.some(r=>r.path==='/api/operation/goods-receipts'&&r.query.includes('supplierId=2')&&r.query.includes('warehouseLocationId=1')&&r.query.includes('status=COMMITTED')&&r.query.includes('page=1'))),'combined goods filters reset page')
  for(const [selector,value,key] of [['Nhà cung cấp',3,'supplierId=3'],['Vị trí kho',2,'warehouseLocationId=2'],['Trạng thái','DRAFT','status=DRAFT']]){
    await set(`select[aria-label="${selector}"]`,value);await click('Áp dụng bộ lọc');await until(()=>Promise.resolve(requests.some(r=>r.path==='/api/operation/goods-receipts'&&r.query.includes(key))),'individual filter')
  }
  await set('select[aria-label="Nhà cung cấp"]','');await set('select[aria-label="Vị trí kho"]','');await set('select[aria-label="Trạng thái"]','');await click('Áp dụng bộ lọc')
  await until(()=>Promise.resolve(!requests.findLast(r=>r.path==='/api/operation/goods-receipts').query.includes('supplierId=')),'clear goods filters')
  completed.push('TC_UC30_007')

  // Supplier declaration unit modes: actual inputs, conversion, payload and legacy regression.
  qcLocked = false
  await page('Emulation.setDeviceMetricsOverride', { width:1365, height:1000, deviceScaleFactor:1, mobile:false })
  for (const [unit, quantity, perPackage, expectedKg] of [['Kg','975.125',null,975.125],['Tấn','0.975',null,975],['Bao','39',25,975],['Thùng','97',10.125,982.125]]) {
    const packaged = perPackage !== null
    unitFixture = {unit, declaredQuantity:packaged?100:1, weightInKg:1000,
      packagingType:packaged?unit:null, packageCount:packaged?100:null, packageUnitWeightKg:perPackage}
    if(unit==='Kg') unitFixture.declaredQuantity=1000
    if(packaged) unitFixture.weightInKg=100*perPackage
    await navigate('/operation/product-batches/create')
    await set('select[aria-label="Nhà cung cấp"]',2)
    await set('select[aria-label="Khai báo chờ xử lý"]',7)
    await until(()=>val('Số lượng kiểm nhận').then(v=>v===String(unitFixture.declaredQuantity)),`${unit} declaration loaded`)
    assert.match(await text(),/Giống \/ phân loại sản phẩm/)
    assert.match(await text(),/Grain/)
    assert.equal(await evaluate('document.querySelectorAll("dl input,dl textarea").length'),0)
    assert.equal(await evaluate('document.querySelector(\'[aria-label="Khối lượng kiểm nhận"]\').readOnly'),!packaged)
    assert.equal(await evaluate('!!document.querySelector(\'[aria-label="Quy cách đóng gói kiểm nhận"]\')'),false)
    await set('[aria-label="Số lượng kiểm nhận"]',quantity)
    if(packaged) {
      assert.equal(await val('Khối lượng kiểm nhận'),String(unitFixture.weightInKg),'package count edit preserves the displayed actual kg')
      await set('[aria-label="Khối lượng kiểm nhận"]',expectedKg)
    }
    assert.equal(await val('Khối lượng kiểm nhận'),String(expectedKg))
    if(packaged) {
      assert.equal(await evaluate('document.querySelectorAll(\'input[type="radio"]\').length'),0)
      assert.equal((await text()).includes('Cách ghi nhận khối lượng'),false)
      assert.equal(await evaluate('!!document.querySelector(\'[aria-label="Khối lượng mỗi kiện kiểm nhận"]\')'),false)
      assert.ok(await evaluate(`Math.abs(document.querySelector('[aria-label="Số lượng kiểm nhận"]').getBoundingClientRect().top-document.querySelector('[aria-label="Khối lượng kiểm nhận"]').getBoundingClientRect().top)<1`),'package count and total inputs align')
      const before = requests.filter(r=>r.path.endsWith('/verify')).length
      await set('[aria-label="Số lượng kiểm nhận"]','1.5')
      await click('Xác nhận lô hàng')
      await until(()=>evaluate('!!document.querySelector(\'[role="alert"]\')'),'fractional packages rejected')
      assert.equal(requests.filter(r=>r.path.endsWith('/verify')).length,before)
      await set('[aria-label="Số lượng kiểm nhận"]',quantity)
    }
    if(process.env.SAW_BROWSER_EVIDENCE_DIR) {
      await mkdir(process.env.SAW_BROWSER_EVIDENCE_DIR,{recursive:true})
      const capture=await page('Page.captureScreenshot',{captureBeyondViewport:true,fromSurface:true})
      await writeFile(path.join(process.env.SAW_BROWSER_EVIDENCE_DIR,`receiving-${unit}.png`),Buffer.from(capture.data,'base64'))
    }
    if(unit==='Bao') {
      await page('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
      await delay(400) // Let the shared sidebar finish its responsive transition before inspection.
      assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),true,'receiving form has no horizontal overflow on narrow viewport')
      if(process.env.SAW_BROWSER_EVIDENCE_DIR) {
        const capture=await page('Page.captureScreenshot',{captureBeyondViewport:true,fromSurface:true})
        await writeFile(path.join(process.env.SAW_BROWSER_EVIDENCE_DIR,'receiving-mobile.png'),Buffer.from(capture.data,'base64'))
      }
      await page('Emulation.setDeviceMetricsOverride',{width:1365,height:1000,deviceScaleFactor:1,mobile:false})
    }
    await click('Xác nhận lô hàng')
    await until(async()=>(await text()).includes('Đã xác nhận lô hàng và chuyển sang chờ kiểm định QC.'),`${unit} confirmed`)
    assert.deepEqual(JSON.parse(requests.findLast(r=>r.path.endsWith('/verify')).body),{
      verifiedQuantity:Number(quantity),verifiedWeightInKg:expectedKg,verifiedPackagingType:packaged?unit:null,
      verifiedPackageCount:packaged?Number(quantity):null,verifiedPackageUnitWeightKg:null,receivingNote:null,
    })
    completed.push(`receiving-unit:${unit}:form-and-payload`)
    await delay(1800)
  }
  unitFixture = {unit:'Thùng',declaredQuantity:100,quantity:100,weightInKg:1000,packagingType:'Thùng',packageCount:100,packageUnitWeightKg:10,
    verifiedQuantity:95,verifiedWeightInKg:950,verifiedPackageCount:95,verifiedPackageUnitWeightKg:10,verifiedPackagingType:'Thùng'}
  await navigate('/operation/product-batches/7/edit')
  await until(()=>val('Số lượng kiểm nhận').then(v=>v==='95'),'saved actual packages, not supplier quantity')
  assert.equal(await val('Khối lượng kiểm nhận'),'950')
  await set('[aria-label="Khối lượng kiểm nhận"]','902.5')
  assert.equal(await val('Khối lượng kiểm nhận'),'902.5')
  await click('Lưu thay đổi')
  await until(()=>evaluate("location.pathname==='/operation/product-batches/7'"),'updated receiving navigation')
  const updated=JSON.parse(requests.findLast(r=>r.path.endsWith('/receiving-details')).body)
  assert.equal(updated.verifiedWeightInKg,902.5)
  assert.equal(updated.verifiedPackageCount,95)
  assert.equal(updated.expectedUpdatedAt,fields.updatedAt)
  assert.equal(updated.expectedCreatedAt,fields.createdAt)
  completed.push('receiving-unit:saved-values-update-and-version')

  for (const unit of ['Bao','Thùng']) {
    unitFixture={unit,declaredQuantity:5,weightInKg:125,packagingType:unit,packageCount:5,packageUnitWeightKg:25}
    await navigate('/operation/product-batches/create')
    await set('select[aria-label="Nhà cung cấp"]',2)
    await set('select[aria-label="Khai báo chờ xử lý"]',7)
    await until(()=>val('Số lượng kiểm nhận').then(v=>v==='5'),`${unit} nonuniform declaration loaded`)
    await set('[aria-label="Số lượng kiểm nhận"]','4')
    assert.equal(await evaluate('document.querySelectorAll(\'input[type="radio"]\').length'),0)
    assert.equal(await evaluate('document.querySelector(\'[aria-label="Khối lượng kiểm nhận"]\').readOnly'),false)
    assert.equal(await evaluate('!!document.querySelector(\'[aria-label="Khối lượng mỗi kiện kiểm nhận"]\')'),false)
    await set('[aria-label="Khối lượng kiểm nhận"]','99')
    await set('[aria-label="Số lượng kiểm nhận"]','5')
    assert.equal(await val('Khối lượng kiểm nhận'),'99','package count edit must not overwrite actual measurement')
    await set('[aria-label="Ghi chú tiếp nhận của staff"]','Ghi nhận thực cân tại kho.')
    await click('Tính từ từng kiện / nhóm kiện')
    await set('[aria-label="Nhóm cân 1 - Số kiện"]','3')
    await set('[aria-label="Nhóm cân 1 - Kg mỗi kiện"]','25')
    await click('Thêm nhóm cân')
    await set('[aria-label="Nhóm cân 2 - Số kiện"]','1')
    await set('[aria-label="Nhóm cân 2 - Kg mỗi kiện"]','24')
    await click('Tính toán')
    assert.match(await text(),/Tổng số kiện trong bảng cân phải bằng số kiện kiểm nhận/)
    assert.equal(await val('Khối lượng kiểm nhận'),'99','invalid groups do not alter the measured total')
    await click('Thêm nhóm cân')
    await set('[aria-label="Nhóm cân 3 - Số kiện"]','1')
    await set('[aria-label="Nhóm cân 3 - Kg mỗi kiện"]','20')
    await click('Tính toán')
    assert.equal(await val('Khối lượng kiểm nhận'),'119')
    assert.match(await val('Ghi chú tiếp nhận của staff'),/Ghi nhận thực cân tại kho\./)
    assert.match(await val('Ghi chú tiếp nhận của staff'),/3 kiện × 25 kg \+ 1 kiện × 24 kg \+ 1 kiện × 20 kg = 119 kg/)
    if(process.env.SAW_BROWSER_EVIDENCE_DIR) {
      const capture=await page('Page.captureScreenshot',{captureBeyondViewport:true,fromSurface:true})
      await writeFile(path.join(process.env.SAW_BROWSER_EVIDENCE_DIR,`receiving-mixed-${unit}.png`),Buffer.from(capture.data,'base64'))
    }
    await click('Xác nhận lô hàng')
    await until(async()=>(await text()).includes('Đã xác nhận lô hàng và chuyển sang chờ kiểm định QC.'),'nonuniform measurement submitted')
    const payload=JSON.parse(requests.findLast(r=>r.path.endsWith('/verify')).body)
    assert.equal(payload.verifiedQuantity,5)
    assert.equal(payload.verifiedPackageCount,5)
    assert.equal(payload.verifiedWeightInKg,119)
    assert.equal(payload.verifiedPackageUnitWeightKg,null)
    completed.push(`receiving-nonuniform:${unit}:count-validation-real-total-and-note`)
    await delay(1800)
  }
  unitFixture={unit:'Bao',quantity:5,declaredQuantity:5,weightInKg:125,packagingType:'Bao',packageCount:5,packageUnitWeightKg:25,
    verifiedQuantity:5,verifiedWeightInKg:119,verifiedPackageCount:5,verifiedPackageUnitWeightKg:null,verifiedPackagingType:'Bao',receivingNote:'3 x 25 + 24 + 20 = 119 kg'}
  await navigate('/operation/product-batches/7/edit')
  await until(()=>val('Khối lượng kiểm nhận').then(v=>v==='119'),'reopen saved nonuniform total')
  assert.equal(await evaluate('document.querySelector(\'[aria-label="Khối lượng kiểm nhận"]\').readOnly'),false)
  assert.equal(await val('Ghi chú tiếp nhận của staff'),'3 x 25 + 24 + 20 = 119 kg')
  await set('[aria-label="Khối lượng kiểm nhận"]','118.5')
  await click('Lưu thay đổi')
  await until(()=>evaluate("location.pathname==='/operation/product-batches/7'"),'save edited nonuniform total')
  const actualUpdate=JSON.parse(requests.findLast(r=>r.path.endsWith('/receiving-details')).body)
  assert.equal(actualUpdate.verifiedWeightInKg,118.5)
  assert.equal(actualUpdate.verifiedPackageUnitWeightKg,null)
  completed.push('receiving-nonuniform:reopen-and-update-measured-total')
  role='QC_STAFF';await auth()
  for (const unit of ['Bao','Thùng']) {
    unitFixture={unit,quantity:5,declaredQuantity:5,verifiedQuantity:4,verifiedWeightInKg:100,productName:'Cà rốt Đà Lạt Nông xã Xanh',cropTypeName:'Cà rốt Đà Lạt'}
    await navigate('/qc/inspections/new')
    await set('select[id$="-batch"]',1)
    await until(async()=>(await text()).includes(`4 ${unit}`),'QC lookup uses verified count')
    assert.equal(await evaluate('document.querySelector(\'select[id$="-batch"] option:checked\').textContent.trim()'),'[LIST-1] Cà rốt Đà Lạt · Cà rốt Đà Lạt Nông xã Xanh')
    assert.equal((await text()).includes('Khối lượng khai báo:'),false)
    assert.equal((await text()).includes(`5 ${unit}`),false)
    assert.match(await text(),/Khối lượng:/)
    if(process.env.SAW_BROWSER_EVIDENCE_DIR) {
      const capture=await page('Page.captureScreenshot',{captureBeyondViewport:true,fromSurface:true})
      await writeFile(path.join(process.env.SAW_BROWSER_EVIDENCE_DIR,`qc-received-${unit}.png`),Buffer.from(capture.data,'base64'))
    }
    completed.push(`qc-lookup:${unit}:verified-count-without-option-quantity`)
  }
  unitFixture={...unitFixture,verifiedQuantity:null}
  await navigate('/qc/inspections/new');await set('select[id$="-batch"]',1)
  await until(async()=>(await text()).includes('Chưa có số liệu kiểm nhận'),'missing measurement is not replaced with declaration')
  await navigate('/qc/inspections/13')
  await until(async()=>(await text()).includes('12.50 kg'),'previous sampling size loaded')
  await click('Lưu tỷ lệ')
  await until(async()=>(await text()).includes('10.00 kg'),'sampling result reloaded from API')
  assert.equal((await text()).includes('12.50 kg'),false)
  assert.deepEqual(JSON.parse(requests.findLast(r=>r.path.endsWith('/sampling-ratio')).body),{samplingRatio:0.1})
  completed.push('qc-sampling:save-ratio-and-display-reloaded-result')
  unitFixture = null
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({result:'Passed',mode:'Edge + mocked API; no SQL or Cloudinary writes',cases:completed,cancelledObsoleteARequests:cancelledA,requests:requests.map(r=>({path:r.path,query:r.query,method:r.method}))},null,2))
  await call('Browser.close')
} finally {
  socket?.close();edge?.kill();await vite.close()
  const resolved=path.resolve(temp)
  assert.equal(path.dirname(resolved),path.resolve(tmpdir()));assert.ok(path.basename(resolved).startsWith('saw-receiving-workflows-browser-'))
  await rm(resolved,{recursive:true,force:true,maxRetries:10,retryDelay:300})
}
