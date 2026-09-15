import axios from 'axios'
import { apiClient } from '@/services/apiClient'
import type { ApiResponse } from '@/types/api'
import type { AuthSession } from '@/types/auth'

export interface LoginRequest {
  identifier: string
  password: string
}

export async function login(request: LoginRequest): Promise<AuthSession> {
  const response = await apiClient.post<ApiResponse<AuthSession>>('/auth/login', request)
  return response.data.data
}

export function getAuthErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error))
    return error instanceof Error ? error.message : 'Không thể đăng nhập.'

  if (!error.response)
    return 'Không kết nối được Backend. Hãy kiểm tra API đang chạy ở cổng 5252.'

  const body = error.response.data as Partial<ApiResponse<unknown>> | undefined
  return body?.message ?? 'Đăng nhập không thành công.'
}
