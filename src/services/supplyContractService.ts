import { apiClient } from "@/services/apiClient";
import type { ApiResponse } from "@/types/api";
import type {
  CreateSupplyContractRequest,
  SupplyContractDetail,
  SupplyContractOptions,
  SupplyContractPage,
  SupplyContractStatus,
  SupplyContractBatchOption,
  UpdateSupplyContractRequest,
} from "@/types/supplyContract";

export async function getEligibleSupplyContractsForBatch(
  expectedDeliveryDate?: string,
  signal?: AbortSignal,
) {
  const response = await apiClient.get<
    ApiResponse<SupplyContractBatchOption[]>
  >("/supply-contracts/eligible-for-batch", {
    params: { expectedDeliveryDate: expectedDeliveryDate || undefined },
    signal,
  });
  return response.data.data;
}

export async function getSupplyContracts(
  search: string,
  status: SupplyContractStatus | "",
  page: number,
  signal?: AbortSignal,
) {
  const response = await apiClient.get<ApiResponse<SupplyContractPage>>(
    "/supply-contracts",
    {
      params: { search: search || undefined, status: status || undefined, page, pageSize: 20 },
      signal,
    },
  );
  return response.data.data;
}

export async function getSupplyContract(id: number) {
  const response = await apiClient.get<ApiResponse<SupplyContractDetail>>(
    `/supply-contracts/${id}`,
  );
  return response.data.data;
}

export async function getSupplyContractOptions(signal?: AbortSignal) {
  const response = await apiClient.get<ApiResponse<SupplyContractOptions>>(
    "/supply-contracts/options",
    { signal },
  );
  return response.data.data;
}

export async function createSupplyContract(request: CreateSupplyContractRequest) {
  const response = await apiClient.post<ApiResponse<SupplyContractDetail>>(
    "/supply-contracts",
    request,
  );
  return response.data.data;
}

export async function updateSupplyContract(
  id: number,
  request: UpdateSupplyContractRequest,
) {
  const response = await apiClient.put<ApiResponse<SupplyContractDetail>>(
    `/supply-contracts/${id}`,
    request,
  );
  return response.data.data;
}

export async function requestSupplyContractCancellation(
  id: number,
  reason: string,
) {
  const response = await apiClient.post<ApiResponse<SupplyContractDetail>>(
    `/supply-contracts/${id}/supplier-cancel-request`,
    { reason },
  );
  return response.data.data;
}

export async function cancelSupplyContractByWarehouse(
  id: number,
  reason: string,
) {
  const response = await apiClient.post<ApiResponse<SupplyContractDetail>>(
    `/supply-contracts/${id}/warehouse-cancel`,
    { reason },
  );
  return response.data.data;
}

export async function rejectSupplyContractCancellationByWarehouse(
  id: number,
  reason: string,
) {
  const response = await apiClient.post<ApiResponse<SupplyContractDetail>>(
    `/supply-contracts/${id}/warehouse-cancel-reject`,
    { reason },
  );
  return response.data.data;
}

export async function cancelSupplyContractByAdmin(id: number) {
  const response = await apiClient.post<ApiResponse<SupplyContractDetail>>(
    `/supply-contracts/${id}/admin-cancel`,
  );
  return response.data.data;
}

export async function confirmSupplyContractBySupplier(id: number) {
  const response = await apiClient.post<ApiResponse<SupplyContractDetail>>(
    `/supply-contracts/${id}/supplier-confirm`,
  );
  return response.data.data;
}

export async function rejectSupplyContractBySupplier(id: number, reason: string) {
  const response = await apiClient.post<ApiResponse<SupplyContractDetail>>(
    `/supply-contracts/${id}/supplier-reject`,
    { reason },
  );
  return response.data.data;
}

export async function approveSupplyContractByAdmin(id: number) {
  const response = await apiClient.post<ApiResponse<SupplyContractDetail>>(
    `/supply-contracts/${id}/admin-approve`,
  );
  return response.data.data;
}

export async function rejectSupplyContractByAdmin(id: number, reason: string) {
  const response = await apiClient.post<ApiResponse<SupplyContractDetail>>(
    `/supply-contracts/${id}/admin-reject`,
    { reason },
  );
  return response.data.data;
}
