import { apiClient } from './apiClient';
import type { ApiResponse } from '@/types/api';
import type { SpoilageForecastResponse } from '@/types/spoilageForecast';

const forecastUrl = '/warehouse/spoilage-forecast';

export async function generateSpoilageForecasts(signal: AbortSignal): Promise<SpoilageForecastResponse[]> {
  const response = await apiClient.post<ApiResponse<SpoilageForecastResponse[]>>(
    forecastUrl,
    undefined,
    { signal, timeout: 0 }
  );
  return response.data.data;
}

export async function getLatestSpoilageForecasts(signal: AbortSignal): Promise<SpoilageForecastResponse[]> {
  const response = await apiClient.get<ApiResponse<SpoilageForecastResponse[]>>(forecastUrl, { signal });
  return response.data.data;
}
