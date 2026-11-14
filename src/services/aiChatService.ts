import { apiClient } from './apiClient'

export interface ChatMessage {
  role: 'user' | 'model'
  content: string
}

export interface AiChatRequest {
  message: string
  batchContextId?: number | null
  batchContextCode?: string | null
  batchCode?: string | null
  history: ChatMessage[]
}

export interface AiChatResponse {
  reply: string
  isError: boolean
}

interface ApiWrapper<T> {
  data: T
  message: string
}

export async function sendAiChatMessage(
  request: AiChatRequest,
  signal?: AbortSignal,
): Promise<AiChatResponse> {
  const response = await apiClient.post<ApiWrapper<AiChatResponse>>(
    '/distributor/ai-chat',
    request,
    {
      signal,
      timeout: 180_000, // 180 giây, đủ cho nhiều vòng gọi công cụ và tổng hợp câu trả lời.
    },
  )
  return response.data.data
}
