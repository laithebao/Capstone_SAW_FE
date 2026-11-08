// ── QC Inspection Types ────────────────────────────────────────────────────────
// Mirror of BE DTOs in SAW.Application/Features/QcInspections/Dtos/

// ═══════════════════════════════════════════════════════════════════════════════
// Requests
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateQcInspectionRequest {
  productBatchId: number
  inspectionStandardVersionId: number
  note?: string
}

export interface UpdateSamplingRatioRequest {
  samplingRatio: number // 0 < ratio ≤ 1
}

export interface SaveCriterionResultRequest {
  inspectionCriterionId: number
  numericValue?: number
  textValue?: string
  booleanValue?: boolean
  remarks?: string
}

export interface SaveSensoryResultRequest {
  freshnessScore?: number   // 0-100
  sizeScore?: number        // 0-100
  colorScore?: number       // 0-100
  ripenessScore?: number    // 0-100
  damagePercentage?: number // 0-100
  note?: string
  criteriaResults: SaveCriterionResultRequest[]
}

export interface UploadQualityImageRequest {
  fileName: string
  fileUrl: string    // Cloudinary URL
  mimeType?: string
}

export interface SaveLabResultRequest {
  chemicalResidueStatus?: 'PASS' | 'FAIL' | 'NOT_TESTED'
  residueValue?: number
  residueUnit?: string
  pathogenStatus?: 'PASS' | 'FAIL' | 'NOT_TESTED'
  pathogenName?: string
  labName?: string
  testedAt?: string  // ISO datetime string
  note?: string
  criteriaResults: SaveCriterionResultRequest[]
}

export interface SaveEnvironmentCriteriaRequest {
  note?: string
  criteriaResults: SaveCriterionResultRequest[]
}

export interface CreateEnvironmentLogRequest {
  productBatchId: number
  warehouseLocationId?: number    // không bắt buộc trong phiên kiểm định
  qcInspectionId?: number
  temperatureC: number
  humidityPct?: number        // 0-100
  sourceType: 'MANUAL' | 'IOT_SENSOR' | 'IMPORT'
  sensorIdentifier?: string
  recordedAt: string          // ISO datetime string
  note?: string
}

export interface RejectBatchRequest {
  rejectionReason: string
}

export interface QcInspectionListQuery {
  batchCode?: string
  inspectionCode?: string
  status?: string
  qcResult?: string
  qcAccountId?: number
  fromDate?: string
  toDate?: string
  page?: number
  pageSize?: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// Response DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export interface QcInspectionDto {
  id: number
  inspectionCode: string
  productBatchId: number
  batchCode: string
  productName: string
  cropTypeName: string
  inspectionStandardVersionId: number
  standardCode: string
  standardName: string
  versionNo: number
  qcAccountId: number
  qcAccountName: string
  samplingRatio: number | null
  sampleSize: number | null
  inspectionStatus: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED'
  qcResult: 'PASS' | 'FAIL' | null
  qualityGrade: 'A' | 'B' | 'C' | 'D' | 'E' | null
  startedAt: string
  completedAt: string | null
  note: string | null
}

export interface QcInspectionListItem {
  id: number
  inspectionCode: string
  batchCode: string
  productName: string
  cropTypeName: string
  qcAccountName: string
  inspectionStatus: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED'
  qcResult: 'PASS' | 'FAIL' | null
  qualityGrade: 'A' | 'B' | 'C' | 'D' | 'E' | null
  startedAt: string
  completedAt: string | null
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
}

export interface GradeRuleSnapshot {
  grade: 'A' | 'B' | 'C' | 'D' | 'E'
  minValue: number | null
  maxValue: number | null
  requiredTextValue: string | null
  isFailRule: boolean
}

export interface CriterionResultDto {
  detailId: number
  criterionId: number
  criterionCode: string
  criterionName: string
  criterionGroup: 'SENSORY' | 'LAB' | 'ENVIRONMENT'
  dataType: 'NUMBER' | 'TEXT' | 'BOOLEAN'
  unit: string | null
  isRequired: boolean
  isCritical: boolean
  numericValue: number | null
  textValue: string | null
  booleanValue: boolean | null
  evaluatedGrade: 'A' | 'B' | 'C' | 'D' | 'E' | null
  isPassed: boolean
  remarks: string | null
  gradeRules: GradeRuleSnapshot[]
}

export interface SensoryResultDto {
  id: number
  freshnessScore: number | null
  sizeScore: number | null
  colorScore: number | null
  ripenessScore: number | null
  damagePercentage: number | null
  note: string | null
}

export interface LabResultDto {
  id: number
  chemicalResidueStatus: 'PASS' | 'FAIL' | 'NOT_TESTED' | null
  residueValue: number | null
  residueUnit: string | null
  pathogenStatus: 'PASS' | 'FAIL' | 'NOT_TESTED' | null
  pathogenName: string | null
  labName: string | null
  testedAt: string | null
  note: string | null
}

export interface QualityImageDto {
  id: number
  fileName: string
  fileUrl: string
  mimeType: string | null
  uploadedByAccountId: number
  uploadedByName: string
  uploadedAt: string
}

export interface EnvironmentLogDto {
  id: number
  productBatchId: number
  warehouseLocationId: number | null
  locationCode: string
  temperatureC: number
  humidityPct: number | null
  sourceType: 'MANUAL' | 'IOT_SENSOR' | 'IMPORT'
  sensorIdentifier: string | null
  recordedAt: string
  note: string | null
  isTempOutOfRange: boolean | null
}

export interface QcInspectionDetailDto extends QcInspectionDto {
  expectedMinTempC: number | null
  expectedMaxTempC: number | null
  expectedMinHumidityPct: number | null
  expectedMaxHumidityPct: number | null
  sensoryResult: SensoryResultDto | null
  labResult: LabResultDto | null
  images: QualityImageDto[]
  criteriaResults: CriterionResultDto[]
  environmentLogs: EnvironmentLogDto[]
}

export interface FinalizeQcResultDto {
  inspectionId: number
  inspectionCode: string
  qcResult: 'PASS' | 'FAIL'
  qualityGrade: 'A' | 'B' | 'C' | 'D' | 'E' | null
  newBatchStatus: string
  summary: string
}
