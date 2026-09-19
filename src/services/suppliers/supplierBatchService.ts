import { apiClient } from '../apiClient';
import type {
  GetSupplierBatchesQueryRequest,
  SupplierBatchListResponse,
} from '@/types/supplierBatch';

export const supplierBatchService = {
  // UC 3.2.44: Lấy danh sách lô hàng khai báo
  getDeclaredBatches: async (
    params: GetSupplierBatchesQueryRequest
  ): Promise<SupplierBatchListResponse> => {
    const response = await apiClient.get<SupplierBatchListResponse>(
      '/SupplierBatches',
      { params }
    );
    return response.data;
  },
};