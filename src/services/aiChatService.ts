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
  history?: ChatMessage[]
}

export interface AiChatHistoryTurn {
  id: number
  message: string
  reply: string
  sentAt: string
  repliedAt: string
}

export interface AiChatHistoryPage {
  items: AiChatHistoryTurn[]
  hasMore: boolean
}

export interface AiChatResponse {
  reply: string
  isError: boolean
  savedTurn?: AiChatHistoryTurn | null
}

export async function getAiChatHistory(beforeId?: number, signal?: AbortSignal): Promise<AiChatHistoryPage> {
  const response = await apiClient.get<ApiWrapper<AiChatHistoryPage>>('/distributor/ai-chat/history', {
    params: { beforeId },
    signal,
  })
  return response.data.data
}

export async function clearAiChatHistory(signal?: AbortSignal): Promise<void> {
  await apiClient.delete('/distributor/ai-chat/history', { signal })
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
