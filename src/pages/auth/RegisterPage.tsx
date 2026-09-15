import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { SELF_REGISTER_ROLES } from '@/constants/roles'
import { ROUTES } from '@/constants/routes'
import { getApiErrorMessage, register } from '@/services/authService'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    try {
      await register({
        username: String(formData.get('username') ?? ''),
        email: String(formData.get('email') ?? ''),
        password: String(formData.get('password') ?? ''),
        fullName: String(formData.get('fullName') ?? ''),
        phoneNumber: String(formData.get('phoneNumber') ?? '') || null,
        roleId: Number(formData.get('roleId')),
        organizationName: String(formData.get('organizationName') ?? ''),
        taxCode: String(formData.get('taxCode') ?? ''),
        address: String(formData.get('address') ?? '') || null,
      })
      navigate(ROUTES.LOGIN, { replace: true, state: { verificationEmailSent: true } })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-xl rounded-lg border p-6 shadow-sm">
      <h1>Đăng ký tài khoản</h1>
      <p className="mt-2 text-sm text-gray-600">Dành cho nhà cung cấp và nhà phân phối.</p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Tên đăng nhập" name="username" required />
        <Field label="Email" name="email" type="email" required />
        <Field label="Mật khẩu" name="password" type="password" minLength={8} required />
        <Field label="Họ và tên" name="fullName" required />
        <Field label="Số điện thoại" name="phoneNumber" type="tel" />
        <label className="grid gap-1 text-sm">
          Loại tài khoản
          <select name="roleId" required className="rounded border px-3 py-2">
            {SELF_REGISTER_ROLES.map((role) => (
              <option key={role.id} value={role.id}>{role.label}</option>
            ))}
          </select>
        </label>
        <Field label="Tên tổ chức" name="organizationName" required />
        <Field label="Mã số thuế" name="taxCode" required />
        <label className="grid gap-1 text-sm sm:col-span-2">
          Địa chỉ
          <textarea name="address" rows={3} className="rounded border px-3 py-2" />
        </label>

        {error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{error}</p>}
        <button disabled={isSubmitting} className="rounded bg-green-700 px-4 py-2 text-white disabled:opacity-60 sm:col-span-2">
          {isSubmitting ? 'Đang đăng ký...' : 'Đăng ký'}
        </button>
      </form>

      <p className="mt-4 text-sm">Đã có tài khoản? <Link className="underline" to={ROUTES.LOGIN}>Đăng nhập</Link></p>
    </section>
  )
}

interface FieldProps {
  label: string
  name: string
  type?: string
  minLength?: number
  required?: boolean
}

function Field({ label, name, type = 'text', minLength, required }: FieldProps) {
  return (
    <label className="grid gap-1 text-sm">
      {label}
      <input name={name} type={type} minLength={minLength} required={required} className="rounded border px-3 py-2" />
    </label>
  )
}
