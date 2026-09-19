// Request lọc danh sách lô hàng
export interface GetSupplierBatchesQueryRequest {
  keyword?: string;
  status?: string;
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
  quantityInTons: number;
  submittedDate: string;
  status: string;
  statusDisplayName: string;
}

// Tổng quan danh sách lô hàng
export interface SupplierBatchSummaryResponse {
  totalDeclaredBatches: number;
  pendingApprovalBatches: number;
  pendingQCBatches: number;
  approvedBatches: number;
  rejectedBatches: number;
}

// Phân trang
export interface PagingResult<T> {
  items: T[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}

// Response trả về danh sách lô hàng
export interface SupplierBatchListResponse {
  summary: SupplierBatchSummaryResponse;
  batches: PagingResult<SupplierBatchItemResponse>;
}

// Lịch sử tiến trình chuyển trạng thái
export interface BatchStatusHistoryDto {
  oldStatus: string;
  newStatus: string;
  changeReason?: string | null;
  changedAt: string;
  changedBy?: string | null;
}

// Response chi tiết trạng thái lô hàng (UC 3.2.47) - CHUẨN 100% VỚI BACKEND DTO
export interface SupplierBatchStatusResponse {
  batchId: number;
  batchCode: string;
  productName: string;
  cropTypeName: string;
  origin: string;
  harvestDate: string; // DateOnly -> string (YYYY-MM-DD)

  // Khối lượng & Số lượng
  declaredQuantity: number;
  unit: string;
  receivedQuantity: number;
  weightInKg: number;

  // Trạng thái & Kết quả QC
  currentStatus: string;
  statusDisplayName: string;
  qcResult?: string | null;
  qualityGrade?: string | null;
  rejectionReason?: string | null;
  warehouseNote?: string | null;

  // Ngày tháng liên quan
  expectedDeliveryDate?: string | null;
  createdAt: string;

  // Lịch sử tiến trình xử lý
  statusHistory: BatchStatusHistoryDto[];
}