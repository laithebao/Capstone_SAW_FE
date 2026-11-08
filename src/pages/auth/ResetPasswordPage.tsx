import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { getAuthErrorMessage, resetPassword } from '@/services/authService'
import { AuthAction, Status, buttonClass, inputClass } from '@/pages/auth/ForgotPasswordPage'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(token ? null : 'Liên kết đặt lại mật khẩu không hợp lệ.')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (password !== confirmation) return setError('Mật khẩu xác nhận không khớp.')
    setLoading(true)
    setError(null)
    try {
      await resetPassword(token, password)
      setMessage('Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.')
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, 'Không thể đặt lại mật khẩu.'))
    } finally { setLoading(false) }
  }

  return <AuthAction title="Đặt lại mật khẩu" description="Mật khẩu cần có chữ hoa, chữ thường, số và ký tự đặc biệt.">
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mật khẩu mới" className={inputClass} />
      <input required minLength={8} type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Xác nhận mật khẩu" className={inputClass} />
      <Status message={message} error={error} />
      <button disabled={loading || !token} className={buttonClass}>{loading ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}</button>
      <Link to={ROUTES.LOGIN} className="block text-center text-sm font-semibold text-emerald-700">Về trang đăng nhập</Link>
    </form>
  </AuthAction>
}
