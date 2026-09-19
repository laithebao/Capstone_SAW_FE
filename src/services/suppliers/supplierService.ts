import { apiClient } from '../apiClient';
import type { SupplierProfileResponse } from '../../types/supplier';

export const supplierService = {
  getMyProfile: async (): Promise<SupplierProfileResponse> => {
    const response = await apiClient.get<SupplierProfileResponse>('/suppliers/me/profile');
    return response.data;
  },
};