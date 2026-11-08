import { apiClient } from './apiClient';
import type { 
  SpoilageForecastRequest, 
  SpoilageForecastResponse 
} from '../types/spoilageForecast';

interface ApiWrapper<T> {
  statusCode: number;
  isSuccess: boolean;
  message: string;
  data: T;
}

/**
 * Gửi yêu cầu phân tích hoặc làm mới dự báo rủi ro hao hụt bằng AI.
 */
export async function generateSpoilageForecast(
  request: SpoilageForecastRequest,
  signal?: AbortSignal
): Promise<SpoilageForecastResponse> {
  const response = await apiClient.post<ApiWrapper<SpoilageForecastResponse>>(
    '/warehouse/spoilage-forecast',
    request,
    {
      signal,
      timeout: 120_000 // 120s cho AI suy luận sâu
    }
  );
  return response.data.data;
}

/**
 * Lấy kết quả dự báo gần nhất của một lô hàng (từ cache/DB).
 */
export async function getLatestSpoilageForecast(
  batchId: number,
  signal?: AbortSignal
): Promise<SpoilageForecastResponse | null> {
  try {
    const response = await apiClient.get<ApiWrapper<SpoilageForecastResponse>>(
      `/warehouse/spoilage-forecast/${batchId}/latest`,
      { signal }
    );
    return response.data.data;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Lấy lịch sử các lần dự báo của một lô hàng.
 */
export async function getSpoilageForecastHistory(
  batchId: number,
  count = 5,
  signal?: AbortSignal
): Promise<SpoilageForecastResponse[]> {
  const response = await apiClient.get<ApiWrapper<SpoilageForecastResponse[]>>(
    `/warehouse/spoilage-forecast/${batchId}/history?count=${count}`,
    { signal }
  );
  return response.data.data ?? [];
}

/**
 * Lấy danh sách các lô hàng đang lưu kho có rủi ro cao (HIGH hoặc CRITICAL) cho Warehouse Manager.
 */
export async function getHighRiskBatches(
  limit = 10,
  signal?: AbortSignal
): Promise<SpoilageForecastResponse[]> {
  const response = await apiClient.get<ApiWrapper<SpoilageForecastResponse[]>>(
    `/warehouse/spoilage-forecast/high-risk?limit=${limit}`,
    { signal }
  );
  return response.data.data ?? [];
}
