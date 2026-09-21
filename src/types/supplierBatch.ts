// Request lọc danh sách lô hàng (UC 3.2.44)
export interface GetSupplierBatchesQueryRequest {
  keyword?: string; // Tìm kiếm theo Mã lô hàng hoặc Tên sản phẩm
  status?: string; // SUBMITTED, PENDING_QC, APPROVED, REJECTED...
  origin?: string; // Lọc theo Khu vực (Đắk Lắk, Gia Lai...)
  consumptionStatus?: string; // Lọc theo Trạng thái tiêu thụ
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
  origin?: string; // Khu vực sản xuất / Nguồn gốc
  note?: string | null; // Ghi chú / Mô tả lô hàng
  quantityInTons: number;
  submittedDate: string; // Ngày tạo / Ngày nộp
  completedDate?: string | null; // Ngày hoàn thành
  status: string;
  statusDisplayName: string;
  consumptionStatus?: string; // Trạng thái tiêu thụ (IN_STOCK, CONSUMING, CONSUMED)
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

// Phân trang chung
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

// Response chi tiết trạng thái lô hàng (UC 3.2.47)
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