import { apiClient } from '@/services/apiClient'
import type { ApiResponse } from '@/types/api'
import type { UpdateUserProfileRequest, UserProfile } from '@/types/userProfile'
import axios from 'axios'
import { getAuthErrorMessage } from '@/services/authService'

export function getProfileErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as Partial<ApiResponse<unknown>> | undefined
    if (Array.isArray(body?.errors) && body.errors.length > 0) return body.errors.join(' ')
  }
  return getAuthErrorMessage(error, fallback)
}

export async function getMyProfile(signal?: AbortSignal): Promise<UserProfile> {
  const response = await apiClient.get<ApiResponse<UserProfile>>('/user-profiles/me', { signal })
  return response.data.data
}

export async function updateMyProfile(request: UpdateUserProfileRequest, registeredTaxCode?: string | null): Promise<UserProfile> {
  if (request.distributor && !registeredTaxCode?.trim()) {
    throw new Error('Không đọc được mã số thuế đã đăng ký. Vui lòng tải lại hồ sơ trước khi lưu.')
  }
  // Some deployed DTO versions require TaxCode. Send the stored value separately
  // from editable fields; never take it from the draft or the disabled input.
  const payload = request.distributor
    ? { ...request, distributor: { ...request.distributor, taxCode: registeredTaxCode } }
    : request
  const response = await apiClient.put<ApiResponse<UserProfile>>('/user-profiles/me', payload)
  return response.data.data
}
