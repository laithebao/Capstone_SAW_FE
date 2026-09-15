import axios from 'axios'
import { apiClient } from '@/services/apiClient'
import type { ApiResponse } from '@/types/api'
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RegistrationResponse,
  GoogleLoginResponse,
} from '@/types/auth'

export async function login(request: LoginRequest): Promise<AuthResponse> {
  const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', request)
  return response.data.data
}

export async function googleLogin(idToken: string, roleId?: number): Promise<GoogleLoginResponse> {
  const response = await apiClient.post<ApiResponse<GoogleLoginResponse>>('/auth/google', { idToken, roleId })
  return response.data.data
}

export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post<ApiResponse<object>>('/auth/password/forgot', { email })
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiClient.post<ApiResponse<object>>('/auth/password/reset', { token, newPassword })
}

export async function register(request: RegisterRequest): Promise<RegistrationResponse> {
  const response = await apiClient.post<ApiResponse<RegistrationResponse>>('/auth/register', request)
  return response.data.data
}

export async function verifyEmail(token: string): Promise<void> {
  await apiClient.post<ApiResponse<object>>('/auth/email/verify', { token })
}

export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post<ApiResponse<object>>('/auth/logout', { refreshToken })
}

export function getApiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError<ApiResponse<unknown>>(error)) {
    return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.'
  }

  if (!error.response) {
    return 'Không kết nối được tới máy chủ. Hãy kiểm tra backend đang chạy.'
  }

  const body = error.response.data
  return body.errors?.join(' ') || body.message || 'Yêu cầu không thành công.'
}
