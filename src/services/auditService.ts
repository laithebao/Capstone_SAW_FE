import { apiClient } from '@/services/apiClient'
import type { ApiResponse } from '@/types/api'
import type { AuditLogDetail, AuditLogFilters, AuditLogListResponse } from '@/types/audit'

function query(filters: AuditLogFilters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '' && value !== undefined && value !== false))
}

export async function getAuditLogs(filters: AuditLogFilters): Promise<AuditLogListResponse> {
  const response = await apiClient.get<ApiResponse<AuditLogListResponse>>('/admin/audit-logs', { params: query(filters) })
  return response.data.data
}

export async function getAuditLog(id: number): Promise<AuditLogDetail> {
  const response = await apiClient.get<ApiResponse<AuditLogDetail>>(`/admin/audit-logs/${id}`)
  return response.data.data
}

export async function exportAuditLogs(filters: AuditLogFilters): Promise<void> {
  const response = await apiClient.get<Blob>('/admin/audit-logs/export', { params: query(filters), responseType: 'blob' })
  const url = URL.createObjectURL(response.data)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}
