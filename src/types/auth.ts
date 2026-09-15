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
  accessTokenExpiresAt: string
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

export interface LoginRequest {
  usernameOrEmail: string
  password: string
}

export interface AuthResponse {
  accountId: number
  username: string
  email: string
  fullName: string
  roleId: number
  accessToken: string
  accessTokenExpiresAt: string
  refreshToken: string
  refreshTokenExpiresAt: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  fullName: string
  phoneNumber: string | null
  roleId: number
  organizationName: string
  taxCode: string
  address: string | null
}

export interface RegistrationResponse {
  accountId: number
  username: string
  email: string
  roleId: number
}

export interface GoogleLoginResponse {
  requiresRole: boolean
  session: AuthResponse | null
}
