import type { AuthSession } from '@/types/auth'

export const AUTH_SESSION_KEY = 'saw.auth-session'
const refreshLockKey = 'saw.auth-refresh-lock'

export function readAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as AuthSession
    if (!session || typeof session.accessToken !== 'string' || !session.accessToken.trim()
      || typeof session.refreshToken !== 'string' || !session.refreshToken.trim()
      || !session.user || typeof session.user.id !== 'number' || typeof session.user.role !== 'string'
      || !Number.isFinite(Date.parse(session.expiresAt))
      || !Number.isFinite(Date.parse(session.refreshTokenExpiresAt))
      || Date.parse(session.refreshTokenExpiresAt) <= Date.now()) return null
    return session
  } catch {
    return null
  }
}

export function writeAuthSession(session: AuthSession | null) {
  if (session) localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
  else localStorage.removeItem(AUTH_SESSION_KEY)
  // Không khôi phục phiên riêng của tab sau khi đã đổi sang phiên dùng chung.
  sessionStorage.removeItem(AUTH_SESSION_KEY)
}

export function authSessionIdentity(session: AuthSession | null): string | null {
  return session ? `${session.user.id}:${session.user.role}` : null
}

export function sameAuthSession(first: AuthSession | null, second: AuthSession | null): boolean {
  if (!first || !second) return first === second
  return authSessionIdentity(first) === authSessionIdentity(second)
    && first.accessToken === second.accessToken && first.refreshToken === second.refreshToken
}

async function withRefreshLock<T>(action: () => Promise<T>): Promise<T> {
  if (navigator.locks) return navigator.locks.request(refreshLockKey, action)

  // Dự phòng cho HTTP trong mạng LAN, nơi Web Locks có thể không khả dụng.
  const owner = crypto.randomUUID()
  const pause = () => new Promise<void>(resolve => setTimeout(resolve, 100))
  for (;;) {
    let lease: { owner: string; expiresAt: number } | null = null
    try { lease = JSON.parse(localStorage.getItem(refreshLockKey) ?? 'null') } catch { /* Lease hỏng được thay mới. */ }
    if (lease && lease.expiresAt > Date.now()) { await pause(); continue }
    const claimed = JSON.stringify({ owner, expiresAt: Date.now() + 45_000 })
    localStorage.setItem(refreshLockKey, claimed)
    await pause()
    if (localStorage.getItem(refreshLockKey) !== claimed) continue
    try { return await action() }
    finally {
      if (localStorage.getItem(refreshLockKey) === claimed) localStorage.removeItem(refreshLockKey)
    }
  }
}

export async function refreshSharedAuthSession(
  expected: AuthSession,
  refresh: (refreshToken: string) => Promise<AuthSession>,
): Promise<AuthSession | null> {
  return withRefreshLock(async () => {
    if (!sameAuthSession(expected, readAuthSession())) return readAuthSession()
    try {
      const next = await refresh(expected.refreshToken)
      // Một tab có thể đã đăng xuất/đăng nhập tài khoản khác trong lúc chờ API.
      if (sameAuthSession(expected, readAuthSession())) writeAuthSession(next)
    } catch {
      if (sameAuthSession(expected, readAuthSession())) writeAuthSession(null)
    }
    return readAuthSession()
  })
}
