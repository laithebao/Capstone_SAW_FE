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

export function parseReceivingDetails(value: ReceivingDetailsFormValue):
  { data: VerifyProductBatchRequest; error?: never } | { data?: never; error: string } {
  if (!positiveDecimal(value.verifiedQuantity) || !positiveDecimal(value.verifiedWeightInKg))
    return { error: 'Số lượng và khối lượng kiểm nhận phải lớn hơn 0 và có tối đa 3 chữ số thập phân.' }
  const count = value.verifiedPackageCount.trim()
  if (count && (!/^[1-9]\d*$/.test(count) || Number(count) > 2147483647))
    return { error: 'Số kiện kiểm nhận phải là số nguyên lớn hơn 0.' }
  const unitWeight = value.verifiedPackageUnitWeightKg.trim()
  if (unitWeight && !positiveDecimal(unitWeight))
    return { error: 'Khối lượng mỗi kiện phải lớn hơn 0 và có tối đa 3 chữ số thập phân.' }
  const packagingType = value.verifiedPackagingType.trim()
  const note = value.receivingNote.trim()
  if (packagingType.length > 100 || note.length > 1000)
    return { error: 'Quy cách đóng gói tối đa 100 ký tự và ghi chú tối đa 1000 ký tự.' }
  return { data: {
    verifiedQuantity: Number(value.verifiedQuantity),
    verifiedWeightInKg: Number(value.verifiedWeightInKg),
    verifiedPackagingType: packagingType || null,
    verifiedPackageCount: count ? Number(count) : null,
    verifiedPackageUnitWeightKg: unitWeight ? Number(unitWeight) : null,
    receivingNote: note || null,
  } }
}
