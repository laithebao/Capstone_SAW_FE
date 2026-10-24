import { apiClient } from '@/services/apiClient'
import type { ApiResponse } from '@/types/api'
import type { NotificationItem, NotificationList } from '@/types/notification'

export async function getNotifications(signal?: AbortSignal) {
  const response = await apiClient.get<ApiResponse<NotificationList>>('/notifications', { signal })
  return response.data.data
}

export async function markNotificationRead(id: number) {
  const response = await apiClient.post<ApiResponse<NotificationItem>>(`/notifications/${id}/read`)
  return response.data.data
}
