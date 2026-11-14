import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { setApiSession } from '@/services/apiClient'
import { logoutSession, refreshSession } from '@/services/authService'
import { AUTH_SESSION_KEY, authSessionIdentity, readAuthSession, refreshSharedAuthSession, writeAuthSession } from '@/services/authSession'
import { ROLE_HOME_ROUTES, ROUTES } from '@/constants/routes'
import type { AuthContextValue, AuthSession } from '@/types/auth'

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function loadSession(): AuthSession | null {
  sessionStorage.removeItem(AUTH_SESSION_KEY)
  const session = readAuthSession()
  setApiSession(session)
  return session
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(loadSession)
  const sessionRef = useRef(session)
  const applySession = useCallback((next: AuthSession | null) => {
    sessionRef.current = next
    setApiSession(next)
    setSession(next)
  }, [])

  const synchronize = useCallback(() => {
    const next = readAuthSession()
    if (authSessionIdentity(next) !== authSessionIdentity(sessionRef.current)) {
      // Tải lại khi đổi tài khoản để bỏ cả dữ liệu/form cũ, kể cả khi cùng role.
      window.location.replace(next ? ROLE_HOME_ROUTES[next.user.role] : ROUTES.LOGIN)
      return
    }
    applySession(next)
  }, [applySession])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea === localStorage && (event.key === AUTH_SESSION_KEY || event.key === null)) synchronize()
    }
    const onVisible = () => { if (document.visibilityState === 'visible') synchronize() }
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', synchronize)
    document.addEventListener('visibilitychange', onVisible)
    synchronize()
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', synchronize)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [synchronize])

  useEffect(() => {
    if (!session) return
    let disposed = false
    const refreshIn = Math.max(new Date(session.expiresAt).getTime() - Date.now() - 60_000, 0)
    const timeoutId = window.setTimeout(async () => {
      await refreshSharedAuthSession(session, refreshSession)
      if (!disposed) synchronize()
    }, refreshIn)
    return () => { disposed = true; window.clearTimeout(timeoutId) }
  }, [session, synchronize])

  // Chỉ nhận phiên do API xác thực trả về; không tự tạo tài khoản ở phía FE.
  function login(nextSession: AuthSession) {
    if (!nextSession.accessToken.trim()) throw new Error('Phiên đăng nhập cần có access token.')
    if (new Date(nextSession.expiresAt).getTime() <= Date.now()) throw new Error('Phiên đăng nhập đã hết hạn.')
    const switchingAccount = sessionRef.current && authSessionIdentity(sessionRef.current) !== authSessionIdentity(nextSession)
    writeAuthSession(nextSession)
    if (switchingAccount) {
      window.location.replace(ROLE_HOME_ROUTES[nextSession.user.role])
      return
    }
    applySession(nextSession)
  }

  async function logout() {
    const current = readAuthSession()
    // Xóa ngay ở tất cả tab; phản hồi logout cũ không được xóa một phiên mới.
    writeAuthSession(null)
    applySession(null)
    try {
      if (current) await logoutSession(current.refreshToken, current.accessToken)
    } catch {
      // Phiên local vẫn được xóa khi Backend tạm thời không phản hồi.
    }
  }

  function updateProfileName(accountId: number, name: string) {
    const current = readAuthSession()
    if (!current || current.user.id !== accountId || authSessionIdentity(current) !== authSessionIdentity(sessionRef.current)) return
    const next = { ...current, user: { ...current.user, name } }
    writeAuthSession(next)
    applySession(next)
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        accessToken: session?.accessToken ?? null,
        isAuthenticated: session !== null,
        login,
        logout,
        updateProfileName,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
