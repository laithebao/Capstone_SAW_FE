export interface ProductBatchListItem {
  id: number
  batchCode: string
  productName: string
  supplierId: number
  supplierName: string
  cropTypeId: number
  cropTypeName: string
  categoryName: string
  quantity: number
  verifiedQuantity: number | null
  unit: string
  createdAt: string
  updatedAt: string | null
  batchStatus: string
}

export interface ProductBatchListResponse {
  items: ProductBatchListItem[]
  totalCount: number
  page: number
  pageSize: number
}

export interface ProductBatchDetail extends ProductBatchListItem {
  latestQcInspection: ProductBatchQcSummary | null
  goodsReceipts: ProductBatchGoodsReceipt[]
  statusHistory: ProductBatchStatusHistoryItem[]
  warehouseTransactions: ProductBatchWarehouseTransaction[]
  canUpdateReceivingInformation: boolean
  receivingUpdateLockReason: string | null
  weightInKg: number
  verifiedQuantity: number | null
  verifiedWeightInKg: number | null
  harvestDate: string
  growingAreaName: string
  expectedDeliveryDate: string | null
  expiryDate: string | null
  note: string | null
  packagingType: string | null
  packageCount: number | null
  packageUnitWeightKg: number | null
  verifiedPackagingType: string | null
  verifiedPackageCount: number | null
  verifiedPackageUnitWeightKg: number | null
  receivingNote: string | null
  rejectionReason: string | null
  expectedMinTempC: number | null
  expectedMaxTempC: number | null
  expectedMinHumidityPct: number | null
  expectedMaxHumidityPct: number | null
  shelfLifeDaysSnapshot: number | null
}

export interface ProductBatchQcSummary {
  id: number
  inspectionCode: string
  inspectionStatus: string
  qcResult: string | null
  qualityGrade: string | null
  startedAt: string
  completedAt: string | null
  qcStaffName: string | null
  note: string | null
}

export interface ProductBatchGoodsReceipt {
  id: number
  receiptCode: string
  receiptStatus: 'DRAFT' | 'COMMITTED'
  receivedAt: string
  committedAt: string | null
  warehouseLocationId: number
  locationName: string | null
  operationStaffName: string | null
  note: string | null
  receivedQuantity: number
  unit: string
  weightInKg: number
}

export interface ProductBatchStatusHistoryItem {
  id: number
  changedAt: string
  oldStatus: string | null
  newStatus: string
  changedByName: string | null
  changeReason: string | null
}

export interface ProductBatchWarehouseTransaction {
  id: number
  transactionType: string
  code: string
  status: string
  recordedAt: string
  quantity: number
  unit: string
  weightInKg: number | null
  fromLocationName: string | null
  toLocationName: string | null
  performedByName: string | null
  note: string | null
}

export interface ProductBatchFilterOption {
  id: number
  name: string
}

export interface ProductBatchFilterOptions {
  suppliers: ProductBatchFilterOption[]
  cropTypes: ProductBatchFilterOption[]
  statuses: string[]
}

export type ProductBatchSort = 'createdAtDesc' | 'createdAtAsc' | 'updatedAtDesc' | 'updatedAtAsc'

export interface ProductBatchFilters {
  batchCode?: string
  supplierId?: number
  cropTypeId?: number
  status?: string
  sortBy?: ProductBatchSort
  page: number
  pageSize: number
}

export interface SubmittedDeclarationOption {
  id: number
  batchCode: string
  productName: string
  cropTypeName: string | null
  declaredQuantity: number
  unit: string
}

export interface SubmittedDeclarationDetail {
  categoryName?: string | null
  id: number
  batchCode: string
  supplierId: number
  supplierName: string
  cropTypeId: number
  cropTypeName: string
  productName: string
  growingAreaId: number
  growingAreaName: string
  harvestDate: string
  declaredQuantity: number
  unit: string
  weightInKg: number
  packagingType: string | null
  packageCount: number | null
  packageUnitWeightKg: number | null
  expectedMinTempC: number | null
  expectedMaxTempC: number | null
  expectedMinHumidityPct: number | null
  expectedMaxHumidityPct: number | null
  shelfLifeDaysSnapshot: number | null
  expectedDeliveryDate: string | null
  expiryDate: string | null
  note: string | null
}

export interface VerifyProductBatchRequest {
  verifiedQuantity: number
  verifiedWeightInKg: number
  verifiedPackagingType: string | null
  verifiedPackageCount: number | null
  verifiedPackageUnitWeightKg: number | null
  receivingNote: string | null
}

export interface UpdateProductBatchRequest extends VerifyProductBatchRequest {
  expectedUpdatedAt: string | null
  expectedCreatedAt: string
}

export interface RejectProductBatchResponse {
  id: number
  batchCode: string
  batchStatus: string
  rejectionReason: string
}

export interface VerifyProductBatchResponse {
  id: number
  batchCode: string
  verifiedQuantity: number
  verifiedWeightInKg: number
  batchStatus: string
}
