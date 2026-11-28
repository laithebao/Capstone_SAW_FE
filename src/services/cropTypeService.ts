import { apiClient } from '@/services/apiClient'
import type { ApiResponse } from '@/types/api'

export interface CropType {
  id: number
  code: string
  name: string
  categoryName: string
  categoryId: number | null
  parentCategoryId?: number | null
  childCategoryName?: string | null
  minTemperature: number | null
  maxTemperature: number | null
  minHumidity: number | null
  maxHumidity: number | null
  shelfLifeDays: number | null
  safetyStockLevelKg: number | null
  defaultUnit: string
  isActive: boolean
  createdAt: string
  updatedAt: string | null
}

export interface CropTypeListResponse {
  items: CropType[]
  totalCount: number
  page: number
  pageSize: number
}

export interface SaveCropTypeRequest {
  code: string
  name: string
  categoryName: string
  categoryId: number | null
  minTemperature?: number
  maxTemperature?: number
  minHumidity?: number
  maxHumidity?: number
  shelfLifeDays?: number
  safetyStockLevelKg?: number
  defaultUnit: string
  isActive: boolean
}

export type SaveCropTypeBasicsRequest = Pick<SaveCropTypeRequest, 'code' | 'name' | 'categoryId' | 'isActive'>

export async function saveCropTypeBasics(request: SaveCropTypeBasicsRequest, id?: number): Promise<CropType> {
  const response = id
    ? await apiClient.put<ApiResponse<CropType>>(`/crop-types/${id}/basic`, request)
    : await apiClient.post<ApiResponse<CropType>>('/crop-types/basic', request)
  return response.data.data
}

export async function getCropTypes(search = '', page = 1, pageSize = 100, signal?: AbortSignal): Promise<CropTypeListResponse> {
  const response = await apiClient.get<ApiResponse<CropTypeListResponse>>('/crop-types', { params: { search, page, pageSize }, signal })
  return response.data.data
}

export async function getCropTypeLookup(params: { categoryId?: number; search?: string; page?: number; pageSize?: number }, signal?: AbortSignal): Promise<CropTypeListResponse> {
  return (await apiClient.get<ApiResponse<CropTypeListResponse>>('/crop-types/lookup', { params: { page: 1, pageSize: 20, ...params }, signal })).data.data
}

export async function getCropType(id: number, signal?: AbortSignal): Promise<CropType> {
  const response = await apiClient.get<ApiResponse<CropType>>(`/crop-types/${id}`, { signal })
  return response.data.data
}

export async function saveCropType(request: SaveCropTypeRequest, id?: number): Promise<CropType> {
  const response = id
    ? await apiClient.put<ApiResponse<CropType>>(`/crop-types/${id}`, request)
    : await apiClient.post<ApiResponse<CropType>>('/crop-types', request)
  return response.data.data
}

export async function setCropTypeStatus(id: number, isActive: boolean): Promise<CropType> {
  const response = await apiClient.patch<ApiResponse<CropType>>(`/crop-types/${id}/status`, { isActive })
  return response.data.data
}

export async function deleteCropType(id: number): Promise<void> {
  await apiClient.delete(`/crop-types/${id}`)
}
