export interface PickingQuery {
  search?: string; status?: string; sort: string; page: number; pageSize: number; fromDate?: string; toDate?: string
}
export interface PickingOrderSummary {
  id: number; orderCode: string; distributorName: string; approvedAt: string | null; expectedDeliveryDate: string | null
  status: string; approvedWeightKg: number; reservedWeightKg: number; pickedWeightKg: number; canPick: boolean; pickingLockReason: string | null
}
export interface PickingHistoryItem { id: number; quantityKg: number; pickedAt: string; pickedByName: string; note: string | null }
export interface PickingReservation {
  id: number; inventoryId: number; productBatchId: number; batchCode: string; productName: string; warehouseLocationId: number
  locationName: string; expiryDate: string | null; status: string; reservedQuantityKg: number; pickedQuantityKg: number
  canPick: boolean; pickingLockReason: string | null; history: PickingHistoryItem[]
}
export interface PickingOrderLine {
  id: number; cropName: string; requestedProductBatchId: number | null; requestedBatchCode: string | null; productName: string | null; approvedWeightKg: number
  reservedWeightKg: number; pickedWeightKg: number; reservations: PickingReservation[]
}
export interface PickingOrderDetail { order: PickingOrderSummary; lines: PickingOrderLine[]; adjustments?: { id: number; code: string; state: string }[] }
export interface ConfirmPickingRequest {
  requestId: string; reservationId: number; orderDetailId: number; inventoryId: number; productBatchId: number
  quantityKg: number; expectedPickedQuantityKg: number; note: string | null
}
