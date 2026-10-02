export type ProductBatchStatusTone = 'amber' | 'blue' | 'green' | 'red' | 'slate'

const statuses: Record<string, { label: string; tone: ProductBatchStatusTone }> = {
  PENDING_PREDECLARATION: { label: 'Chờ duyệt', tone: 'amber' },
  SUBMITTED: { label: 'Chờ duyệt', tone: 'amber' },
  PENDING_APPROVAL: { label: 'Chờ duyệt', tone: 'amber' },
  PENDING_QC: { label: 'Chờ kiểm định QC', tone: 'blue' },
  APPROVED: { label: 'Đã duyệt', tone: 'green' },
  APPROVED_FOR_STORAGE: { label: 'Đã duyệt nhập kho', tone: 'green' },
  QUARANTINE: { label: 'Cách ly chờ xử lý', tone: 'amber' },
  COMMITTED: { label: 'Đã nhập kho', tone: 'green' },
  REJECTED: { label: 'Bị từ chối', tone: 'red' },
  RECEIVING: { label: 'Đang nhận hàng', tone: 'blue' },
  RECEIVED: { label: 'Đã nhận hàng', tone: 'green' },
  IN_QC: { label: 'Đang kiểm định QC', tone: 'blue' },
  QC_PASSED: { label: 'QC đạt', tone: 'green' },
  QC_FAILED: { label: 'QC không đạt', tone: 'red' },
  STORED: { label: 'Đã nhập kho', tone: 'green' },
  CANCELLED: { label: 'Đã hủy', tone: 'red' },
  CANCELED: { label: 'Đã hủy', tone: 'red' },
}

export function getProductBatchStatusPresentation(status: string): { label: string; tone: ProductBatchStatusTone } {
  return statuses[status.trim().toUpperCase()] ?? { label: status.replaceAll('_', ' '), tone: 'slate' }
}
