import { apiClient } from '@/services/apiClient'
import type { ApiResponse } from '@/types/api'

export interface UserAccessListItem {
  id: number; username: string; fullName: string; email: string
  roleCode: string; roleName: string; status: string; lastLoginAt: string | null; inactiveReviewFlag: boolean
}
export interface RoleOption { id: number; code: string; name: string }
export interface PermissionOption { id: number; code: string; name: string; description: string | null }
export interface PermissionAssignment { permissionId: number; permissionCode: string; permissionName: string; isGranted: boolean }
export interface UserAccessDetail { user: UserAccessListItem; roleId: number; permissionOverrides: PermissionAssignment[] }
export interface UserAccessListResponse { items: UserAccessListItem[]; totalCount: number; page: number; pageSize: number }

const base = '/admin/user-access'
export async function getAccounts(search = '', roleId?: number, status?: string): Promise<UserAccessListResponse> {
  const response = await apiClient.get<ApiResponse<UserAccessListResponse>>(`${base}/accounts`, { params: { search, roleId, status, pageSize: 100 } })
  return response.data.data
}
export async function getAccountAccess(id: number): Promise<UserAccessDetail> {
  const response = await apiClient.get<ApiResponse<UserAccessDetail>>(`${base}/accounts/${id}`)
  return response.data.data
}
export async function getRoles(): Promise<RoleOption[]> {
  const response = await apiClient.get<ApiResponse<RoleOption[]>>(`${base}/roles`)
  return response.data.data
}
export async function getPermissions(): Promise<PermissionOption[]> {
  const response = await apiClient.get<ApiResponse<PermissionOption[]>>(`${base}/permissions`)
  return response.data.data
}
export async function updateAccountAccess(id: number, roleId: number, permissionOverrides: { permissionId: number; isGranted: boolean }[]): Promise<UserAccessDetail> {
  const response = await apiClient.put<ApiResponse<UserAccessDetail>>(`${base}/accounts/${id}/access`, { roleId, permissionOverrides })
  return response.data.data
}
export async function updateAccountStatus(id: number, status: string): Promise<UserAccessListItem> {
  const response = await apiClient.patch<ApiResponse<UserAccessListItem>>(`${base}/accounts/${id}/status`, { status })
  return response.data.data
}
