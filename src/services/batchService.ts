import { apiClient } from '@/services/apiClient'
import type { ApiResponse } from '@/types/api'
import type {
  ProductBatchDetail,
  ProductBatchFilterOptions,
  ProductBatchFilters,
  ProductBatchListResponse,
  ProductBatchFilterOption,
  SubmittedDeclarationOption,
  SubmittedDeclarationDetail,
  VerifyProductBatchRequest,
  VerifyProductBatchResponse,
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

export async function getSubmittedSuppliers(signal?: AbortSignal): Promise<ProductBatchFilterOption[]> {
  const response = await apiClient.get<ApiResponse<ProductBatchFilterOption[]>>(`${base}/submitted-suppliers`, { signal })
  return response.data.data
}

export async function getSubmittedDeclarations(supplierId: number, signal?: AbortSignal): Promise<SubmittedDeclarationOption[]> {
  const response = await apiClient.get<ApiResponse<SubmittedDeclarationOption[]>>(`${base}/submitted`, { params: { supplierId }, signal })
  return response.data.data
}

export async function getSubmittedDeclaration(id: number, supplierId: number, signal?: AbortSignal): Promise<SubmittedDeclarationDetail> {
  const response = await apiClient.get<ApiResponse<SubmittedDeclarationDetail>>(`${base}/submitted/${id}`, { params: { supplierId }, signal })
  return response.data.data
}

export async function verifyProductBatch(id: number, supplierId: number, request: VerifyProductBatchRequest): Promise<VerifyProductBatchResponse> {
  const response = await apiClient.put<ApiResponse<VerifyProductBatchResponse>>(`${base}/${id}/verify`, request, { params: { supplierId } })
  return response.data.data
}
