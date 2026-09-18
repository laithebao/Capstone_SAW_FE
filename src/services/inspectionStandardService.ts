import { apiClient } from '@/services/apiClient'
import type { ApiResponse } from '@/types/api'

// ── Shared types ───────────────────────────────────────────────────────────────

export interface SaveCriterion {
  code: string
  name: string
  criterionGroup: string
  dataType: string
  unit?: string
  isRequired: boolean
  isCritical: boolean
  minValue?: number
  maxValue?: number
  requiredTextValue?: string
  isFailRule: boolean
}

// ── UC12 – Create Standard Set ─────────────────────────────────────────────────

export interface CreateInspectionStandardRequest {
  cropTypeId: number
  code: string
  name: string
  description?: string
  versionNo: number
  effectiveFrom?: string
  criteria: SaveCriterion[]
}

// ── UC13 – Create New Version ──────────────────────────────────────────────────

export interface CreateInspectionStandardVersionRequest {
  effectiveFrom?: string
  criteria: SaveCriterion[]
}

// ── Response types ─────────────────────────────────────────────────────────────

export interface InspectionStandardListItem {
  id: number
  code: string
  name: string
  cropTypeName: string
  versionNo: number
  status: string
  effectiveFrom: string | null
  criterionCount: number
}

export interface CriterionDto {
  id: number
  code: string
  name: string
  criterionGroup: string
  dataType: string
  unit: string | null
  isRequired: boolean
  isCritical: boolean
  minValue: number | null
  maxValue: number | null
  requiredTextValue: string | null
  isFailRule: boolean
}

export interface InspectionStandardVersionDto {
  versionId: number
  versionNo: number
  status: string
  effectiveFrom: string | null
  effectiveTo: string | null
  createdAt: string
  criterionCount: number
  criteria: CriterionDto[]
}

export interface InspectionStandardDetail {
  id: number
  code: string
  name: string
  description: string | null
  cropTypeId: number
  cropTypeName: string
  isActive: boolean
  createdAt: string
  versions: InspectionStandardVersionDto[]
}

export interface InspectionStandardVersionCreatedDto {
  setId: number
  setCode: string
  setName: string
  versionId: number
  versionNo: number
  status: string
  effectiveFrom: string | null
  criterionCount: number
}

// ── API functions ──────────────────────────────────────────────────────────────

export async function getInspectionStandards(search = ''): Promise<InspectionStandardListItem[]> {
  const response = await apiClient.get<ApiResponse<InspectionStandardListItem[]>>(
    '/inspection-standards', { params: { search } })
  return response.data.data
}

export async function getInspectionStandard(id: number): Promise<InspectionStandardDetail> {
  const response = await apiClient.get<ApiResponse<InspectionStandardDetail>>(
    `/inspection-standards/${id}`)
  return response.data.data
}

export async function createInspectionStandard(
  request: CreateInspectionStandardRequest
): Promise<InspectionStandardListItem> {
  const response = await apiClient.post<ApiResponse<InspectionStandardListItem>>(
    '/inspection-standards', request)
  return response.data.data
}

export async function createInspectionStandardVersion(
  setId: number,
  request: CreateInspectionStandardVersionRequest
): Promise<InspectionStandardVersionCreatedDto> {
  const response = await apiClient.post<ApiResponse<InspectionStandardVersionCreatedDto>>(
    `/inspection-standards/${setId}/versions`, request)
  return response.data.data
}
