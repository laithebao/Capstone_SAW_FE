export interface DistributorQuery {
  search?: string
  status?: string
  fromDate?: string
  toDate?: string
  page: number
  pageSize: number
}
export interface DistributorDashboard {
  pendingOrders: number
  successfulOrders: number
  cancelledOrders: number
  totalSpent: number
  recentOrders: DistributorOrderSummary[]
}
export interface CatalogLot {
  batchId: number
  batchCode: string
  productName: string
  cropName: string
  supplierName: string
  origin: string
  qualityGrade: string | null
  harvestDate: string
  expiryDate: string | null
  weightKg: number
  wholeLotPrice: number
}
export interface DistributorLotDetail extends Omit<CatalogLot, 'wholeLotPrice'> {
  wholeLotPrice: number | null
  categoryName: string
  province: string
  district: string
  ward: string
  batchStatus: string
  canPurchase: boolean
  packagingType: string | null
  packageCount: number | null
  packageUnitWeightKg: number | null
  minTempC: number | null
  maxTempC: number | null
  minHumidityPct: number | null
  maxHumidityPct: number | null
  qcResult: string | null
  qcCompletedAt: string | null
  inspectionStandardName: string | null
  inspectionStandardVersionNo: number | null
}
export interface DistributorOrderSummary {
  id: number
  orderCode: string
  status: string
  lotCount: number
  totalAmount: number
  createdAt: string
  expectedDeliveryDate: string | null
}
export interface DistributorOrderDetail {
  id: number
  orderCode: string
  status: string
  deliveryAddress: string
  contactPhone: string | null
  expectedDeliveryDate: string | null
  note: string | null
  totalAmount: number
  createdAt: string
  approvedAt: string | null
  rejectionReason: string | null
  cancellationReason: string | null
  receivedAt: string | null
  canCancel: boolean
  canConfirmReceipt: boolean
  lines: { batchId: number; batchCode: string; productName: string; weightKg: number; wholeLotPrice: number }[]
  history: { oldStatus: string | null; newStatus: string; changedAt: string; reason: string | null }[]
}
export interface CreateDistributorOrderRequest {
  requestId: string
  lots: { batchId: number; expectedPrice: number; expectedWeightKg: number }[]
  deliveryAddress: string
  contactPhone: string
  expectedDeliveryDate: string | null
  note?: string
}
