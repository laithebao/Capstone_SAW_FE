import { apiClient } from '../apiClient';
import type { DeclareSupplierProfileRequest, SupplierProfileResponse } from '../../types/supplier';
import type { DeclareSupplierProfileFormValues } from '@/features/supplier/schemas/supplierProfileSchema';
import type { GetSupplierBatchesQueryRequest, SupplierBatchListResponse, SupplierBatchStatusResponse } from '@/types/supplierBatch';

export const supplierService = {
  getMyProfile: async (): Promise<SupplierProfileResponse> => {
    const response = await apiClient.get<SupplierProfileResponse>('/suppliers/me/profile');
    return response.data;
  },

  declareProfile: async (
    data: DeclareSupplierProfileRequest
  ): Promise<{ message: string; data: SupplierProfileResponse }> => {
    const response = await apiClient.post<{
      message: string;
      data: SupplierProfileResponse;
    }>('/api/Suppliers/me/declare', data);
    return response.data;
  },

  updateProfile: async (data: DeclareSupplierProfileFormValues): Promise<any> => {
    const response = await apiClient.put('/Suppliers/me/profile', data);
    return response.data;
  },

  // GET /api/SupplierBatches - UC46 (Danh sách lô hàng)
    getBatches: async (params?: GetSupplierBatchesQueryRequest): Promise<SupplierBatchListResponse> => {
      const response = await apiClient.get<SupplierBatchListResponse>('/SupplierBatches', { params });
      return response.data;
    },

    // POST /api/SupplierBatches - UC44 (Tạo mới lô hàng)
    createBatch: async (data: any): Promise<any> => {
      const response = await apiClient.post('/SupplierBatches', data);
      return response.data;
    },

    // PUT /api/SupplierBatches/{id} - UC45 (Cập nhật lô hàng)
    updateBatch: async (id: number, data: any): Promise<any> => {
      const response = await apiClient.put(`/SupplierBatches/${id}`, data);
      return response.data;
    },

    // GET /api/SupplierBatches/{id}/status - UC47 (Chi tiết tiến trình xử lý đơn/lô hàng)
    getBatchStatus: async (id: number): Promise<{ message?: string; data: SupplierBatchStatusResponse }> => {
      const response = await apiClient.get<{ message?: string; data: SupplierBatchStatusResponse }>(
        `/SupplierBatches/${id}/status`
      );
      return response.data;
    },
};