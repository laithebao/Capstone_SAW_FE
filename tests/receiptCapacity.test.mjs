import assert from 'node:assert/strict'
import { test } from 'node:test'
import { receiptCapacityLabel } from '../src/features/operation/receiptCapacity.ts'

const location = { id: 1, name: 'A-01', isActive: true, maxWeightKg: 100, usedWeightKg: 60, remainingWeightKg: 40, hasNonKgInventory: false }
test('receipt capacity distinguishes fitting, exact fit, full and insufficient locations', () => {
  assert.equal(receiptCapacityLabel(location, 30), null)
  assert.equal(receiptCapacityLabel(location, 40), null)
  assert.match(receiptCapacityLabel(location, 50), /Thiếu 10 kg/)
  assert.equal(receiptCapacityLabel({ ...location, usedWeightKg: 100, remainingWeightKg: 0 }, 50), 'Thiếu 50 kg')
})
test('unknown measurements and unconfigured capacity never imply zero or verified free space', () => {
  assert.equal(receiptCapacityLabel({ ...location, hasNonKgInventory: true }, 50), 'Cần kiểm tra đơn vị tồn kho')
  assert.equal(receiptCapacityLabel({ ...location, usedWeightKg: null, remainingWeightKg: null }, 50), 'Chưa xác định sức chứa còn lại')
  assert.equal(receiptCapacityLabel({ ...location, maxWeightKg: null, remainingWeightKg: null }, 50), 'Chưa đặt giới hạn')
  assert.equal(receiptCapacityLabel({ ...location, remainingWeightKg: null }, 50), 'Chưa xác định sức chứa còn lại')
})
