export type SupplyContractStatus =
  | "PENDING_SUPPLIER"
  | "SUPPLIER_REJECTED"
  | "PENDING_ADMIN"
  | "ADMIN_REJECTED"
  | "APPROVED"
  | "CANCELLATION_REQUESTED"
  | "PENDING_ADMIN_CANCELLATION"
  | "CANCELLATION_REJECTED"
  | "CANCELLED";

export type DeliveryPeriod = "WEEK" | "MONTH";

export interface SupplyContractSummary {
  id: number;
  contractCode: string;
  supplierName: string;
  cropTypeName: string;
  qualityGrade: string;
  deliveryQuantityKg: number;
  deliveryPeriod: DeliveryPeriod;
  unitPriceVndPerKg: number;
  startDate: string;
  endDate: string;
  status: SupplyContractStatus;
  revision: number;
  createdAt: string;
}

export interface SupplyContractDetail extends SupplyContractSummary {
  supplierId: number;
  cropTypeId: number;
  terms: string | null;
  warehouseManagerName: string;
  supplierRespondedAt: string | null;
  supplierRejectionReason: string | null;
  adminName: string | null;
  adminReviewedAt: string | null;
  adminRejectionReason: string | null;
  cancellationRequestedAt: string | null;
  cancellationRequestReason: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
}

export interface SupplyContractPage {
  items: SupplyContractSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface SupplyContractSupplierOption {
  id: number;
  code: string;
  name: string;
  cropTypeIds: number[];
}

export interface SupplyContractCropTypeOption {
  id: number;
  code: string;
  name: string;
  categoryName: string;
}

export interface SupplyContractOptions {
  suppliers: SupplyContractSupplierOption[];
  cropTypes: SupplyContractCropTypeOption[];
  qualityGrades: string[];
}

export interface SupplyContractBatchOption {
  id: number;
  contractCode: string;
  cropTypeId: number;
  cropTypeName: string;
  categoryName: string;
  qualityGrade: string;
  deliveryQuantityKg: number;
  usedQuantityKg: number;
  remainingQuantityKg: number;
  deliveryPeriod: DeliveryPeriod;
  unitPriceVndPerKg: number;
  startDate: string;
  endDate: string;
  quotaPeriodStartDate: string;
  quotaPeriodEndDate: string;
}

export interface CreateSupplyContractRequest {
  supplierId: number;
  cropTypeId: number;
  qualityGrade: string;
  deliveryQuantityKg: number;
  deliveryPeriod: DeliveryPeriod;
  unitPriceVndPerKg: number;
  startDate: string;
  endDate: string;
  terms: string | null;
}

export type UpdateSupplyContractRequest = Omit<
  CreateSupplyContractRequest,
  "supplierId" | "cropTypeId"
>;
