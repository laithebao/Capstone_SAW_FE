import { apiClient } from './apiClient'
import type { ApiResponse, PagedResponse } from '@/types/api'
import type { GoodsIssueDetail, GoodsIssueDraft, GoodsIssueOrder, GoodsIssueQuery, GoodsIssueSummary } from '@/types/goodsIssue'

const base = '/operation/goods-issues'
export const getGoodsIssues = async (params: GoodsIssueQuery, signal?: AbortSignal) => (await apiClient.get<ApiResponse<PagedResponse<GoodsIssueSummary>>>(base, { params, signal })).data.data
export const getGoodsIssue = async (id: number, signal?: AbortSignal) => (await apiClient.get<ApiResponse<GoodsIssueDetail>>(`${base}/${id}`, { signal })).data.data
export const getGoodsIssueLocations = async (signal?: AbortSignal) => (await apiClient.get<ApiResponse<{ id: number; name: string }[]>>(`${base}/locations`, { signal })).data.data
export const getIssueOrders = async (search: string, page: number, signal?: AbortSignal) => (await apiClient.get<ApiResponse<PagedResponse<GoodsIssueOrder>>>(`${base}/eligible-orders`, { params: { search, page, pageSize: 20 }, signal })).data.data
export const getIssueOrder = async (id: number, signal?: AbortSignal) => (await apiClient.get<ApiResponse<GoodsIssueOrder>>(`${base}/eligible-orders/${id}`, { signal })).data.data
export const createGoodsIssue = async (request: GoodsIssueDraft & { requestId: string; purchaseOrderId: number }) => (await apiClient.post<ApiResponse<GoodsIssueDetail>>(base, request)).data.data
export const updateGoodsIssue = async (id: number, request: GoodsIssueDraft & { requestId: string; expectedSnapshot: string }) => (await apiClient.put<ApiResponse<GoodsIssueDetail>>(`${base}/${id}/draft`, request)).data.data
export const confirmGoodsIssue = async (id: number, request: { requestId: string; expectedSnapshot: string }) => (await apiClient.post<ApiResponse<GoodsIssueDetail>>(`${base}/${id}/confirm`, request)).data.data
// Works on LAN HTTP as well as secure origins. This key is an operation ID, not a credential.
export const issueOperationKey = () => '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, char =>
  (Number(char) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(char) / 4).toString(16))
