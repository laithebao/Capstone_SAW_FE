import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateCropCode } from '../src/utils/cropCode.ts'
import { formatCurrencyInput, parseCurrencyInput, isValidPrice } from '../src/utils/currency.ts'
import { generateCategoryCode } from '../src/utils/categoryCode.ts'
const date = new Date('2026-11-25T03:00:00Z')

test('category code generation keeps full child words, initials only for multiword parents', () => {
  for (const [name, expected] of [['Trái cây','TC'],['Ngũ cốc','NC'],['Rau ăn lá','RAL'],['Cây công nghiệp','CCN'],['Ổi','OI']]) assert.equal(generateCategoryCode(name, false), expected)
  for (const [name, expected] of [['Ổi','OI'],['Hạt dài','HATDAI'],['Thanh long','THANHLONG'],['Khoai tây','KHOAITAY'],['Sầu riêng','SAURIENG']]) assert.equal(generateCategoryCode(name, true), expected)
})

test('currency accepts partially edited grouping through thousands and millions', () => {
  let canonical = ''
  for (const digit of '9000000') canonical = parseCurrencyInput(formatCurrencyInput(canonical) + digit)
  assert.equal(canonical, '9000000'); assert.equal(formatCurrencyInput(canonical), '9.000.000')
  assert.equal(parseCurrencyInput('9.0000'), '90000')
  assert.equal(parseCurrencyInput('1.000.000'), '1000000')
})
test('crop codes: Vietnamese normalization, real prefix boundary and fallback', () => {
  assert.equal(generateCropCode('TC', 'XOAI', 'Xoài', 'Xoài Đà Lạt', date), 'TC_XOAI_DALAT_25112026')
  assert.equal(generateCropCode('TC', 'XOAI', 'Xoài', 'Xoài Cát Hòa Lộc', date), 'TC_XOAI_CATHOALOC_25112026')
  assert.equal(generateCropCode('TC', 'XOAI', 'Xoài', 'Xoài', date), 'TC_XOAI_XOAI_25112026')
  assert.equal(generateCropCode('TC', 'XOAI', 'Xoài', 'Xoàix Đà Lạt', date), 'TC_XOAI_XOAIXDALAT_25112026')
  assert.equal(generateCropCode('', 'XOAI', 'Xoài', 'Xoài', date), '')
  assert.equal(generateCropCode('TC', 'XOAI', 'Xoài', '!!!', date), '')
})
test('crop date uses Vietnam timezone across UTC midnight', () => {
  assert.equal(generateCropCode('TC', 'XOAI', 'Xoài', 'Xoài', new Date('2026-11-24T18:00:00Z')), 'TC_XOAI_XOAI_25112026')
})
test('currency retains cents and rejects unsafe or malformed input', () => {
  assert.equal(formatCurrencyInput('1000.10'), '1.000,10')
  assert.equal(parseCurrencyInput('1.000,10'), '1000.10')
  assert.equal(parseCurrencyInput('1.000'), '1000')
  assert.equal(parseCurrencyInput('1000,'), '1000.')
  assert.equal(parseCurrencyInput('1,234'), null)
  assert.equal(parseCurrencyInput('-10'), null)
  assert.equal(parseCurrencyInput('1e5'), null)
  assert.equal(isValidPrice('0'), false)
  assert.equal(isValidPrice('9999999999999999.99'), true)
  assert.equal(isValidPrice('10000000000000000.00'), false)
  assert.equal(formatCurrencyInput('9999999999999999.99'), '9.999.999.999.999.999,99')
})
