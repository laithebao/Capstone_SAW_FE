import { apiClient } from '@/services/apiClient'
import type { ApiResponse, PagedResponse } from '@/types/api'
import type { CatalogLot, CreateDistributorOrderRequest, DistributorDashboard, DistributorLotDetail, DistributorOrderDetail, DistributorOrderSummary, DistributorQuery } from '@/types/order'

const base = '/distributor/orders'
export async function getDistributorDashboard(signal?: AbortSignal) {
  return (await apiClient.get<ApiResponse<DistributorDashboard>>(`${base}/dashboard`, { signal })).data.data
}
export async function getDistributorCatalog(params: DistributorQuery, signal?: AbortSignal) {
  return (await apiClient.get<ApiResponse<PagedResponse<CatalogLot>>>(`${base}/catalog`, { params, signal })).data.data
}
export async function getDistributorLot(id: number, signal?: AbortSignal) {
  return (await apiClient.get<ApiResponse<DistributorLotDetail>>(`${base}/catalog/${id}`, { signal })).data.data
}
export async function getDistributorOrders(params: DistributorQuery, signal?: AbortSignal) {
  return (await apiClient.get<ApiResponse<PagedResponse<DistributorOrderSummary>>>(base, { params, signal })).data.data
}
export async function getDistributorOrder(id: number, signal?: AbortSignal) {
  return (await apiClient.get<ApiResponse<DistributorOrderDetail>>(`${base}/${id}`, { signal })).data.data
}
export async function createDistributorOrder(request: CreateDistributorOrderRequest) {
  return (await apiClient.post<ApiResponse<DistributorOrderDetail>>(base, request)).data.data
}
export async function cancelDistributorOrder(id: number) {
  return (await apiClient.post<ApiResponse<DistributorOrderDetail>>(`${base}/${id}/cancel`)).data.data
}
export async function confirmDistributorReceipt(id: number) {
  return (await apiClient.post<ApiResponse<DistributorOrderDetail>>(`${base}/${id}/receive`)).data.data
}
