import { apiClient } from '@/services/apiClient'
import type { ApiResponse } from '@/types/api'

export interface DashboardCount { label: string; value: number }
export interface DailyDashboardActivity { date: string; accountCount: number; batchCount: number }

export interface AdminDashboardData {
  totalAccounts: number; activeAccounts: number; pendingAccounts: number
  totalCropTypes: number; activeCropTypes: number
  totalBatches: number; pendingBatches: number
  totalSuppliers: number; totalDistributors: number
  roleDistribution: DashboardCount[]; weeklyActivity: DailyDashboardActivity[]
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const response = await apiClient.get<ApiResponse<AdminDashboardData>>('/admin/dashboard')
  return response.data.data
}
