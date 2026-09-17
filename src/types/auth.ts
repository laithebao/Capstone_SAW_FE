import type { Role } from '@/constants/roles'

export type { Role } from '@/constants/roles'

export interface User {
  id: number
  name: string
  email: string
  role: Role
}

export interface AuthSession {
  user: User
  accessToken: string
  expiresAt: string
  refreshToken: string
  refreshTokenExpiresAt: string
}

export interface AuthContextValue {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  login: (session: AuthSession) => void
  logout: () => Promise<void>
}
