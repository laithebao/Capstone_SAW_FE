import { apiClient } from './apiClient'
import type { ApiResponse, PagedResponse } from '@/types/api'
import type { AdjustmentQuery, AdjustmentReviewDetail, AdjustmentSummary } from '@/types/stockAdjustment'

const base = '/warehouse-manager/stock-adjustments'
export const getAdjustmentReviews = async (params: AdjustmentQuery, signal?: AbortSignal) => (await apiClient.get<ApiResponse<PagedResponse<AdjustmentSummary>>>(base, { params, signal })).data.data
export const getAdjustmentReviewLocations = async (signal?: AbortSignal) => (await apiClient.get<ApiResponse<{ id: number; code: string }[]>>(`${base}/locations`, { signal })).data.data
export const getAdjustmentReview = async (id: number, signal?: AbortSignal) => (await apiClient.get<ApiResponse<AdjustmentReviewDetail>>(`${base}/${id}`, { signal })).data.data
export const reviewAdjustment = async (id: number, request: { requestId: string; decision: 'APPROVE' | 'REJECT'; reviewNote: string | null; expectedSnapshot: string }) => (await apiClient.post<ApiResponse<AdjustmentReviewDetail>>(`${base}/${id}/review`, request)).data.data
