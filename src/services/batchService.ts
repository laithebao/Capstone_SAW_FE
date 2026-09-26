import { apiClient } from '@/services/apiClient'
import type { ApiResponse } from '@/types/api'
import type {
  ProductBatchDetail,
  ProductBatchFilterOptions,
  ProductBatchFilters,
  ProductBatchListResponse,
} from '@/types/batch'

const base = '/operation/product-batches'

export async function getProductBatches(filters: ProductBatchFilters, signal?: AbortSignal): Promise<ProductBatchListResponse> {
  const response = await apiClient.get<ApiResponse<ProductBatchListResponse>>(base, { params: filters, signal })
  return response.data.data
}

export async function getProductBatchFilterOptions(signal?: AbortSignal): Promise<ProductBatchFilterOptions> {
  const response = await apiClient.get<ApiResponse<ProductBatchFilterOptions>>(`${base}/filters`, { signal })
  return response.data.data
}

export async function getProductBatch(id: number, signal?: AbortSignal): Promise<ProductBatchDetail> {
  const response = await apiClient.get<ApiResponse<ProductBatchDetail>>(`${base}/${id}`, { signal })
  return response.data.data
}
