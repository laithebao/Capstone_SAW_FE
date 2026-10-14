export interface WarehouseSaleOfferItem {
  batchId: number;
  batchCode: string;
  productName: string;
  cropName: string;
  qualityGrade: string | null;
  batchStatus: string;
  verifiedWeightKg: number;
  availableWeightKg: number;
  wholeLotPrice: number | null;
  isPublished: boolean;
  isSold: boolean;
  isPendingApproval: boolean;
  canPublish: boolean;
  ineligibilityReason: string | null;
  updatedAt: string | null;
}

export interface WarehouseSaleOfferPage {
  items: WarehouseSaleOfferItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface WarehouseSaleOfferUpdateRequest {
  wholeLotPrice: number;
  isPublished: boolean;
}
