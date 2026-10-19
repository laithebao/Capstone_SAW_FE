import { apiClient } from './apiClient'
import type { ApiResponse, PagedResponse } from '@/types/api'
import type { ConfirmPickingRequest, PickingOrderDetail, PickingOrderSummary, PickingQuery } from '@/types/picking'

const base = '/operation/picking-orders'
export async function getPickingOrders(params: PickingQuery, signal?: AbortSignal) {
  return (await apiClient.get<ApiResponse<PagedResponse<PickingOrderSummary>>>(base, { params, signal })).data.data
}
export async function getPickingOrder(id: number, signal?: AbortSignal) {
  return (await apiClient.get<ApiResponse<PickingOrderDetail>>(`${base}/${id}`, { signal })).data.data
}
export async function confirmPicking(id: number, request: ConfirmPickingRequest) {
  return (await apiClient.post<ApiResponse<PickingOrderDetail>>(`${base}/${id}/confirm-picking`, request)).data.data
}
