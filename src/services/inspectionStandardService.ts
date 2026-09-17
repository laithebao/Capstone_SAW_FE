import { apiClient } from '@/services/apiClient'
import type { ApiResponse } from '@/types/api'
export interface SaveCriterion { code:string; name:string; criterionGroup:string; dataType:string; unit?:string; isRequired:boolean; isCritical:boolean; minValue?:number; maxValue?:number; requiredTextValue?:string; isFailRule:boolean }
export interface CreateInspectionStandardRequest { cropTypeId:number; code:string; name:string; description?:string; versionNo:number; effectiveFrom?:string; criteria:SaveCriterion[] }
export interface InspectionStandardListItem { id:number; code:string; name:string; cropTypeName:string; versionNo:number; status:string; effectiveFrom:string|null; criterionCount:number }
export async function createInspectionStandard(request:CreateInspectionStandardRequest){const response=await apiClient.post<ApiResponse<unknown>>('/inspection-standards',request);return response.data.data}
export async function getInspectionStandards(search=''){const response=await apiClient.get<ApiResponse<InspectionStandardListItem[]>>('/inspection-standards',{params:{search}});return response.data.data}
