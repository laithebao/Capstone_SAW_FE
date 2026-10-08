export interface InventoryLocationLevel {
  locationId: number
  locationCode: string
  zoneName: string
  rackName: string | null
  binName: string | null
  locationStatus: string
  quantityOnHandKg: number
  reservedQuantityKg: number
  availableQuantityKg: number
  maxWeightKg: number | null
  utilizationPercent: number | null
  batchCount: number
  lowStockItemCount: number
  lastUpdatedAt: string | null
}

export interface WarehouseInventoryLevelChart {
  totalOnHandKg: number
  totalAvailableKg: number
  totalReservedKg: number
  activeLocationCount: number
  lowStockItemCount: number
  generatedAt: string
  locations: InventoryLocationLevel[]
}

export interface WarehouseCapacityLocation {
  locationId: number
  locationCode: string
  zoneName: string
  usedWeightKg: number
  maxWeightKg: number | null
  availableWeightKg: number | null
  utilizationPercent: number | null
  status: 'AVAILABLE' | 'NEAR_CAPACITY' | 'OVERCROWDED'
}

export interface WarehouseCapacityChart {
  usedWeightKg: number
  configuredCapacityKg: number
  availableWeightKg: number
  utilizationPercent: number
  nearCapacityCount: number
  overcrowdedCount: number
  generatedAt: string
  locations: WarehouseCapacityLocation[]
}

export interface ProductQualityDistributionItem {
  grade: string
  batchCount: number
  quantityOnHandKg: number
  percentage: number
}

export interface ProductQualityDistributionChart {
  totalBatchCount: number
  totalQuantityOnHandKg: number
  gradedBatchCount: number
  ungradedBatchCount: number
  leadingGrade: string | null
  generatedAt: string
  grades: ProductQualityDistributionItem[]
}
