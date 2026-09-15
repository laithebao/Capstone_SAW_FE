import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { forgotPassword, getApiErrorMessage } from '@/services/authService'

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null)
    try {
      await forgotPassword(String(new FormData(event.currentTarget).get('email') ?? ''))
      setMessage('Nếu email tồn tại, hệ thống đã gửi link đặt lại mật khẩu.')
    } catch (e) { setError(getApiErrorMessage(e)) }
  }
  return <section className="mx-auto max-w-md rounded-lg border p-6 shadow-sm">
    <h1>Quên mật khẩu</h1>
    <form onSubmit={submit} className="mt-6 grid gap-4">
      <input name="email" type="email" required placeholder="Email" className="rounded border px-3 py-2" />
      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button className="rounded bg-green-700 px-4 py-2 text-white">Gửi link đặt lại mật khẩu</button>
    </form>
    <Link className="mt-4 inline-block underline" to={ROUTES.LOGIN}>Quay lại đăng nhập</Link>
  </section>
}
