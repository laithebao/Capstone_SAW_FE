export interface GoodsReceipt {
  id: number
  receiptCode: string
  productBatchId: number
  batchCode: string
  productName: string
  supplierId: number
  supplierName: string
  receivedQuantity: number
  unit: string
  weightInKg: number
  warehouseLocationId: number
  locationName: string
  receivedDate: string
  receiptStatus: 'DRAFT' | 'COMMITTED'
  committedAt: string | null
  note: string | null
  operationStaffName: string
  snapshot: GoodsReceiptSnapshot
}
export interface GoodsReceiptSnapshot { warehouseLocationId: number; receivedAt: string; note: string | null }
export interface UpdateGoodsReceiptDraftRequest {
  warehouseLocationId: number
  receivedDate: string
  note: string | null
  expectedSnapshot: GoodsReceiptSnapshot
}
export interface GoodsReceiptFilters {
  search?: string
  supplierId?: number
  warehouseLocationId?: number
  fromDate?: string
  toDate?: string
  status?: string
  sortBy: string
  page: number
  pageSize: number
}
export interface GoodsReceiptOptions {
  suppliers: { id: number; name: string }[]
  locations: { id: number; name: string; isActive: boolean; maxWeightKg: number | null }[]
}
export interface GoodsReceiptBatch {
  id: number
  batchCode: string
  productName: string
  supplierId: number
  supplierName: string
  quantity: number
  unit: string
  weightInKg: number
  qualityGrade: string
}
export interface CreateGoodsReceiptRequest {
  productBatchId: number
  warehouseLocationId: number
  receivedDate: string
  note: string | null
}
