import { createContext, useEffect, useState, type ReactNode } from 'react'
import { setApiAccessToken } from '@/services/apiClient'
import { logoutSession, refreshSession } from '@/services/authService'
import type { AuthContextValue, AuthSession } from '@/types/auth'

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const sessionKey = 'saw.auth-session'

function loadSession(): AuthSession | null {
  try {
    const rawSession = sessionStorage.getItem(sessionKey)
    if (!rawSession) return null

    const storedSession = JSON.parse(rawSession) as AuthSession
    if (!storedSession.accessToken || !storedSession.refreshToken ||
        new Date(storedSession.refreshTokenExpiresAt).getTime() <= Date.now()) {
      sessionStorage.removeItem(sessionKey)
      return null
    }

    setApiAccessToken(storedSession.accessToken)
    return storedSession
  } catch {
    sessionStorage.removeItem(sessionKey)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(loadSession)

  useEffect(() => {
    if (!session) return

    const refreshIn = Math.max(new Date(session.expiresAt).getTime() - Date.now() - 60_000, 0)
    const timeoutId = window.setTimeout(async () => {
      try {
        const nextSession = await refreshSession(session.refreshToken)
        setApiAccessToken(nextSession.accessToken)
        sessionStorage.setItem(sessionKey, JSON.stringify(nextSession))
        setSession(nextSession)
      } catch {
        setApiAccessToken(null)
        sessionStorage.removeItem(sessionKey)
        setSession(null)
      }
    }, refreshIn)

    return () => window.clearTimeout(timeoutId)
  }, [session])

  // Chỉ nhận phiên do API xác thực trả về; không tự tạo tài khoản ở phía FE.
  function login(nextSession: AuthSession) {
    if (!nextSession.accessToken.trim()) {
      throw new Error('Phiên đăng nhập cần có access token.')
    }
    if (new Date(nextSession.expiresAt).getTime() <= Date.now()) {
      throw new Error('Phiên đăng nhập đã hết hạn.')
    }

    setApiAccessToken(nextSession.accessToken)
    sessionStorage.setItem(sessionKey, JSON.stringify(nextSession))
    setSession(nextSession)
  }

  function clearSession() {
    setApiAccessToken(null)
    sessionStorage.removeItem(sessionKey)
    setSession(null)
  }

  async function logout() {
    const refreshToken = session?.refreshToken
    try {
      if (refreshToken) await logoutSession(refreshToken)
    } catch {
      // Phiên local vẫn được xóa khi Backend tạm thời không phản hồi.
    } finally {
      clearSession()
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        accessToken: session?.accessToken ?? null,
        isAuthenticated: session !== null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
