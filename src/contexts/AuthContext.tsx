import { createContext, useState, type ReactNode } from 'react'
import { setApiAccessToken } from '@/services/apiClient'
import type { AuthContextValue, AuthSession } from '@/types/auth'

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)

  // Nhận phiên từ API xác thực thật trong tương lai; không tự tạo tài khoản.
  function login(nextSession: AuthSession) {
    if (!nextSession.accessToken.trim()) {
      throw new Error('Phiên đăng nhập cần có access token.')
    }

    setApiAccessToken(nextSession.accessToken)
    setSession(nextSession)
  }

  function logout() {
    setApiAccessToken(null)
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
