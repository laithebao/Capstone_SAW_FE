import type { ProductBatchDetail, SubmittedDeclarationDetail, VerifyProductBatchRequest } from '@/types/batch'

export interface ReceivingDetailsFormValue {
  verifiedQuantity: string
  verifiedWeightInKg: string
  verifiedPackagingType: string
  verifiedPackageCount: string
  verifiedPackageUnitWeightKg: string
  receivingNote: string
}

export const emptyReceivingDetails: ReceivingDetailsFormValue = {
  verifiedQuantity: '', verifiedWeightInKg: '', verifiedPackagingType: '',
  verifiedPackageCount: '', verifiedPackageUnitWeightKg: '', receivingNote: '',
}

export function receivingUnit(unit: string): 'Kg' | 'Tấn' | 'Bao' | 'Thùng' | null {
  switch (unit.trim().toLocaleLowerCase('vi-VN')) {
    case 'kg': case 'kilogram': return 'Kg'
    case 'tấn': case 'tan': case 'ton': return 'Tấn'
    case 'bao': return 'Bao'
    case 'thùng': return 'Thùng'
    default: return null
  }
}

function milli(value: string): bigint | null {
  if (!/^\d+(?:\.\d{1,3})?$/.test(value.trim())) return null
  const [whole, fraction = ''] = value.trim().split('.')
  return BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, '0'))
}

function formatMilli(value: bigint): string {
  return `${value / 1000n}.${String(value % 1000n).padStart(3, '0')}`.replace(/\.?0+$/, '')
}

export interface PackageWeightGroup { count: string; weightInKg: string }

export function weighPackageGroups(groups: PackageWeightGroup[], expectedCount: string):
  { weight: string; note: string; error?: never } | { weight?: never; note?: never; error: string } {
  if (!groups.length || groups.length > 20) return { error: 'Nhập từ 1 đến 20 nhóm cân; các kiện cùng khối lượng có thể gộp một nhóm.' }
  let count = 0n, total = 0n
  for (const group of groups) {
    const weight = milli(group.weightInKg)
    if (!/^[1-9]\d*$/.test(group.count.trim()) || BigInt(group.count) > 2147483647n || weight === null || weight <= 0n)
      return { error: 'Mỗi nhóm cần số kiện nguyên dương và kg/kiện lớn hơn 0, tối đa 3 chữ số thập phân.' }
    count += BigInt(group.count)
    total += BigInt(group.count) * weight
  }
  const expected = milli(expectedCount)
  if (expected === null || expected <= 0n || expected % 1000n !== 0n || count * 1000n !== expected)
    return { error: 'Tổng số kiện trong bảng cân phải bằng số kiện kiểm nhận.' }
  if (total >= 1000000000000000000n) return { error: 'Tổng khối lượng vượt giới hạn lưu trữ.' }
  const weight = formatMilli(total)
  return { weight, note: `Chi tiết cân kiểm nhận: ${groups.map(group => `${group.count.trim()} kiện × ${group.weightInKg.trim()} kg`).join(' + ')} = ${weight} kg.` }
}

export function calculatedReceivingWeight(value: ReceivingDetailsFormValue, unit: string): string {
  const mode = receivingUnit(unit), quantity = milli(value.verifiedQuantity)
  if (!mode || mode === 'Bao' || mode === 'Thùng' || quantity === null || quantity <= 0n) return ''
  let total = quantity
  if (mode === 'Tấn') total *= 1000n
  if (total >= 1000000000000000000n) return ''
  return formatMilli(total)
}

export function changeReceivingDetails(value: ReceivingDetailsFormValue, key: keyof ReceivingDetailsFormValue, next: string, unit: string): ReceivingDetailsFormValue {
  const result = { ...value, [key]: next }, mode = receivingUnit(unit)
  const packaged = mode === 'Bao' || mode === 'Thùng'
  if ((mode === 'Bao' || mode === 'Thùng') && key === 'verifiedQuantity') result.verifiedPackageCount = next
  if (mode && !packaged && key === 'verifiedQuantity')
    result.verifiedWeightInKg = calculatedReceivingWeight(result, unit)
  return result
}

export function suggestedReceivingDetails(batch: SubmittedDeclarationDetail): ReceivingDetailsFormValue {
  return {
    verifiedQuantity: String(batch.declaredQuantity),
    verifiedWeightInKg: String(batch.weightInKg),
    verifiedPackagingType: batch.packagingType ?? '',
    verifiedPackageCount: batch.packageCount === null ? '' : String(batch.packageCount),
    verifiedPackageUnitWeightKg: batch.packageUnitWeightKg === null ? '' : String(batch.packageUnitWeightKg),
    receivingNote: '',
  }
}

export function savedReceivingDetails(batch: ProductBatchDetail): ReceivingDetailsFormValue {
  return {
    verifiedQuantity: batch.verifiedQuantity === null ? '' : String(batch.verifiedQuantity),
    verifiedWeightInKg: batch.verifiedWeightInKg === null ? '' : String(batch.verifiedWeightInKg),
    verifiedPackagingType: batch.verifiedPackagingType ?? '',
    verifiedPackageCount: batch.verifiedPackageCount === null ? '' : String(batch.verifiedPackageCount),
    verifiedPackageUnitWeightKg: batch.verifiedPackageUnitWeightKg === null ? '' : String(batch.verifiedPackageUnitWeightKg),
    receivingNote: batch.receivingNote ?? '',
  }
}

function positiveDecimal(value: string): boolean {
  const trimmed = value.trim()
  return /^\d+(?:\.\d{1,3})?$/.test(trimmed) && Number(trimmed) > 0 &&
    Number(trimmed) < 1_000_000_000_000_000
}

export function parseReceivingDetails(value: ReceivingDetailsFormValue, unit?: string):
  { data: VerifyProductBatchRequest; error?: never } | { data?: never; error: string } {
  if (!positiveDecimal(value.verifiedQuantity) || !positiveDecimal(value.verifiedWeightInKg))
    return { error: 'Số lượng và khối lượng kiểm nhận phải lớn hơn 0 và có tối đa 3 chữ số thập phân.' }
  const count = value.verifiedPackageCount.trim()
  if (count && (!/^[1-9]\d*$/.test(count) || Number(count) > 2147483647))
    return { error: 'Số kiện kiểm nhận phải là số nguyên lớn hơn 0.' }
  const mode = unit ? receivingUnit(unit) : null
  const actualPackages = mode === 'Bao' || mode === 'Thùng'
  const unitWeight = actualPackages ? '' : value.verifiedPackageUnitWeightKg.trim()
  if (unitWeight && !positiveDecimal(unitWeight))
    return { error: 'Khối lượng mỗi kiện phải lớn hơn 0 và có tối đa 3 chữ số thập phân.' }
  const packagingType = value.verifiedPackagingType.trim()
  const note = value.receivingNote.trim()
  if (mode === 'Bao' || mode === 'Thùng') {
    if (!count || Number(count) !== Number(value.verifiedQuantity))
      return { error: 'Số kiện phải là số nguyên dương bằng số lượng kiểm nhận.' }
  }
  if (mode && !actualPackages && milli(value.verifiedWeightInKg) !== milli(calculatedReceivingWeight(value, unit!)))
    return { error: 'Khối lượng chưa khớp đơn vị hoặc quy cách. Kiểm tra lại số lượng và khối lượng mỗi kiện trước khi lưu.' }
  if (packagingType.length > 100 || note.length > 1000)
    return { error: 'Quy cách đóng gói tối đa 100 ký tự và ghi chú tối đa 1000 ký tự.' }
  return { data: {
    verifiedQuantity: Number(value.verifiedQuantity),
    verifiedWeightInKg: Number(value.verifiedWeightInKg),
    verifiedPackagingType: packagingType || (mode === 'Bao' || mode === 'Thùng' ? mode : null),
    verifiedPackageCount: count ? Number(count) : null,
    verifiedPackageUnitWeightKg: unitWeight ? Number(unitWeight) : null,
    receivingNote: note || null,
  } }
}
