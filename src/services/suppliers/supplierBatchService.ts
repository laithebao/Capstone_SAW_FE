import type { DeclareBatchFormValues, UpdateBatchFormValues } from '@/features/supplier/schemas/supplierBatchSchema';
import { apiClient } from '../apiClient';
import type {
  GetSupplierBatchesQueryRequest,
  SupplierBatchItemResponse,
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

  // UC 3.2.45: Khai báo lô hàng mới
  declareBatch: async (
    data: DeclareBatchFormValues
  ): Promise<{ message: string; data: SupplierBatchItemResponse }> => {
    const response = await apiClient.post('/SupplierBatches', data);
    return response.data;
  },

  // UC 3.2.46: Chỉnh sửa thông tin lô hàng
  updateBatch: async (
    id: number,
    data: UpdateBatchFormValues
  ): Promise<{ message: string; data: SupplierBatchItemResponse }> => {
    const response = await apiClient.put(`/SupplierBatches/${id}`, data);
    return response.data;
  },

  getBatchStatus: async (
    id: number
  ): Promise<{ message: string; data: SupplierBatchListResponse }> => {
    const response = await apiClient.get(`/SupplierBatches/${id}/status`);
    return response.data;
  },
};