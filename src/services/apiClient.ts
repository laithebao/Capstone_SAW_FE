import axios from 'axios'
import { ROUTES } from '@/constants/routes'
import { authSessionIdentity, readAuthSession, writeAuthSession } from '@/services/authSession'
import type { AuthSession } from '@/types/auth'
import { announceNotificationMutation } from '@/services/notificationEvents'

let activeIdentity = authSessionIdentity(readAuthSession())
const requestIdentities = new WeakMap<object, string | null>()

export function setApiSession(session: AuthSession | null) {
  activeIdentity = authSessionIdentity(session)
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5252/api',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 30_000,  // 30s — đủ cho hầu hết requests
})

apiClient.interceptors.request.use((config) => {
  const session = readAuthSession()
  const identity = authSessionIdentity(session)
  if (identity !== activeIdentity) throw new axios.CanceledError('Phiên đăng nhập đã thay đổi ở tab khác. Vui lòng chờ tải lại trang.')
  requestIdentities.set(config, identity)
  // Logout có thể cần token chụp lại trước khi phiên dùng chung được xóa.
  if (config.url !== '/auth/logout' || !config.headers.has('Authorization')) {
    if (session) config.headers.set('Authorization', `Bearer ${session.accessToken}`)
    else config.headers.delete('Authorization')
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => {
    if (!response.config.url?.startsWith('/auth/') && requestIdentities.get(response.config) !== authSessionIdentity(readAuthSession()))
      throw new axios.CanceledError('Bỏ phản hồi từ phiên đăng nhập trước.')
    announceNotificationMutation(response.config.method, response.config.url)
    return response
  },
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      // Authentication failures belong to the login/registration form. A pending
      // email confirmation must not redirect to the permission-denied screen.
      if (error.config?.url?.startsWith('/auth/')) return Promise.reject(error)

      const current = readAuthSession()
      const requestToken = error.config?.headers.get('Authorization')
      // Không để request cũ đăng xuất/điều hướng phiên mới sau khi đổi tài khoản hoặc gia hạn token.
      if (requestToken !== (current ? `Bearer ${current.accessToken}` : undefined)) return Promise.reject(error)

      // 401 – phiên hết hạn: chuyển về trang đăng nhập
      if (status === 401) {
        writeAuthSession(null)
        setApiSession(null)
        window.location.href = '/login'
        return Promise.reject(error)
      }

      // 403 – không đủ quyền: chuyển về trang Forbidden thay vì lỗi mơ hồ
      if (status === 403) {
        window.location.href = ROUTES.FORBIDDEN
        return Promise.reject(error)
      }
    }

    // Giữ nguyên AxiosError để service/page xử lý HTTP status và lỗi mạng.
    return Promise.reject(
      error instanceof Error ? error : new Error('Không thể thực hiện yêu cầu API.'),
    )
  },
)
