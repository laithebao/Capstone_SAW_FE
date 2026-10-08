import { apiClient } from "@/services/apiClient";
import type { ApiResponse } from "@/types/api";
import type {
  ProductQualityDistributionChart,
  WarehouseCapacityChart,
  WarehouseInventoryLevelChart,
} from "@/types/inventory";
import type {
  WarehouseDistributorOrderDetail,
  WarehouseDistributorOrderPage,
} from "@/types/warehouseOrder";

export async function getWarehouseDistributorOrders(
  status = "PENDING",
  signal?: AbortSignal,
) {
  const response = await apiClient.get<
    ApiResponse<WarehouseDistributorOrderPage>
  >("/warehouse-manager/orders", { params: { status }, signal });
  return response.data.data;
}
export async function getWarehouseDistributorOrder(id: number) {
  const response = await apiClient.get<
    ApiResponse<WarehouseDistributorOrderDetail>
  >(`/warehouse-manager/orders/${id}`);
  return response.data.data;
}
export async function approveWarehouseDistributorOrder(id: number) {
  const response = await apiClient.post<
    ApiResponse<WarehouseDistributorOrderDetail>
  >(`/warehouse-manager/orders/${id}/approve`);
  return response.data.data;
}

export async function getWarehouseInventoryLevels(signal?: AbortSignal) {
  const response = await apiClient.get<
    ApiResponse<WarehouseInventoryLevelChart>
  >("/warehouse-manager/inventory/levels", { signal });
  return response.data.data;
}

export async function getWarehouseCapacity(signal?: AbortSignal) {
  const response = await apiClient.get<ApiResponse<WarehouseCapacityChart>>(
    "/warehouse-manager/inventory/capacity",
    { signal },
  );
  return response.data.data;
}

export async function getProductQualityDistribution(signal?: AbortSignal) {
  const response = await apiClient.get<
    ApiResponse<ProductQualityDistributionChart>
  >("/warehouse-manager/inventory/quality-distribution", { signal });
  return response.data.data;
}
