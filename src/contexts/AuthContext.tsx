import { createContext, useEffect, useState, type ReactNode } from 'react'
import { setApiAccessToken } from '@/services/apiClient'
import type { AuthContextValue, AuthSession } from '@/types/auth'

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const sessionKey = 'saw.auth-session'

function loadSession(): AuthSession | null {
  try {
    const rawSession = sessionStorage.getItem(sessionKey)
    if (!rawSession) return null

    const storedSession = JSON.parse(rawSession) as AuthSession
    if (!storedSession.accessToken || new Date(storedSession.expiresAt).getTime() <= Date.now()) {
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

    const remainingTime = new Date(session.expiresAt).getTime() - Date.now()
    const timeoutId = window.setTimeout(() => {
      setApiAccessToken(null)
      sessionStorage.removeItem(sessionKey)
      setSession(null)
    }, Math.max(remainingTime, 0))

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

  function logout() {
    setApiAccessToken(null)
    sessionStorage.removeItem(sessionKey)
    setSession(null)
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
