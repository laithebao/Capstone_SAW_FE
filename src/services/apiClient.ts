import axios from 'axios'

// AuthContext là nơi quản lý phiên. Biến cục bộ giúp request thường nhanh hơn;
// sessionStorage là nguồn khôi phục khi Vite hot-reload lại module trong lúc phát triển.
let accessToken: string | null = null
const sessionKey = 'saw.auth-session'

function restoreAccessToken(): string | null {
  try {
    const rawSession = sessionStorage.getItem(sessionKey)
    if (!rawSession) return null

    const session = JSON.parse(rawSession) as { accessToken?: string; refreshTokenExpiresAt?: string }
    if (!session.accessToken || !session.refreshTokenExpiresAt ||
      new Date(session.refreshTokenExpiresAt).getTime() <= Date.now()) return null

    return session.accessToken
  } catch {
    return null
  }
}

export function setApiAccessToken(token: string | null) {
  accessToken = token
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5252/api',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
})

apiClient.interceptors.request.use((config) => {
  accessToken ??= restoreAccessToken()
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status

      // 401 – phiên hết hạn: chuyển về trang đăng nhập
      if (status === 401) {
        sessionStorage.removeItem(sessionKey)
        window.location.href = '/login'
        return Promise.reject(error)
      }

      // 403 – không đủ quyền: chuyển về trang Forbidden thay vì lỗi mơ hồ
      if (status === 403) {
        window.location.href = '/forbidden'
        return Promise.reject(error)
      }
    }

    // Giữ nguyên AxiosError để service/page xử lý HTTP status và lỗi mạng.
    return Promise.reject(
      error instanceof Error ? error : new Error('Không thể thực hiện yêu cầu API.'),
    )
  },
)
