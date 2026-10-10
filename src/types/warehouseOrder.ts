export interface WarehouseDistributorOrderSummary {
  id: number;
  orderCode: string;
  status: string;
  distributorName: string;
  lineCount: number;
  totalAmount: number;
  createdAt: string;
  stockAvailable: boolean;
}
export interface WarehouseDistributorOrderPage {
  items: WarehouseDistributorOrderSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
}
export interface WarehouseDistributorOrderLine {
  orderDetailId: number;
  productName: string;
  batchCode?: string;
  requestedWeightKg: number;
  availableWeightKg: number;
  unitPrice: number;
  approvedWeightKg: number;
  stockAvailable: boolean;
}
export interface WarehouseDistributorOrderDetail {
  id: number;
  orderCode: string;
  status: string;
  distributorName: string;
  totalAmount: number;
  createdAt: string;
  expectedDeliveryDate?: string;
  deliveryAddress: string;
  contactPhone?: string;
  orderNote?: string;
  stockAvailable: boolean;
  lines: WarehouseDistributorOrderLine[];
}
export interface WarehouseOrderApprovalLine {
  orderDetailId: number;
  approvedWeightKg: number;
  unitPrice: number;
}
