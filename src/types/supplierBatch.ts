// Định dạng vùng trồng cho Dropdown UI
export interface GrowingAreaOption {
  growingAreaId: number;
  areaName: string;
  region: string;
  province: string;
  district: string;
  ward: string;
}

// Request lọc danh sách lô hàng
export interface GetSupplierBatchesQueryRequest {
  keyword?: string;
  status?: string;
  province?: string; // Đã sửa: Đổi origin thành province
  consumptionStatus?: string;
  fromDate?: string;
  toDate?: string;
  pageIndex?: number;
  pageSize?: number;
}

// Item trong danh sách lô hàng
export interface SupplierBatchItemResponse {
  batchId: number;
  batchCode: string;
  productName: string;
  
  // Thông tin hiển thị cột Vùng trồng trên UI
  areaName?: string; 
  province?: string; 
  district?: string;
  ward?: string;
  
  note?: string | null;
  quantityInTons: number;
  submittedDate: string;
  completedDate?: string | null;
  status: string;
  statusDisplayName: string;
  consumptionStatus?: string;
  consumptionStatusDisplayName?: string;
}

// Tổng quan thống kê danh sách lô hàng
export interface SupplierBatchSummaryResponse {
  totalDeclaredBatches: number;
  pendingApprovalBatches: number;
  pendingQCBatches: number;
  approvedBatches: number;
  rejectedBatches: number;
}

export interface PagingResult<T> {
  items: T[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}

export interface SupplierBatchListResponse {
  summary: SupplierBatchSummaryResponse;
  batches: PagingResult<SupplierBatchItemResponse>;
}

export interface BatchStatusHistoryDto {
  oldStatus: string;
  newStatus: string;
  changeReason?: string | null;
  changedAt: string;
  changedBy?: string | null;
}

// Response chi tiết trạng thái lô hàng
export interface SupplierBatchStatusResponse {
  batchId: number;
  batchCode: string;
  productName: string;
  cropTypeName: string;
  
  // Tách chi tiết Vùng trồng
  areaName: string;
  province: string;
  district: string;
  ward: string;
  
  harvestDate: string;

  declaredQuantity: number;
  unit: string;
  receivedQuantity: number;
  weightInKg: number;

  currentStatus: string;
  statusDisplayName: string;
  qcResult?: string | null;
  qualityGrade?: string | null;
  rejectionReason?: string | null;
  warehouseNote?: string | null;

  expectedDeliveryDate?: string | null;
  createdAt: string;

  statusHistory: BatchStatusHistoryDto[];
}