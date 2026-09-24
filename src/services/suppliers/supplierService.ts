import { apiClient } from '../apiClient';
import type { DeclareSupplierProfileRequest, SupplierGrowingAreaDto, SupplierProfileResponse } from '../../types/supplier';
import type { DeclareSupplierProfileFormValues } from '@/features/supplier/schemas/supplierProfileSchema';
import type { GetSupplierBatchesQueryRequest, SupplierBatchListResponse, SupplierBatchStatusResponse } from '@/types/supplierBatch';

export const supplierService = {
  getMyProfile: async (): Promise<SupplierProfileResponse> => {
    const response = await apiClient.get<SupplierProfileResponse>('/suppliers/me/profile');
    return response.data;
  },

  getGrowingAreas: async (): Promise<SupplierGrowingAreaDto[]> => {
    try {
      const response = await apiClient.get<SupplierGrowingAreaDto[]>('/api/GrowingAreas');
      return response.data;
    } catch {
      return [
        { growingAreaId: 1, areaName: 'Nông trường Mộc Châu', province: 'Sơn La', district: 'Mộc Châu', ward: 'Đông Sang' },
        { growingAreaId: 2, areaName: 'Trang trại GlobalGAP Đà Lạt', province: 'Lâm Đồng', district: 'Đà Lạt', ward: 'Phường 3' },
        { growingAreaId: 3, areaName: 'Vùng trồng Vĩnh Long', province: 'Vĩnh Long', district: 'Long Hồ', ward: 'Phú Quới' },
        { growingAreaId: 4, areaName: 'Trang trại Chợ Mới', province: 'An Giang', district: 'Chợ Mới', ward: 'Mỹ Luông' },
      ];
    }
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

  updateProfile: async (payload: any) => {
    const response = await apiClient.put('/suppliers/me/profile', payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  },

  uploadFile: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    // Trả về chuỗi URL (Ví dụ: "https://domain.com/uploads/logo.png")
    return response.data.url || response.data; 
  },

  getBatches: async (params?: GetSupplierBatchesQueryRequest): Promise<SupplierBatchListResponse> => {
    const response = await apiClient.get<SupplierBatchListResponse>('/SupplierBatches', { params });
    return response.data;
  },

  createBatch: async (data: any): Promise<any> => {
    const response = await apiClient.post('/SupplierBatches', data);
    return response.data;
  },

  updateBatch: async (id: number, data: any): Promise<any> => {
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