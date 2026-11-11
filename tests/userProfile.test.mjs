import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { test } from 'node:test'
import axios, { AxiosError } from 'axios'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context)
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    const result = nextLoad(url, context)
    if (url.endsWith('/src/services/apiClient.ts')) return { ...result, source: String(result.source).replace('import.meta.env.VITE_API_BASE_URL', 'undefined') }
    return result
  },
})

const { apiClient } = await import('../src/services/apiClient.ts')
const { getMyProfile, updateMyProfile, getProfileErrorMessage } = await import('../src/services/userProfileService.ts')
const { userProfileSchema } = await import('../src/features/auth/schemas/userProfileSchema.ts')
const { supplierContactSchema, declareSupplierProfileSchema, updateSupplierProfileSchema } = await import('../src/features/supplier/schemas/supplierProfileSchema.ts')
const { getValidationFieldErrors, getApiFieldErrors, getHookFormFieldErrors } = await import('../src/utils/formErrors.ts')
const profile = { accountId: 7, fullName: 'Test', email: 'login@saw.local', roleCode: 'QC_STAFF', distributor: null }
const response = (config, data, status = 200) => ({ config, status, statusText: String(status), headers: {}, data })
function adapter(t, handler) {
  const original = apiClient.defaults.adapter
  const mock = t.mock.fn(handler)
  apiClient.defaults.adapter = mock
  t.after(() => { apiClient.defaults.adapter = original })
  return mock
}

test('profile uses the current-account endpoint and unwraps the API response', async t => {
  const signal = new AbortController().signal
  adapter(t, config => {
    assert.equal(config.url, '/user-profiles/me')
    assert.equal(config.method, 'get')
    assert.equal(config.signal, signal)
    assert.equal(config.data, undefined)
    return Promise.resolve(response(config, { data: profile }))
  })
  assert.deepEqual(await getMyProfile(signal), profile)
})

test('saving sends personal and distributor data in one request without identity parameters', async t => {
  const request = { fullName: 'New', phoneNumber: '0901234567', distributor: {
    distributorName: 'Company', contactPerson: 'Contact', phoneNumber: null, email: null, address: 'Address',
  } }
  const mock = adapter(t, config => {
    assert.equal(config.url, '/user-profiles/me')
    assert.equal(config.method, 'put')
    assert.deepEqual(JSON.parse(config.data), { ...request, distributor: { ...request.distributor, taxCode: '0123456789' } })
    return Promise.resolve(response(config, { data: { ...profile, fullName: 'New' } }))
  })
  assert.equal((await updateMyProfile(request, '0123456789')).fullName, 'New')
  assert.equal(mock.mock.callCount(), 1)
})

test('saving includes the registered tax snapshot when the running API requires TaxCode', async t => {
  const request = { fullName: 'Updated name', phoneNumber: '0901000006', distributor: {
    distributorName: 'Company', contactPerson: 'Contact', phoneNumber: '0901000006', email: 'contact@example.com', address: 'Address',
  } }
  adapter(t, config => {
    const body = JSON.parse(config.data)
    if (!body.distributor.taxCode) return Promise.reject(new AxiosError('Bad Request', undefined, config, undefined,
      response(config, { errors: { 'Distributor.TaxCode': ['The TaxCode field is required.'] } }, 400)))
    assert.equal(body.distributor.taxCode, '0319999002')
    return Promise.resolve(response(config, { data: { ...profile, fullName: 'Updated name' } }))
  })
  assert.equal((await updateMyProfile(request, '0319999002')).fullName, 'Updated name')
  assert.equal('taxCode' in request.distributor, false)
})

test('distributor save requires a loaded tax snapshot and never uses a tax value injected into editable fields', async t => {
  const request = { fullName: 'Updated name', phoneNumber: null, distributor: {
    distributorName: 'Company', contactPerson: null, phoneNumber: null, email: null, address: null, taxCode: 'FORGED',
  } }
  const mock = adapter(t, config => {
    assert.equal(JSON.parse(config.data).distributor.taxCode, '0319999002')
    return Promise.resolve(response(config, { data: profile }))
  })
  for (const snapshot of [undefined, null, '', ' ']) {
    await assert.rejects(updateMyProfile(request, snapshot), /Không đọc được mã số thuế/)
  }
  assert.equal(mock.mock.callCount(), 0)
  await updateMyProfile(request, '0319999002')
  assert.equal(mock.mock.callCount(), 1)
  assert.equal(request.distributor.taxCode, 'FORGED')
})

test('staff save does not require or send a business tax snapshot', async t => {
  const request = { fullName: 'Updated staff', phoneNumber: '0901234567', distributor: null }
  adapter(t, config => {
    assert.deepEqual(JSON.parse(config.data), request)
    return Promise.resolve(response(config, { data: profile }))
  })
  await updateMyProfile(request)
})

test('profile displays validation details and preserves duplicate-tax and network error messages', async t => {
  const validation = new AxiosError('Unprocessable', undefined, undefined, undefined, response({}, { message: 'Validation failed', errors: ['Họ và tên không được để trống.', 'Email không hợp lệ.'] }, 422))
  assert.equal(getProfileErrorMessage(validation, 'Fallback'), 'Họ và tên không được để trống. Email không hợp lệ.')
  adapter(t, config => Promise.reject(new AxiosError('Conflict', undefined, config, undefined, response(config, { message: 'Mã số thuế đã được sử dụng.' }, 409))))
  await assert.rejects(updateMyProfile({ fullName: 'Test', phoneNumber: null, distributor: null }), error => {
    assert.equal(getProfileErrorMessage(error, 'Fallback'), 'Mã số thuế đã được sử dụng.')
    return true
  })
  assert.equal(getProfileErrorMessage(new Error('Request failed'), 'Fallback'), 'Request failed')
})

test('cancelled profile loads never reach the HTTP adapter', async t => {
  const mock = adapter(t, () => assert.fail('Unexpected request'))
  await assert.rejects(getMyProfile(AbortSignal.abort()), axios.isCancel)
  assert.equal(mock.mock.callCount(), 0)
})

const draft = () => ({ fullName: 'User', phoneNumber: '0901234567', distributor: {
  distributorName: 'Company', contactPerson: 'Contact', phoneNumber: '0901234567', email: 'contact@example.com', address: 'Address',
} })

test('editable profile draft excludes registered tax code and other server-owned business fields', () => {
  const request = draft()
  const result = userProfileSchema.parse({ ...request, distributor: { ...request.distributor, taxCode: 'injected', distributorCode: 'injected', profileStatus: 'INACTIVE' } })
  assert.deepEqual(result, request)
  assert.equal('taxCode' in result.distributor, false)
})

test('both profile schemas normalize the registration phone formats', () => {
  for (const [input, expected] of [['0901234567', '0901234567'], ['+84 901 234 567', '+84901234567'], ['090.123.4567', '0901234567'], ['090-123-4567', '0901234567']]) {
    const request = draft(); request.phoneNumber = input; request.distributor.phoneNumber = input
    const result = userProfileSchema.parse(request)
    assert.equal(result.phoneNumber, expected)
    assert.equal(result.distributor.phoneNumber, expected)
    assert.equal(supplierContactSchema.parse({ phoneNumber: input }).phoneNumber, expected)
  }
})

test('both profile schemas reject malformed phone numbers instead of accepting arbitrary text', () => {
  for (const phone of ['1234567890', '090123456', '09012345678', '+840901234567', '(090)1234567', '0.....', '0901234567 ext 1']) {
    const request = draft()
    assert.equal(userProfileSchema.safeParse({ ...request, phoneNumber: phone }).success, false, phone)
    assert.equal(userProfileSchema.safeParse({ ...request, distributor: { ...request.distributor, phoneNumber: phone } }).success, false, phone)
    assert.equal(supplierContactSchema.safeParse({ phoneNumber: phone }).success, false, phone)
  }
})

test('email format matches registration and rejects display names or missing domains', () => {
  const request = draft()
  for (const email of ['invalid', 'user@host', 'Name <user@example.com>', 'a..b@example.com', 'a b@example.com', '.user@example.com', 'user@example.c']) {
    assert.equal(userProfileSchema.safeParse({ ...request, distributor: { ...request.distributor, email } }).success, false, email)
    assert.equal(supplierContactSchema.safeParse({ email }).success, false, email)
  }
  assert.equal(supplierContactSchema.parse({ email: ' first.last+orders@example.com ' }).email, 'first.last+orders@example.com')
})

test('optional contacts can still be cleared and supplier length limits remain enforced', () => {
  const request = draft()
  const result = userProfileSchema.parse({ ...request, phoneNumber: ' ', distributor: { ...request.distributor, phoneNumber: ' ', email: ' ' } })
  assert.equal(result.phoneNumber, null); assert.equal(result.distributor.phoneNumber, null); assert.equal(result.distributor.email, null)
  assert.deepEqual(supplierContactSchema.parse({ phoneNumber: '', email: '' }), { phoneNumber: '', email: '' })
  assert.equal(supplierContactSchema.safeParse({ email: `${'a'.repeat(140)}@example.com` }).success, false)
})

test('initial supplier declaration retains required contacts and accepts the registration phone format', () => {
  const request = { supplierName: 'Supplier', taxCode: '0123456789', legalRepresentative: 'Owner', contactPerson: 'Contact', phoneNumber: '+84 901 234 567',
    email: 'supplier@example.com', address: 'Address', growingAreas: [{ growingAreaId: 1 }], cropTypeIds: [1], certifications: [] }
  assert.equal(declareSupplierProfileSchema.parse(request).phoneNumber, '+84901234567')
  assert.equal(declareSupplierProfileSchema.safeParse({ ...request, phoneNumber: '' }).success, false)
  assert.equal(declareSupplierProfileSchema.safeParse({ ...request, email: '' }).success, false)
})

test('field errors preserve the first message per input and keep nested distributor fields distinct', () => {
  const fields = getValidationFieldErrors([
    { path: ['phoneNumber'], message: 'Personal phone' },
    { path: ['phoneNumber'], message: 'Second personal error' },
    { path: ['distributor', 'phoneNumber'], message: 'Business phone' },
    { path: ['growingAreas', 0, 'growingAreaId'], message: 'Area required' },
    { path: [], message: 'General form error' },
  ])
  assert.deepEqual(fields, { phoneNumber: 'Personal phone', 'distributor.phoneNumber': 'Business phone', 'growingAreas.0.growingAreaId': 'Area required' })
})

const serverError = body => new AxiosError('Validation', undefined, undefined, undefined, response({}, body, 422))

test('API validation arrays bind each red line to the correct personal or business input', () => {
  const labels = { phoneNumber: 'Số điện thoại cá nhân', 'distributor.phoneNumber': 'Số điện thoại liên hệ', 'distributor.email': 'Email liên hệ' }
  const fields = getApiFieldErrors(serverError({ errors: ['Số điện thoại cá nhân không hợp lệ.', 'Số điện thoại liên hệ không hợp lệ.', 'Email liên hệ không hợp lệ.', 'Unknown business error'] }), labels)
  assert.deepEqual(fields, { phoneNumber: 'Số điện thoại cá nhân không hợp lệ.', 'distributor.phoneNumber': 'Số điện thoại liên hệ không hợp lệ.', 'distributor.email': 'Email liên hệ không hợp lệ.' })
})

test('ProblemDetails keys support casing, request prefixes, nested fields and array indexes', () => {
  const labels = { phoneNumber: 'Phone', 'distributor.email': 'Email', 'growingAreas.0.growingAreaId': 'Area' }
  const fields = getApiFieldErrors(serverError({ errors: {
    'request.PhoneNumber': ['Phone invalid'], '$.Distributor.Email': ['Email invalid'],
    'GrowingAreas[0].GrowingAreaId': ['Area required'], Unknown: ['Unrelated'], constructor: ['Not a form field'],
  } }), labels)
  assert.deepEqual(fields, { phoneNumber: 'Phone invalid', 'distributor.email': 'Email invalid', 'growingAreas.0.growingAreaId': 'Area required' })
})

test('single-message server errors bind only when a known field label matches', () => {
  assert.deepEqual(getApiFieldErrors(serverError({ message: 'Mã số thuế không thể thay đổi.' }), { taxCode: 'Mã số thuế' }), { taxCode: 'Mã số thuế không thể thay đổi.' })
  for (const error of [new Error('Network'), serverError(null), serverError({ errors: [null, 1, {}] }), serverError({ message: 'Server unavailable' })])
    assert.deepEqual(getApiFieldErrors(error, { email: 'Email' }), {})
})

test('nested hook-form errors flatten without traversing DOM refs', () => {
  const ref = {}; ref.parent = ref
  assert.deepEqual(getHookFormFieldErrors({ supplierName: { message: 'Name required', ref }, growingAreas: [{ growingAreaId: { message: 'Area required', ref } }] }),
    { supplierName: 'Name required', 'growingAreas.0.growingAreaId': 'Area required' })
})

test('supplier edit exposes all invalid fields while preserving optional contact fields', () => {
  const request = { supplierName: ' ', taxCode: '0123456789', legalRepresentative: ' ', contactPerson: '', address: '', cropTypeIds: [], phoneNumber: 'letters', email: 'not-email' }
  const validation = updateSupplierProfileSchema.safeParse(request)
  assert.equal(validation.success, false)
  const fields = getValidationFieldErrors(validation.error.issues)
  assert.deepEqual(Object.keys(fields).sort(), ['supplierName', 'legalRepresentative', 'contactPerson', 'address', 'cropTypeIds', 'phoneNumber', 'email'].sort())
  assert.equal(updateSupplierProfileSchema.safeParse({ ...request, supplierName: 'Company', legalRepresentative: 'Owner', contactPerson: 'Contact', address: 'Address', cropTypeIds: [1], phoneNumber: '', email: '' }).success, true)
})
