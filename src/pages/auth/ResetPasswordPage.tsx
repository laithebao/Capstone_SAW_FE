import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { getApiErrorMessage, resetPassword } from '@/services/authService'

export default function ResetPasswordPage() {
  const [params] = useSearchParams(); const token = params.get('token')
  const [done, setDone] = useState(false); const [error, setError] = useState<string | null>(null)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null)
    const data = new FormData(event.currentTarget)
    const password = String(data.get('password') ?? '')
    if (password !== String(data.get('confirmPassword') ?? '')) { setError('Mật khẩu xác nhận không khớp.'); return }
    if (!token) { setError('Link đặt lại mật khẩu không chứa token.'); return }
    try { await resetPassword(token, password); setDone(true) } catch (e) { setError(getApiErrorMessage(e)) }
  }
  return <section className="mx-auto max-w-md rounded-lg border p-6 shadow-sm">
    <h1>Đặt lại mật khẩu</h1>
    {done ? <><p className="mt-4 text-green-700">Đổi mật khẩu thành công.</p><Link className="underline" to={ROUTES.LOGIN}>Đăng nhập</Link></> :
      <form onSubmit={submit} className="mt-6 grid gap-4">
        <input name="password" type="password" minLength={8} required placeholder="Mật khẩu mới" className="rounded border px-3 py-2" />
        <input name="confirmPassword" type="password" minLength={8} required placeholder="Nhập lại mật khẩu" className="rounded border px-3 py-2" />
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button className="rounded bg-green-700 px-4 py-2 text-white">Đổi mật khẩu</button>
      </form>}
  </section>
}
