import { apiClient } from '@/services/apiClient'
import type { ApiResponse, PagedResponse } from '@/types/api'
import type { CreateGoodsReceiptRequest, GoodsReceipt, GoodsReceiptBatch, GoodsReceiptFilters, GoodsReceiptOptions, GoodsReceiptSnapshot, UpdateGoodsReceiptDraftRequest } from '@/types/goodsReceipt'

const base = '/operation/goods-receipts'
export async function getGoodsReceipts(params: GoodsReceiptFilters, signal?: AbortSignal) {
  return (await apiClient.get<ApiResponse<PagedResponse<GoodsReceipt>>>(base, { params, signal })).data.data
}
export async function getGoodsReceipt(id: number, signal?: AbortSignal) {
  return (await apiClient.get<ApiResponse<GoodsReceipt>>(`${base}/${id}`, { signal })).data.data
}
export async function getGoodsReceiptOptions(signal?: AbortSignal) {
  return (await apiClient.get<ApiResponse<GoodsReceiptOptions>>(`${base}/filters`, { signal })).data.data
}
export async function getGoodsReceiptBatches(supplierId: number, search: string, page: number, signal?: AbortSignal) {
  return (await apiClient.get<ApiResponse<PagedResponse<GoodsReceiptBatch>>>(`${base}/eligible-batches`, { params: { supplierId, search, page, pageSize: 10 }, signal })).data.data
}
export async function createGoodsReceipt(request: CreateGoodsReceiptRequest) {
  return (await apiClient.post<ApiResponse<GoodsReceipt>>(base, request)).data.data
}
export async function confirmGoodsReceipt(id: number, expectedSnapshot: GoodsReceiptSnapshot) {
  return (await apiClient.put<ApiResponse<GoodsReceipt>>(`${base}/${id}/confirm`, { expectedSnapshot })).data.data
}
export async function updateGoodsReceiptDraft(id: number, request: UpdateGoodsReceiptDraftRequest) {
  return (await apiClient.put<ApiResponse<GoodsReceipt>>(`${base}/${id}/draft`, request)).data.data
}
