import { apiClient } from '../apiClient';
import type { DeclareSupplierProfileRequest, SupplierProfileResponse } from '../../types/supplier';
import type { DeclareSupplierProfileFormValues } from '@/features/supplier/schemas/supplierProfileSchema';

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
};