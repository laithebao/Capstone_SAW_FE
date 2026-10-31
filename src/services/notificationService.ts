import { apiClient } from '@/services/apiClient'
import type { ApiResponse } from '@/types/api'
import type { NotificationItem, NotificationList } from '@/types/notification'

export async function getNotifications(signal?: AbortSignal, beforeId?: number) {
  const response = await apiClient.get<ApiResponse<NotificationList>>('/notifications', { signal, params: { beforeId } })
  return response.data.data
}

export async function markNotificationRead(id: number) {
  const response = await apiClient.post<ApiResponse<NotificationItem>>(`/notifications/${id}/read`)
  return response.data.data
}

export async function markAllNotificationsRead() {
  const response = await apiClient.post<ApiResponse<{ readThroughId: number; unreadCount: number }>>('/notifications/read-all')
  return response.data.data
}
