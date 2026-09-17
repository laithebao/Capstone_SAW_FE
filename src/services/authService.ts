import axios from 'axios'
import { apiClient } from '@/services/apiClient'
import type { ApiResponse } from '@/types/api'
import type { AuthSession } from '@/types/auth'

export interface LoginRequest {
  identifier: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  fullName: string
  phoneNumber?: string
  roleId: number
  organizationName: string
  taxCode: string
  address?: string
}

export interface RegistrationResponse {
  accountId: number
  username: string
  email: string
  roleId: number
}

export interface GoogleLoginResponse {
  requiresRole: boolean
  session: AuthSession | null
}

export async function login(request: LoginRequest): Promise<AuthSession> {
  const response = await apiClient.post<ApiResponse<AuthSession>>('/auth/login', request)
  return response.data.data
}

export async function registerAccount(request: RegisterRequest): Promise<RegistrationResponse> {
  const response = await apiClient.post<ApiResponse<RegistrationResponse>>('/auth/register', request)
  return response.data.data
}

export async function loginWithGoogle(idToken: string, roleId?: number): Promise<GoogleLoginResponse> {
  const response = await apiClient.post<ApiResponse<GoogleLoginResponse>>('/auth/google', { idToken, roleId })
  return response.data.data
}

export async function refreshSession(refreshToken: string): Promise<AuthSession> {
  const response = await apiClient.post<ApiResponse<AuthSession>>('/auth/refresh-token', { refreshToken })
  return response.data.data
}

export async function logoutSession(refreshToken: string): Promise<void> {
  await apiClient.post('/auth/logout', { refreshToken })
}

export async function verifyEmail(token: string): Promise<void> {
  await apiClient.post('/auth/email/verify', { token })
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiClient.post('/auth/password/forgot', { email })
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiClient.post('/auth/password/reset', { token, newPassword })
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.post('/auth/password/change', { currentPassword, newPassword })
}

export function getAuthErrorMessage(error: unknown, fallback = 'Không thể thực hiện yêu cầu.'): string {
  if (!axios.isAxiosError(error))
    return error instanceof Error ? error.message : fallback

  if (!error.response)
    return 'Không kết nối được Backend. Hãy kiểm tra API đang chạy ở cổng 5252.'

  const body = error.response.data as Partial<ApiResponse<unknown>> | undefined
  return body?.message ?? fallback
}
