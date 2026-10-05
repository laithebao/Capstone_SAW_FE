export const supplierBatchStatuses = [
  ['PENDING_PREDECLARATION', 'Chờ khai báo'], ['SUBMITTED', 'Chờ tiếp nhận'], ['PENDING_QC', 'Chờ kiểm định QC'],
  ['APPROVED_FOR_STORAGE', 'Đã duyệt nhập kho'], ['QUARANTINE', 'Cách ly'], ['REJECTED', 'Bị từ chối'],
  ['RECEIVED', 'Đã nhận hàng'], ['IN_STOCK', 'Đã nhập kho'], ['RESERVED', 'Đã giữ hàng'],
  ['PARTIALLY_ISSUED', 'Đã xuất một phần'], ['ISSUED', 'Đã xuất hết'], ['CANCELLED', 'Đã hủy'],
] as const;
// Supplier tracking ends at warehouse entry; retain the shared labels for history.
export const supplierBatchFilterStatuses = supplierBatchStatuses.filter(
  ([status]) => !['RESERVED', 'PARTIALLY_ISSUED', 'ISSUED'].includes(status)
);
export const canEditSupplierBatch = (status: string) => status === 'SUBMITTED';
export const supplierBatchStatusLabel = (status: string) => supplierBatchStatuses.find(([key]) => key === status)?.[1] ?? status;
