import { useState, type FormEvent } from 'react'
import { changePassword, getAuthErrorMessage } from '@/services/authService'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router'
import { ROUTES } from '@/constants/routes'

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (newPassword !== confirmation) return setError('Mật khẩu xác nhận không khớp.')
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      await changePassword(currentPassword, newPassword)
      setMessage('Đổi mật khẩu thành công. Đang chuyển về trang đăng nhập...')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmation('')
      window.setTimeout(() => {
        void logout().finally(() => navigate(ROUTES.LOGIN, { replace: true }))
      }, 1200)
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, 'Không thể đổi mật khẩu.'))
    } finally { setLoading(false) }
  }

  const inputClass = 'h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100'
  return <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h1 className="text-2xl font-bold text-slate-950">Đổi mật khẩu</h1>
    <p className="mt-1 text-sm text-slate-500">Sau khi đổi, các refresh token hiện có sẽ bị thu hồi.</p>
    <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4">
      <input required type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Mật khẩu hiện tại" className={inputClass} />
      <input required minLength={8} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Mật khẩu mới" className={inputClass} />
      <input required minLength={8} type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Xác nhận mật khẩu mới" className={inputClass} />
      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {message && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      <button disabled={loading} className="h-12 w-full rounded-xl bg-emerald-700 font-bold text-white disabled:opacity-60">{loading ? 'Đang cập nhật...' : 'Đổi mật khẩu'}</button>
    </form>
  </div>
}
