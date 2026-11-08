import { uploadSupplierFile } from '@/features/supplier/supplierFiles';
import { apiClient } from '../apiClient';
import type {
  DeclareSupplierProfileRequest,
  SupplierCropTypeDto,
  SupplierGrowingAreaDto,
  SupplierProfileResponse,
} from '../../types/supplier';
import type {
  GetSupplierBatchesQueryRequest,
  SupplierBatchListResponse,
  SupplierBatchStatusResponse,
} from '@/types/supplierBatch';

// Hàm helper chuẩn hóa mọi định dạng DTO trả về từ Backend về chuẩn SupplierCropTypeDto
const normalizeCropType = (input: unknown): SupplierCropTypeDto => {
  const item = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  return {
    cropTypeId: Number(item?.cropTypeId ?? item?.id ?? 0),
    cropCode: String(item?.cropCode ?? item?.code ?? ''),
    cropName: String(item?.cropName ?? item?.name ?? item?.title ?? 'Nông sản không tên'),
    categoryName: String(item?.categoryName ?? item?.category ?? 'Nông sản khác'),
  };
};

export const supplierService = {
  getMyProfile: async (): Promise<SupplierProfileResponse> => {
    const response = await apiClient.get<SupplierProfileResponse>('/suppliers/me/profile');
    
    // Chuẩn hóa danh sách cropTypes trong Profile
    if (response.data && Array.isArray(response.data.cropTypes)) {
      response.data.cropTypes = response.data.cropTypes.map(normalizeCropType);
    }
    return response.data;
  },

  getGrowingAreas: async (): Promise<SupplierGrowingAreaDto[]> => {
    try {
      const response = await apiClient.get<SupplierGrowingAreaDto[]>('/GrowingAreas');
      return response.data;
    } catch (error) {
      console.error('Lỗi khi tải danh sách Vùng trồng từ server:', error);
      return [];
    }
  },

  getCropTypes: async (): Promise<SupplierCropTypeDto[]> => {
    try {
      const response = await apiClient.get<unknown>('/crop-types', {
        params: { pageSize: 100, isActive: true },
      });
      
      const body = response.data;
      const resData = (body && typeof body === 'object' ? body : {}) as { data?: { items?: unknown[] } | unknown[]; items?: unknown[] };
      const rawList: unknown[] = Array.isArray(body) ? body : Array.isArray(resData.data) ? resData.data : resData.data?.items ?? resData.items ?? [];

      return rawList.map(normalizeCropType);
    } catch (error) {
      console.error('Lỗi khi tải danh sách Cây trồng từ server:', error);
      return [];
    }
  },

  declareProfile: async (
    data: DeclareSupplierProfileRequest
  ): Promise<{ message: string; data: SupplierProfileResponse }> => {
    const response = await apiClient.post<{
      message: string;
      data: SupplierProfileResponse;
    }>('/suppliers/me/declare', data);
    return response.data;
  },

  updateProfile: async (payload: DeclareSupplierProfileRequest) => {
    const response = await apiClient.put('/suppliers/me/profile', payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  },

  uploadFile: uploadSupplierFile,

  getBatches: async (params?: GetSupplierBatchesQueryRequest): Promise<SupplierBatchListResponse> => {
    const response = await apiClient.get<SupplierBatchListResponse>('/SupplierBatches', { params });
    return response.data;
  },

  createBatch: async (data: import('@/features/supplier/schemas/supplierBatchSchema').DeclareBatchFormValues) => {
    const response = await apiClient.post('/SupplierBatches', data);
    return response.data;
  },

  updateBatch: async (id: number, data: import('@/features/supplier/schemas/supplierBatchSchema').UpdateBatchFormValues & { expectedCreatedAt: string; expectedUpdatedAt: string | null }) => {
    const response = await apiClient.put(`/SupplierBatches/${id}`, data);
    return response.data;
  },

  getBatchStatus: async (id: number): Promise<{ message?: string; data: SupplierBatchStatusResponse }> => {
    const response = await apiClient.get<{ message?: string; data: SupplierBatchStatusResponse }>(
      `/SupplierBatches/${id}/status`
    );
    return response.data;
  },
};