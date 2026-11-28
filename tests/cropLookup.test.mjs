import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { test } from 'node:test'
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('@/')) return next(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context)
    if (specifier.startsWith('.') && !/\.[cm]?[jt]sx?$/.test(specifier)) return next(specifier + '.ts', context)
    return next(specifier, context)
  },
  load(url, context, next) {
    const result = next(url, context)
    return url.endsWith('/src/services/apiClient.ts') ? { ...result, source: String(result.source).replace('import.meta.env.VITE_API_BASE_URL', 'undefined') } : result
  },
})
const { apiClient } = await import('../src/services/apiClient.ts')
const { getCropTypeLookup, getCropTypes } = await import('../src/services/cropTypeService.ts')
const { saveCropTypeBasics } = await import('../src/services/cropTypeService.ts')
const { capitalizeFirst } = await import('../src/utils/displayName.ts')
const { getVietnamDateInput, formatVietnamDateTime } = await import('../src/utils/vietnamTime.ts')
const { supplierService } = await import('../src/services/suppliers/supplierService.ts')
const response = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} })
function adapter(t, fn) { const old = apiClient.defaults.adapter; apiClient.defaults.adapter = fn; t.after(() => { apiClient.defaults.adapter = old }) }

test('basic edit sends no hidden storage values and keeps crop identity', async t => {
  const calls = []
  adapter(t, config => { calls.push(config); return Promise.resolve(response(config, { data: { id: 7 } })) })
  await saveCropTypeBasics({ code: 'NGO_ST25', name: 'Ngô ST25', categoryId: 2, isActive: true }, 7)
  assert.equal(calls[0].url, '/crop-types/7/basic')
  assert.deepEqual(Object.keys(JSON.parse(calls[0].data)).sort(), ['categoryId', 'code', 'isActive', 'name'])
})

test('Vietnam date crosses UTC midnight correctly and capitalization preserves Vietnamese and acronyms', () => {
  assert.equal(getVietnamDateInput(new Date('2026-11-26T16:59:59Z')), '2026-11-26')
  assert.equal(getVietnamDateInput(new Date('2026-11-26T17:00:00Z')), '2026-11-27')
  assert.equal(capitalizeFirst(' ngô ST25 '), 'Ngô ST25')
  assert.equal(capitalizeFirst(' đậu xanh '), 'Đậu xanh')
  assert.equal(formatVietnamDateTime('2026-11-26T17:00:00'), formatVietnamDateTime('2026-11-27T00:00:00+07:00'))
})

test('lookup carries category, search, page and cancellation without altering management pagination', async t => {
  const controller = new AbortController(), calls = []
  adapter(t, config => { calls.push(config); return Promise.resolve(response(config, { data: { items: [], totalCount: 130, page: config.params.page, pageSize: config.params.pageSize } })) })
  const result = await getCropTypeLookup({ categoryId: 7, search: 'LAST_CODE', page: 7 }, controller.signal)
  assert.equal(result.totalCount, 130); assert.equal(calls[0].url, '/crop-types/lookup')
  assert.deepEqual(calls[0].params, { page: 7, pageSize: 20, categoryId: 7, search: 'LAST_CODE' }); assert.equal(calls[0].signal, controller.signal)
  await getCropTypes('query', 4, 20)
  assert.equal(calls[1].url, '/crop-types'); assert.equal(calls[1].params.page, 4); assert.equal(calls[1].params.pageSize, 20)
})

test('legacy metadata helper traverses pages instead of silently dropping crops after 100', async t => {
  const pages = []
  adapter(t, config => {
    pages.push(config.params.page)
    const start = (config.params.page - 1) * 100, count = config.params.page === 1 ? 100 : 30
    return Promise.resolve(response(config, { data: { items: Array.from({ length: count }, (_, i) => ({ id: start + i + 1, code: 'C' + (start + i + 1), name: 'Crop', categoryName: 'Category' })), totalCount: 130 } }))
  })
  const crops = await supplierService.getCropTypes()
  assert.deepEqual(pages, [1, 2]); assert.equal(crops.length, 130); assert.equal(crops[129].cropTypeId, 130)
})

test('saved supplier metadata is retained completely and does not depend on a lookup page', async t => {
  const saved = Array.from({ length: 130 }, (_, i) => ({ cropTypeId: i + 1, cropCode: 'SAVED_' + i, cropName: 'Stored ' + i, categoryName: 'Legacy group' }))
  adapter(t, config => { assert.equal(config.url, '/suppliers/me/profile'); return Promise.resolve(response(config, { cropTypes: saved })) })
  const profile = await supplierService.getMyProfile()
  assert.equal(profile.cropTypes.length, 130); assert.equal(profile.cropTypes[129].cropName, 'Stored 129')
})
