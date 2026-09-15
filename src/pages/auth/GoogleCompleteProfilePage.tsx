import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { ROLE_BY_ID, SELF_REGISTER_ROLES } from '@/constants/roles'
import { ROLE_HOME_ROUTES, ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import { getApiErrorMessage, googleLogin } from '@/services/authService'

interface GoogleNavigationState {
  idToken?: string
}

export default function GoogleCompleteProfilePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { login } = useAuth()
  const idToken = (location.state as GoogleNavigationState | null)?.idToken
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!idToken) return <Navigate to={ROUTES.LOGIN} replace />

  async function completeRegistration() {
    if (!idToken) {
      navigate(ROUTES.LOGIN, { replace: true })
      return
    }

    if (!selectedRoleId) {
      setError('Hãy chọn loại tài khoản.')
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      const result = await googleLogin(idToken, selectedRoleId)
      if (!result.session) throw new Error('Không nhận được phiên đăng nhập từ máy chủ.')
      const session = result.session
      const role = ROLE_BY_ID[session.roleId]
      if (!role) throw new Error(`Role ID ${session.roleId} chưa được frontend hỗ trợ.`)

      login({
        user: { id: session.accountId, name: session.fullName, email: session.email, role },
        accessToken: session.accessToken,
        accessTokenExpiresAt: session.accessTokenExpiresAt,
        refreshToken: session.refreshToken,
        refreshTokenExpiresAt: session.refreshTokenExpiresAt,
      })
      navigate(ROLE_HOME_ROUTES[role], { replace: true })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-md rounded-lg border p-6 shadow-sm">
      <h1>Hoàn tất đăng ký Google</h1>
      <p className="mt-2 text-sm text-gray-600">
        Đây là lần đầu bạn đăng nhập. Hãy chọn loại tài khoản phù hợp.
      </p>

      <div className="mt-6 grid gap-3">
        {SELF_REGISTER_ROLES.map((role) => (
          <button
            key={role.id}
            type="button"
            aria-pressed={selectedRoleId === role.id}
            onClick={() => setSelectedRoleId(role.id)}
            className={`rounded border px-4 py-3 text-left ${
              selectedRoleId === role.id ? 'border-green-700 bg-green-50' : 'border-gray-300'
            }`}
          >
            <span className="block font-medium">{role.label}</span>
            <span className="text-sm text-gray-600">
              Hồ sơ chi tiết sẽ được bổ sung trong phần cập nhật hồ sơ.
            </span>
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      <button
        type="button"
        disabled={!selectedRoleId || isSubmitting}
        onClick={completeRegistration}
        className="mt-5 w-full rounded bg-green-700 px-4 py-2 text-white disabled:opacity-60"
      >
        {isSubmitting ? 'Đang tạo tài khoản...' : 'Tiếp tục'}
      </button>
      <Link className="mt-4 inline-block text-sm underline" to={ROUTES.LOGIN}>Quay lại đăng nhập</Link>
    </section>
  )
}
