import axios from 'axios'

// Token chỉ nằm trong bộ nhớ và được AuthContext cập nhật khi login/logout.
let accessToken: string | null = null

export function setApiAccessToken(token: string | null) {
  accessToken = token
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
})

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // Giữ nguyên AxiosError để service/page xử lý HTTP status và lỗi mạng.
    return Promise.reject(
      error instanceof Error ? error : new Error('Không thể thực hiện yêu cầu API.'),
    )
  },
)
