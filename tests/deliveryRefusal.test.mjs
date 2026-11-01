import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canRefuseDelivery, MAX_REFUSAL_IMAGE_BYTES, validateRefusalImage } from '../src/features/distributor-orders/deliveryRefusal.ts'

test('refusal remains available for remaining lots before or after receipt, including partially refused orders', () => {
  for (const status of ['ISSUED', 'DISPATCHED', 'DELIVERED', 'PARTIALLY_REFUSED']) {
    assert.equal(canRefuseDelivery(status, true), true)
    assert.equal(canRefuseDelivery(status, false), false)
  }
  for (const status of ['PENDING', 'APPROVED', 'RESERVED', 'PARTIALLY_ISSUED', 'CANCELLED', 'REJECTED', 'RETURNED', 'DELIVERY_REFUSED'])
    assert.equal(canRefuseDelivery(status, true), false)
})

test('photo evidence accepts supported image types and enforces nonempty 10 MB maximum', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
    assert.equal(validateRefusalImage({ type, size: 1 }), null)
    assert.equal(validateRefusalImage({ type, size: MAX_REFUSAL_IMAGE_BYTES }), null)
    assert.notEqual(validateRefusalImage({ type, size: 0 }), null)
    assert.notEqual(validateRefusalImage({ type, size: MAX_REFUSAL_IMAGE_BYTES + 1 }), null)
  }
  for (const type of ['application/pdf', 'text/html', 'image/svg+xml', 'application/octet-stream'])
    assert.notEqual(validateRefusalImage({ type, size: 100 }), null)
})
