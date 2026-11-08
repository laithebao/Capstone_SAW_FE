import { apiClient } from '@/services/apiClient'
import type {
  CreateQcInspectionRequest,
  UpdateSamplingRatioRequest,
  SaveSensoryResultRequest,
  SaveEnvironmentCriteriaRequest,
  UploadQualityImageRequest,
  SaveLabResultRequest,
  CreateEnvironmentLogRequest,
  RejectBatchRequest,
  QcInspectionListQuery,
  QcInspectionDto,
  QcInspectionListItem,
  QcInspectionDetailDto,
  QualityImageDto,
  EnvironmentLogDto,
  FinalizeQcResultDto,
  PagedResult,
} from '@/types/inspection'

// ── API response wrapper ──────────────────────────────────────────────────────
interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

function unwrap<T>(res: { data: ApiResponse<T> }): T {
  return res.data.data
}

// ═══════════════════════════════════════════════════════════════════════════════
// UC20 – Create Inspection Form
// POST /api/qc-inspections
// ═══════════════════════════════════════════════════════════════════════════════

export async function createQcInspection(
  req: CreateQcInspectionRequest,
): Promise<QcInspectionDto> {
  return unwrap(await apiClient.post<ApiResponse<QcInspectionDto>>('/qc-inspections', req))
}

// ═══════════════════════════════════════════════════════════════════════════════
// UC21 – Declare Batch Sampling Ratio
// PATCH /api/qc-inspections/{id}/sampling-ratio
// ═══════════════════════════════════════════════════════════════════════════════

export async function updateSamplingRatio(
  inspectionId: number,
  req: UpdateSamplingRatioRequest,
): Promise<void> {
  await apiClient.patch(`/qc-inspections/${inspectionId}/sampling-ratio`, req)
}

// ═══════════════════════════════════════════════════════════════════════════════
// UC22 – Input Sensory Inspection Result
// PUT /api/qc-inspections/{id}/sensory-result
// ═══════════════════════════════════════════════════════════════════════════════

export async function saveSensoryResult(
  inspectionId: number,
  req: SaveSensoryResultRequest,
): Promise<void> {
  await apiClient.put(`/qc-inspections/${inspectionId}/sensory-result`, req)
}

// ═══════════════════════════════════════════════════════════════════════════════
// UC23 – Upload Quality Evidence Image
// POST /api/qc-inspections/{id}/images    (save metadata after Cloudinary upload)
// DELETE /api/qc-inspections/{id}/images/{imageId}
// ═══════════════════════════════════════════════════════════════════════════════

export async function addQualityImage(
  inspectionId: number,
  req: UploadQualityImageRequest,
): Promise<QualityImageDto> {
  return unwrap(await apiClient.post<ApiResponse<QualityImageDto>>(
    `/qc-inspections/${inspectionId}/images`, req,
  ))
}

export async function deleteQualityImage(
  inspectionId: number,
  imageId: number,
): Promise<void> {
  await apiClient.delete(`/qc-inspections/${inspectionId}/images/${imageId}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// UC24 – Input Laboratory Test Result
// PUT /api/qc-inspections/{id}/lab-result
// ═══════════════════════════════════════════════════════════════════════════════

export async function saveLabResult(
  inspectionId: number,
  req: SaveLabResultRequest,
): Promise<void> {
  await apiClient.put(`/qc-inspections/${inspectionId}/lab-result`, req)
}

// ═══════════════════════════════════════════════════════════════════════════════
// UC22b – Input Environment Criteria Result
// PUT /api/qc-inspections/{id}/environment-criteria
// ═══════════════════════════════════════════════════════════════════════════════

export async function saveEnvironmentCriteria(
  inspectionId: number,
  req: SaveEnvironmentCriteriaRequest,
): Promise<void> {
  await apiClient.put(`/qc-inspections/${inspectionId}/environment-criteria`, req)
}

// ═══════════════════════════════════════════════════════════════════════════════
// UC25 – Input Actual Storage Temperature
// POST /api/environment-logs
// ═══════════════════════════════════════════════════════════════════════════════

export async function createEnvironmentLog(
  req: CreateEnvironmentLogRequest,
): Promise<EnvironmentLogDto> {
  return unwrap(await apiClient.post<ApiResponse<EnvironmentLogDto>>('/environment-logs', req))
}

// ═══════════════════════════════════════════════════════════════════════════════
// UC52 + UC53 – Compare with Rule Set & Classify Grade (Finalize)
// POST /api/qc-inspections/{id}/finalize
// ═══════════════════════════════════════════════════════════════════════════════

export async function finalizeInspection(
  inspectionId: number,
): Promise<FinalizeQcResultDto> {
  return unwrap(await apiClient.post<ApiResponse<FinalizeQcResultDto>>(
    `/qc-inspections/${inspectionId}/finalize`,
  ))
}

// ═══════════════════════════════════════════════════════════════════════════════
// UC54 – Reject Batch with Serious Defect
// POST /api/qc-inspections/{id}/reject
// ═══════════════════════════════════════════════════════════════════════════════

export async function rejectBatch(
  inspectionId: number,
  req: RejectBatchRequest,
): Promise<void> {
  await apiClient.post(`/qc-inspections/${inspectionId}/reject`, req)
}

// ═══════════════════════════════════════════════════════════════════════════════
// UC62 – View Inspection List
// GET /api/qc-inspections
// ═══════════════════════════════════════════════════════════════════════════════

export async function listQcInspections(
  query: QcInspectionListQuery = {},
): Promise<PagedResult<QcInspectionListItem>> {
  const params = new URLSearchParams()
  if (query.batchCode)      params.set('batchCode', query.batchCode)
  if (query.inspectionCode) params.set('inspectionCode', query.inspectionCode)
  if (query.status)         params.set('status', query.status)
  if (query.qcResult)       params.set('qcResult', query.qcResult)
  if (query.qcAccountId)    params.set('qcAccountId', String(query.qcAccountId))
  if (query.fromDate)       params.set('fromDate', query.fromDate)
  if (query.toDate)         params.set('toDate', query.toDate)
  if (query.page)           params.set('page', String(query.page))
  if (query.pageSize)       params.set('pageSize', String(query.pageSize))

  return unwrap(await apiClient.get<ApiResponse<PagedResult<QcInspectionListItem>>>(
    `/qc-inspections?${params.toString()}`,
  ))
}

// ═══════════════════════════════════════════════════════════════════════════════
// Detail view
// GET /api/qc-inspections/{id}
// ═══════════════════════════════════════════════════════════════════════════════

export async function getQcInspection(
  inspectionId: number,
): Promise<QcInspectionDetailDto> {
  return unwrap(await apiClient.get<ApiResponse<QcInspectionDetailDto>>(
    `/qc-inspections/${inspectionId}`,
  ))
}
