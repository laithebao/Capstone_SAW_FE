import test from 'node:test'
import assert from 'node:assert/strict'
import { calculatedReceivingWeight, changeReceivingDetails, emptyReceivingDetails, parseReceivingDetails, savedReceivingDetails, weighPackageGroups } from '../src/features/operation/receivingDetails.ts'

const form = (overrides = {}) => ({ ...emptyReceivingDetails, ...overrides })

for (const [unit, quantity, weight] of [['Kg', '12.345', '12.345'], ['Tấn', '1.125', '1125'], ['Kg', '1000', '1000']]) {
  test(`${unit}: changing quantity derives kg without floating point rounding`, () => {
    const next = changeReceivingDetails(form(), 'verifiedQuantity', quantity, unit)
    assert.equal(next.verifiedWeightInKg, weight)
    assert.equal(parseReceivingDetails(next, unit).data.verifiedWeightInKg, Number(weight))
    assert.equal(next.verifiedPackageCount, '')
  })
}

for (const unit of ['Bao', 'Thùng']) {
  test(`${unit}: count changes preserve actual kg; grouped weighing handles equal weights`, () => {
    const next = changeReceivingDetails(form({ verifiedWeightInKg: '80', verifiedPackageUnitWeightKg: '0.125' }), 'verifiedQuantity', '3', unit)
    assert.equal(next.verifiedPackageCount, '3')
    assert.equal(next.verifiedWeightInKg, '80')
    const calculated = weighPackageGroups([{ count:'3', weightInKg:'0.125' }], '3')
    assert.equal(calculated.weight, '0.375')
    assert.deepEqual(parseReceivingDetails({ ...next, verifiedWeightInKg: calculated.weight }, unit).data, {
      verifiedQuantity: 3, verifiedWeightInKg: 0.375, verifiedPackagingType: unit,
      verifiedPackageCount: 3, verifiedPackageUnitWeightKg: null, receivingNote: null,
    })
  })
}

test('invalid package counts and bulk conversion overflow cannot be saved', () => {
  for (const quantity of ['1.5', '0', '2147483648']) {
    const next = changeReceivingDetails(form({ verifiedWeightInKg: '100' }), 'verifiedQuantity', quantity, 'Bao')
    assert.ok(parseReceivingDetails(next, 'Bao').error)
  }
  const overflow = changeReceivingDetails(form(), 'verifiedQuantity', '1000000000000', 'Tấn')
  assert.equal(overflow.verifiedWeightInKg, '')
  assert.ok(parseReceivingDetails(overflow, 'Tấn').error)
})

test('saved measurements are not silently recalculated or replaced by supplier declaration', () => {
  const saved = savedReceivingDetails({ verifiedQuantity: 3, verifiedWeightInKg: 74,
    verifiedPackageCount: 3, verifiedPackageUnitWeightKg: 25, verifiedPackagingType: 'Bao',
    receivingNote: 'Actual measurement', declaredQuantity: 4, weightInKg: 100, unit: 'Bao' })
  assert.equal(saved.verifiedQuantity, '3')
  assert.equal(saved.verifiedWeightInKg, '74')
  assert.equal(parseReceivingDetails(saved, 'Bao').data.verifiedWeightInKg, 74)
  assert.equal(parseReceivingDetails(saved, 'Bao').data.verifiedPackageUnitWeightKg, null)
  assert.equal(changeReceivingDetails(saved, 'verifiedQuantity', '4', 'Bao').verifiedWeightInKg, '74')
  assert.equal(saved.verifiedWeightInKg, '74')
})

for (const unit of ['Bao', 'Thùng']) {
  test(`${unit}: nonuniform weighing saves the true total with no fictitious common package weight`, () => {
    const saved = form({ verifiedQuantity: '5', verifiedPackageCount: '5',
      verifiedWeightInKg: '119', verifiedPackageUnitWeightKg: '25', receivingNote: '3 × 25 + 24 + 20' })
    const data = parseReceivingDetails(saved, unit).data
    assert.equal(data.verifiedWeightInKg, 119)
    assert.equal(data.verifiedPackageCount, 5)
    assert.equal(data.verifiedPackageUnitWeightKg, null)
    assert.equal(changeReceivingDetails(saved, 'verifiedQuantity', '6', unit).verifiedWeightInKg, '119')
    for (const weight of ['', '0', '-1', '119.0001'])
      assert.ok(parseReceivingDetails({ ...saved, verifiedWeightInKg: weight }, unit).error)
    assert.ok(parseReceivingDetails({ ...saved, verifiedPackageCount: '4' }, unit).error)
  })
}

test('individual/grouped weighing sums all measured packages exactly and checks the total count', () => {
  const groups = [{ count:'3', weightInKg:'25' }, { count:'1', weightInKg:'24' }, { count:'1', weightInKg:'20' }]
  assert.equal(weighPackageGroups(groups, '5').weight, '119')
  assert.equal(weighPackageGroups(groups.slice(0,2), '4').weight, '99')
  assert.ok(weighPackageGroups(groups, '4').error)
  assert.ok(weighPackageGroups([{ count:'1.5', weightInKg:'25' }], '1.5').error)
  assert.ok(weighPackageGroups([{ count:'1', weightInKg:'24.0001' }], '1').error)
  assert.ok(weighPackageGroups([{ count:'1', weightInKg:'0' }], '1').error)
  assert.equal(weighPackageGroups([{ count:'3', weightInKg:'0.125' }, { count:'1', weightInKg:'0.001' }], '4').weight, '0.376')
  assert.ok(weighPackageGroups(Array.from({length:21},()=>({ count:'1',weightInKg:'1' })), '21').error)
})

test('reopening a nonuniform receipt restores measured kg and notes without supplier fallback', () => {
  const saved = savedReceivingDetails({ unit:'Thùng', declaredQuantity:5, weightInKg:125,
    verifiedQuantity:5, verifiedWeightInKg:119, verifiedPackageCount:5, verifiedPackageUnitWeightKg:null,
    verifiedPackagingType:'Thùng', receivingNote:'3 × 25 + 24 + 20' })
  assert.equal(saved.verifiedWeightInKg, '119')
  assert.equal(saved.receivingNote, '3 × 25 + 24 + 20')
  assert.equal(parseReceivingDetails(saved, 'Thùng').data.verifiedPackageUnitWeightKg, null)
})

test('package counts must agree; real package kg can differ from declared packaging and bulk kg must match its unit', () => {
  const valid = form({ verifiedQuantity: '3', verifiedWeightInKg: '75', verifiedPackageCount: '3', verifiedPackageUnitWeightKg: '25' })
  assert.ok(parseReceivingDetails({ ...valid, verifiedPackageCount: '2' }, 'Bao').error)
  assert.equal(parseReceivingDetails({ ...valid, verifiedWeightInKg:'74' }, 'Bao').data.verifiedWeightInKg,74)
  assert.ok(parseReceivingDetails(form({ verifiedQuantity: '2', verifiedWeightInKg: '1999' }), 'Tấn').error)
})

test('legacy units keep independent actual quantity, weight and nullable optional fields', () => {
  const original = form({ verifiedQuantity: '10', verifiedWeightInKg: '97', receivingNote: '  Received  ' })
  const next = changeReceivingDetails(original, 'verifiedQuantity', '11', 'Box')
  assert.equal(next.verifiedWeightInKg, '97')
  assert.deepEqual(parseReceivingDetails(next, 'Box').data, {
    verifiedQuantity: 11, verifiedWeightInKg: 97, verifiedPackagingType: null,
    verifiedPackageCount: null, verifiedPackageUnitWeightKg: null, receivingNote: 'Received',
  })
})
