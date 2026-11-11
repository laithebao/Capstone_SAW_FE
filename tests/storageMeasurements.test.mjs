import assert from 'node:assert/strict'
import { test } from 'node:test'
import { declareBatchSchema, updateBatchSchema } from '../src/features/supplier/schemas/supplierBatchSchema.ts'

const valid = { supplyContractId: 1, cropTypeId: 1, growingAreaId: 1, productName: 'Mango', unit: 'Kg', declaredQuantity: 250.123, harvestDate: '2026-01-01', expectedDeliveryDate: '2026-01-02' }

test('storage inputs accept fractional measurements for the API to round without changing weight precision', () => {
  for (const schema of [declareBatchSchema, updateBatchSchema]) {
    const result = schema.parse({ ...valid, expectedMinTempC: -1.005, expectedMaxTempC: 25.678, expectedMinHumidityPct: 12.345, expectedMaxHumidityPct: 89.995 })
    assert.equal(result.expectedMinTempC, -1.005)
    assert.equal(result.expectedMaxTempC, 25.678)
    assert.equal(result.declaredQuantity, 250.123)
  }
})

test('fractional inputs retain humidity and min/max constraints before rounding', () => {
  for (const input of [{ expectedMinHumidityPct: -0.001 }, { expectedMaxHumidityPct: 100.001 }, { expectedMinTempC: 1.0054, expectedMaxTempC: 1.0053 }])
    assert.equal(updateBatchSchema.safeParse({ ...valid, ...input }).success, false)
})

test('rounded measurements cannot overflow decimal six two and optional measurements stay empty', () => {
  for (const expectedMinTempC of [9999.995, -9999.995, NaN, Infinity])
    assert.equal(updateBatchSchema.safeParse({ ...valid, expectedMinTempC }).success, false)
  for (const expectedMinTempC of [9999.994, -9999.994])
    assert.equal(updateBatchSchema.safeParse({ ...valid, expectedMinTempC }).success, true)
  assert.equal(updateBatchSchema.parse(valid).expectedMinTempC, null)
})
