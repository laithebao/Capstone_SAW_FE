import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { getAuthErrorMessage, requestPasswordReset } from '@/services/authService'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await requestPasswordReset(email.trim())
      setMessage('Nếu email tồn tại, hệ thống đã gửi liên kết đặt lại mật khẩu.')
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, 'Không thể gửi yêu cầu đặt lại mật khẩu.'))
    } finally {
      setLoading(false)
    }
  }

  return <AuthAction title="Quên mật khẩu" description="Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.">
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@example.com" className={inputClass} />
      <Status message={message} error={error} />
      <button disabled={loading} className={buttonClass}>{loading ? 'Đang gửi...' : 'Gửi liên kết'}</button>
      <Link to={ROUTES.LOGIN} className="block text-center text-sm font-semibold text-emerald-700">Quay lại đăng nhập</Link>
    </form>
  </AuthAction>
}

export function AuthAction({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="w-full"><div className="mb-6"><h1 className="text-3xl font-bold text-slate-950">{title}</h1><p className="mt-2 text-sm text-slate-500">{description}</p></div>{children}</section>
}

export function Status({ message, error }: { message: string | null; error: string | null }) {
  return <>{error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}{message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}</>
}

export const inputClass = 'h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100'
export const buttonClass = 'h-12 w-full rounded-xl bg-emerald-700 text-sm font-bold text-white disabled:opacity-60'
