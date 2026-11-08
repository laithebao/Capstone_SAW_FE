import { apiClient } from './apiClient'
import type { ApiResponse } from '@/types/api'
import type { AdjustmentResolution, AdjustmentReviewDetail } from '@/types/stockAdjustment'

export interface ProposalAction {
  requestId: string
  expectedVersion: number
  action: 'SAVE' | 'SEND' | 'WITHDRAW' | 'CLEAR'
  wholeLotPrice?: number
  message?: string
  reason?: string
  proposalId?: number
  expectedSnapshot?: string
}
export const actOnAdjustment = async (id: number, request: ProposalAction) => (await apiClient.post<ApiResponse<AdjustmentReviewDetail>>(`/warehouse-manager/stock-adjustments/${id}/proposal`, request)).data.data
export const getOrderAdjustments = async (id: number, signal?: AbortSignal) => (await apiClient.get<ApiResponse<AdjustmentResolution[]>>(`/distributor/orders/${id}/adjustments`, { signal })).data.data
export const respondToAdjustment = async (id: number, request: { requestId: string; expectedVersion: number; proposalId: number; revision: number; decision: 'ACCEPT' | 'DECLINE' | 'WITHDRAW'; reason: string | null }) => (await apiClient.post<ApiResponse<AdjustmentResolution[]>>(`/distributor/orders/${id}/adjustments/respond`, request)).data.data
