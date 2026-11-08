import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { getAuthErrorMessage, verifyEmail } from '@/services/authService'
import { AuthAction, Status } from '@/pages/auth/ForgotPasswordPage'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(() => token ? null : 'Liên kết xác thực email không hợp lệ.')

  useEffect(() => {
    if (!token) return
    void verifyEmail(token)
      .then(() => setMessage('Email đã được xác thực. Tài khoản của bạn đã sẵn sàng.'))
      .catch((requestError: unknown) => setError(getAuthErrorMessage(requestError, 'Không thể xác thực email.')))
  }, [token])

  return <AuthAction title="Xác thực email" description="Hệ thống đang kiểm tra liên kết kích hoạt tài khoản.">
    <div className="space-y-4"><Status message={message ?? (!error ? 'Đang xác thực...' : null)} error={error} /><Link to={ROUTES.LOGIN} className="block text-center text-sm font-semibold text-emerald-700">Đến trang đăng nhập</Link></div>
  </AuthAction>
}
