import { apiClient } from '@/services/apiClient'
import type { ApiResponse } from '@/types/api'
import type { ProductBatchQrCode } from '@/types/qrCode'

export async function getProductBatchQrCode(id: number, signal?: AbortSignal): Promise<ProductBatchQrCode> {
  const response = await apiClient.get<ApiResponse<ProductBatchQrCode>>(`/operation/product-batches/${id}/qr-code`, { signal })
  return response.data.data
}

// Fetch the actual bytes: an <a download> alone is ignored for cross-origin images.
// Deliberately use fetch, not the authenticated apiClient, for Cloudinary requests.
export async function downloadQrPng(imageUrl: string, batchCode: string, signal?: AbortSignal): Promise<void> {
  const response = await fetch(imageUrl, { signal, credentials: 'omit' })
  if (!response.ok) throw new Error('Không tải được ảnh QR. Vui lòng thử lại.')
  const blob = await response.blob()
  if (blob.type !== 'image/png') throw new Error('Ảnh QR trả về không phải PNG.')
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = `QR-${batchCode.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}
