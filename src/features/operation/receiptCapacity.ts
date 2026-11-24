import type { GoodsReceiptOptions } from '../../types/goodsReceipt.ts'

type Location = GoodsReceiptOptions['locations'][number]
const kg = (value: number) => `${value.toLocaleString('vi-VN')} kg`

export function receiptCapacityLabel(location: Location, incomingKg: number) {
  if (location.hasNonKgInventory) return 'Cần kiểm tra đơn vị tồn kho'
  if (location.usedWeightKg == null) return 'Chưa xác định sức chứa còn lại'
  if (location.maxWeightKg == null) return 'Chưa đặt giới hạn'
  if (location.remainingWeightKg == null) return 'Chưa xác định sức chứa còn lại'
  const free = location.remainingWeightKg
  return free < incomingKg ? `Thiếu ${kg(incomingKg - free)}` : null
}
