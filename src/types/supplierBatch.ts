export interface GetSupplierBatchesQueryRequest {
  keyword?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface SupplierBatchItemResponse {
  batchId: number;
  batchCode: string;
  productName: string;
  quantityInTons: number;
  submittedDate: string;
  status: string;
  statusDisplayName: string;
}

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