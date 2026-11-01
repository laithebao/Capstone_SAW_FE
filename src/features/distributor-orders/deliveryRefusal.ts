export const REFUSED_DELIVERY_STATUS = 'DELIVERY_REFUSED'
export const PARTIALLY_REFUSED_STATUS = 'PARTIALLY_REFUSED'
export const MAX_REFUSAL_IMAGES = 5
export const MAX_REFUSAL_IMAGE_BYTES = 10 * 1024 * 1024

export function canRefuseDelivery(status: string, hasAvailableLots: boolean): boolean {
  return hasAvailableLots && ['ISSUED', 'DISPATCHED', 'DELIVERED', PARTIALLY_REFUSED_STATUS].includes(status)
}

export function validateRefusalImage(file: { type: string; size: number }): string | null {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Chỉ nhận ảnh JPG, PNG hoặc WEBP.'
  if (file.size <= 0 || file.size > MAX_REFUSAL_IMAGE_BYTES) return 'Mỗi ảnh phải có dữ liệu và không vượt quá 10 MB.'
  return null
}
