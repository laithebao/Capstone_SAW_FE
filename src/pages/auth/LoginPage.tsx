import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { ROLE_BY_ID } from '@/constants/roles'
import { ROLE_HOME_ROUTES, ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import { getApiErrorMessage, googleLogin, login as requestLogin } from '@/services/authService'
import type { AuthResponse } from '@/types/auth'

export default function LoginPage() {
  const { isAuthenticated, user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const googleButton = useRef<HTMLDivElement>(null)

  const acceptSession = useCallback((response: AuthResponse) => {
    const role = ROLE_BY_ID[response.roleId]
    if (!role) throw new Error(`Role ID ${response.roleId} chưa được frontend hỗ trợ.`)
    login({ user: { id: response.accountId, name: response.fullName, email: response.email, role },
      accessToken: response.accessToken, accessTokenExpiresAt: response.accessTokenExpiresAt,
      refreshToken: response.refreshToken, refreshTokenExpiresAt: response.refreshTokenExpiresAt })
    navigate(ROLE_HOME_ROUTES[role], { replace: true })
  }, [login, navigate])

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId || !window.google || !googleButton.current) return
    window.google.accounts.id.initialize({ client_id: clientId, callback: async ({ credential }) => {
      try {
        setError(null); const result = await googleLogin(credential)
        if (result.requiresRole) {
          navigate(ROUTES.GOOGLE_COMPLETE_PROFILE, { state: { idToken: credential } })
        }
        else if (result.session) acceptSession(result.session)
      } catch (e) { setError(getApiErrorMessage(e)) }
    } })
    window.google.accounts.id.renderButton(googleButton.current, { theme: 'outline', size: 'large', text: 'signin_with' })
  }, [acceptSession, navigate])

  if (isAuthenticated && user) {
    return <Navigate to={ROLE_HOME_ROUTES[user.role]} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    try {
      const response = await requestLogin({
        usernameOrEmail: String(formData.get('usernameOrEmail') ?? ''),
        password: String(formData.get('password') ?? ''),
      })
      acceptSession(response)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-md rounded-lg border p-6 shadow-sm">
      <h1>Đăng nhập</h1>
      {location.state?.verificationEmailSent && (
        <p className="mt-3 text-sm text-green-700">
          Đăng ký thành công. Hãy mở email và xác minh tài khoản trước khi đăng nhập.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <label className="grid gap-1 text-sm">
          Tên đăng nhập hoặc email
          <input name="usernameOrEmail" required autoComplete="username" className="rounded border px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          Mật khẩu
          <input name="password" type="password" required autoComplete="current-password" className="rounded border px-3 py-2" />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={isSubmitting} className="rounded bg-green-700 px-4 py-2 text-white disabled:opacity-60">
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>

      <Link className="mt-3 inline-block text-sm underline" to={ROUTES.FORGOT_PASSWORD}>Quên mật khẩu?</Link>
      <div className="my-4 border-t" />
      {import.meta.env.VITE_GOOGLE_CLIENT_ID ? <div ref={googleButton} className="flex justify-center" /> :
        <p className="text-sm text-gray-600">Chưa cấu hình Google Client ID.</p>}

      <p className="mt-4 text-sm">Chưa có tài khoản? <Link className="underline" to={ROUTES.REGISTER}>Đăng ký</Link></p>
    </section>
  )
}
