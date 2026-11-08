import { apiClient } from './apiClient'
import type { ApiResponse, PagedResponse } from '@/types/api'
import type { AdjustmentBatch, AdjustmentDetail, AdjustmentImage, AdjustmentKind, AdjustmentQuery, AdjustmentScope, AdjustmentSummary, CreateAdjustment } from '@/types/stockAdjustment'

const base = '/operation/stock-adjustments'
export const getAdjustments = async (params: AdjustmentQuery, signal?: AbortSignal) => (await apiClient.get<ApiResponse<PagedResponse<AdjustmentSummary>>>(base, { params, signal })).data.data
export const getAdjustment = async (id: number, signal?: AbortSignal) => (await apiClient.get<ApiResponse<AdjustmentDetail>>(`${base}/${id}`, { signal })).data.data
export const getAdjustmentLocations = async (signal?: AbortSignal) => (await apiClient.get<ApiResponse<{ id: number; code: string }[]>>(`${base}/locations`, { signal })).data.data
export const getAdjustmentBatches = async (search: string, page: number, signal?: AbortSignal) => (await apiClient.get<ApiResponse<PagedResponse<AdjustmentBatch>>>(`${base}/batches`, { params: { search, page, pageSize: 20 }, signal })).data.data
export const getAdjustmentScope = async (id: number, kind: AdjustmentKind, inventoryId?: number, signal?: AbortSignal) => (await apiClient.get<ApiResponse<AdjustmentScope>>(`${base}/batches/${id}/scope`, { params: { kind, inventoryId }, signal })).data.data
export const createAdjustment = async (request: CreateAdjustment) => (await apiClient.post<ApiResponse<AdjustmentDetail>>(base, request)).data.data
export const uploadAdjustmentImage = async (file: File) => {
  const form = new FormData(); form.append('file', file)
  return (await apiClient.post<ApiResponse<AdjustmentImage>>(`${base}/images`, form, { headers: { 'Content-Type': undefined }, timeout: 45000 })).data.data
}
export const removeAdjustmentImage = async (id: string) => { await apiClient.delete(`${base}/images/${id}`) }
