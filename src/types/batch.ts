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
  harvestDate: string
  growingAreaName: string
  expectedDeliveryDate: string | null
  expiryDate: string | null
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
