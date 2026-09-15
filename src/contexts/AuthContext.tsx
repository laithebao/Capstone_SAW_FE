import { createContext, useState, type ReactNode } from 'react'
import { setApiAccessToken } from '@/services/apiClient'
import { logout as requestLogout } from '@/services/authService'
import type { AuthContextValue, AuthSession } from '@/types/auth'

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)

  function login(nextSession: AuthSession) {
    if (!nextSession.accessToken.trim()) {
      throw new Error('Phiên đăng nhập cần có access token.')
    }

    setApiAccessToken(nextSession.accessToken)
    setSession(nextSession)
  }

  async function logout() {
    try {
      if (session?.refreshToken) {
        await requestLogout(session.refreshToken)
      }
    } finally {
      setApiAccessToken(null)
      setSession(null)
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
