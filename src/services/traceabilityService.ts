import { publicApiClient } from '@/services/publicApiClient'
import type { ApiResponse } from '@/types/api'
import type { PublicTraceability } from '@/types/traceability'

export function isValidPublicToken(token: string): boolean {
  return /^[a-f0-9]{64}$/.test(token)
}

export async function getPublicTraceability(publicToken: string, signal?: AbortSignal): Promise<PublicTraceability> {
  const response = await publicApiClient.get<ApiResponse<PublicTraceability>>(`/public/traceability/${encodeURIComponent(publicToken)}`, { signal })
  return response.data.data
}
