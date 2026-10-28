import { apiClient } from '@/services/apiClient'
import type {
  InStorageBatchEnvDto,
  InStorageBatchEnvQuery,
  StorageEnvironmentLogRequest,
  StorageEnvironmentLogItem,
} from '@/types/storageEnvironment'
import type { PagedResult } from '@/types/inspection'

interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

function unwrap<T>(res: { data: ApiResponse<T> }): T {
  return res.data.data
}

/**
 * Lấy danh sách các lô hàng đang lưu kho kèm dữ liệu nhiệt ẩm đo gần nhất
 */
export async function getInStorageBatches(
  query: InStorageBatchEnvQuery = {}
): Promise<PagedResult<InStorageBatchEnvDto>> {
  const params = new URLSearchParams()
  if (query.search) params.set('search', query.search)
  if (query.zoneName) params.set('zoneName', query.zoneName)
  if (query.isOutOfRange !== undefined) params.set('isOutOfRange', String(query.isOutOfRange))
  if (query.isOverdue !== undefined) params.set('isOverdue', String(query.isOverdue))
  if (query.page) params.set('page', String(query.page))
  if (query.pageSize) params.set('pageSize', String(query.pageSize))

  const qs = params.toString() ? `?${params.toString()}` : ''
  return unwrap(
    await apiClient.get<ApiResponse<PagedResult<InStorageBatchEnvDto>>>(
      `/environment-logs/in-storage-batches${qs}`
    )
  )
}

/**
 * Lấy toàn bộ lịch sử đo nhiệt độ & độ ẩm của một lô hàng
 */
export async function getBatchEnvironmentLogs(
  batchId: number
): Promise<StorageEnvironmentLogItem[]> {
  return unwrap(
    await apiClient.get<ApiResponse<StorageEnvironmentLogItem[]>>(
      `/environment-logs/batches/${batchId}`
    )
  )
}

/**
 * Ghi nhận số đo nhiệt độ / độ ẩm cho lô hàng đang lưu kho
 */
export async function createStorageEnvironmentLog(
  req: StorageEnvironmentLogRequest
): Promise<StorageEnvironmentLogItem> {
  return unwrap(
    await apiClient.post<ApiResponse<StorageEnvironmentLogItem>>(
      '/environment-logs',
      req
    )
  )
}
