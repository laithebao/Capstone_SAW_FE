export interface SupplierCropTypeDto {
  cropTypeId: number;
  cropCode: string;
  cropName: string;
  categoryName: string;
}

export interface SupplierCertificationDto {
  supplierCertificationId: number;
  certificationName: string;
  certificateNumber?: string;
  issuingOrganization?: string;
  issueDate?: string;
  expiryDate?: string;
  evidenceFileUrl?: string;
  isActive: boolean;
}

export interface SupplierDocumentDto {
  fileName: string;
  fileUrl: string;
  fileType?: string;
  fileSizeMb?: number;
}

export interface SupplierProfileResponse {
  supplierId: number;
  accountId: number;
  supplierCode: string;
  supplierName: string;
  taxCode: string;
  address: string;
  operatingRegion?: string;
  profileStatus: string;
  logoUrl?: string;
  supplierType?: string;
  contactPerson: string;
  legalRepresentative?: string;
  phoneNumber?: string;
  email?: string;
  detailedPlantingArea?: string;
  farmingAreaHa?: number;
  cropTypes: SupplierCropTypeDto[];
  certifications: SupplierCertificationDto[];
  documents: SupplierDocumentDto[];
}

export interface DeclareSupplierProfileRequest {
  supplierName: string;
  taxCode: string;
  supplierType?: string;
  legalRepresentative: string;
  contactPerson: string;
  phoneNumber?: string;
  email?: string;
  logoUrl?: string;
  province?: string;
  district?: string;
  ward?: string;
  address: string;
  farmingAreaHa?: number;
  cropTypeIds: number[];
  certifications: string[];
  evidenceDocumentUrls?: string[];
}