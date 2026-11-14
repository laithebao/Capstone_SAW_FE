import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { test } from 'node:test'
import axios, { AxiosError } from 'axios'

// Resolve the Vite imports and run the real services and Axios interceptors.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context)
    }
    return nextResolve(specifier === './apiClient' ? './apiClient.ts' : specifier, context)
  },
  load(url, context, nextLoad) {
    const result = nextLoad(url, context)
    if (url.endsWith('/src/services/apiClient.ts')) {
      return { ...result, source: String(result.source).replace('import.meta.env.VITE_API_BASE_URL', 'undefined') }
    }
    return result
  },
})

const { apiClient } = await import('../src/services/apiClient.ts')
const { sendAiChatMessage } = await import('../src/services/aiChatService.ts')
const { generateSpoilageForecasts, getLatestSpoilageForecasts } = await import('../src/services/spoilageForecastService.ts')

function response(config, data, status = 200) {
  return { config, status, statusText: String(status), headers: {}, data }
}

function mockAdapter(t, handleRequest) {
  const original = apiClient.defaults.adapter
  const adapter = t.mock.fn(handleRequest)
  apiClient.defaults.adapter = adapter
  t.after(() => { apiClient.defaults.adapter = original })
  return adapter
}

test('chat sends the current batch and conversation and returns the API business error', async (t) => {
  const signal = new AbortController().signal
  const request = {
    message: 'Lô này bảo quản thế nào?',
    batchContextCode: 'LOT-01',
    history: [{ role: 'model', content: 'Chào bạn' }],
  }
  const reply = { reply: 'Bạn đã gửi quá nhiều tin nhắn.', isError: true }
  const adapter = mockAdapter(t, async (config) => {
    assert.equal(config.method, 'post')
    assert.equal(config.url, '/distributor/ai-chat')
    assert.equal(config.signal, signal)
    assert.equal(config.timeout, 180_000)
    assert.deepEqual(JSON.parse(config.data), request)
    return response(config, { data: reply })
  })

  assert.deepEqual(await sendAiChatMessage(request, signal), reply)
  assert.equal(adapter.mock.callCount(), 1)
})

test('forecast uses POST to generate and GET to read the saved results', async (t) => {
  const signal = new AbortController().signal
  const forecast = { productBatchId: 42, riskLevel: 'HIGH', predictedLossPercent: null, actions: [] }
  const adapter = mockAdapter(t, async (config) => {
    assert.equal(config.url, '/warehouse/spoilage-forecast')
    assert.equal(config.signal, signal)
    assert.equal(config.data, undefined)
    if (config.method === 'post') assert.equal(config.timeout, 0)
    return response(config, { data: [{ ...forecast, isFromCache: config.method === 'get' }] })
  })

  assert.deepEqual(await generateSpoilageForecasts(signal), [{ ...forecast, isFromCache: false }])
  assert.deepEqual(await getLatestSpoilageForecasts(signal), [{ ...forecast, isFromCache: true }])
  assert.deepEqual(adapter.mock.calls.map(({ arguments: [config] }) => config.method), ['post', 'get'])
})

test('forecast preserves the server message when generation fails', async (t) => {
  const data = { message: 'AI chưa tạo được dự báo. Vui lòng thử lại.' }
  mockAdapter(t, async (config) => {
    throw new AxiosError('Bad Gateway', undefined, config, undefined, response(config, data, 502))
  })

  await assert.rejects(generateSpoilageForecasts(new AbortController().signal), (error) => {
    assert.ok(axios.isAxiosError(error))
    assert.equal(error.response.status, 502)
    assert.deepEqual(error.response.data, data)
    return true
  })
})

test('an aborted AI request never reaches the HTTP adapter', async (t) => {
  const adapter = mockAdapter(t, async () => assert.fail('Unexpected request'))
  const signal = AbortSignal.abort()

  await assert.rejects(sendAiChatMessage({ message: 'Xin chào', history: [] }, signal), axios.isCancel)
  await assert.rejects(generateSpoilageForecasts(signal), axios.isCancel)
  await assert.rejects(getLatestSpoilageForecasts(signal), axios.isCancel)
  assert.equal(adapter.mock.callCount(), 0)
})
