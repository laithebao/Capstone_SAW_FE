import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import AuthField from '@/components/auth/AuthField'
import { ROUTES } from '@/constants/routes'
import { registerSchema, type RegisterFormValues } from '@/features/auth/schemas/registerSchema'

const inputClassName =
  'h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 aria-[invalid=true]:border-rose-400 aria-[invalid=true]:focus:ring-rose-100'

export default function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
    mode: 'onBlur',
  })

  const onSubmit = handleSubmit(async () => {
    // Chỉ dựng khung FE. Gọi authService.register ở giai đoạn tích hợp Backend.
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <AuthField htmlFor="fullName" label="Họ và tên" error={errors.fullName?.message}>
        <input id="fullName" type="text" autoComplete="name" placeholder="Nguyễn Văn A" aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? 'fullName-error' : undefined} className={inputClassName} {...register('fullName')} />
      </AuthField>

      <AuthField htmlFor="registerEmail" label="Email" error={errors.email?.message}>
        <input id="registerEmail" type="email" autoComplete="email" placeholder="email@example.com" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'registerEmail-error' : undefined} className={inputClassName} {...register('email')} />
      </AuthField>

      <AuthField htmlFor="phoneNumber" label="Số điện thoại" error={errors.phoneNumber?.message}>
        <input id="phoneNumber" type="tel" inputMode="tel" autoComplete="tel" placeholder="0912 345 789" aria-invalid={Boolean(errors.phoneNumber)} aria-describedby={errors.phoneNumber ? 'phoneNumber-error' : undefined} className={inputClassName} {...register('phoneNumber')} />
      </AuthField>

      <div className="grid gap-4 sm:grid-cols-2">
        <AuthField htmlFor="registerPassword" label="Mật khẩu" error={errors.password?.message}>
          <div className="relative">
            <input id="registerPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'registerPassword-error' : undefined} className={`${inputClassName} pr-12`} {...register('password')} />
            <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
          </div>
        </AuthField>

        <AuthField htmlFor="confirmPassword" label="Xác nhận mật khẩu" error={errors.confirmPassword?.message}>
          <div className="relative">
            <input id="confirmPassword" type={showConfirmation ? 'text' : 'password'} autoComplete="new-password" placeholder="Nhập lại mật khẩu" aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined} className={`${inputClassName} pr-12`} {...register('confirmPassword')} />
            <PasswordToggle visible={showConfirmation} onToggle={() => setShowConfirmation((value) => !value)} />
          </div>
        </AuthField>
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-5 text-slate-600">
          <input type="checkbox" className="mt-0.5 size-4 shrink-0 rounded border-slate-300 accent-emerald-700" aria-invalid={Boolean(errors.acceptTerms)} aria-describedby={errors.acceptTerms ? 'acceptTerms-error' : undefined} {...register('acceptTerms')} />
          <span>
            Tôi đồng ý với <a href="#" className="font-semibold text-emerald-700 hover:text-emerald-800">Điều khoản</a> và <a href="#" className="font-semibold text-emerald-700 hover:text-emerald-800">Chính sách bảo mật</a> của SAW.
          </span>
        </label>
        {errors.acceptTerms && <p id="acceptTerms-error" role="alert" className="mt-2 text-xs font-medium text-rose-600">{errors.acceptTerms.message}</p>}
      </div>

      <button type="submit" disabled={isSubmitting} className="h-12 w-full rounded-xl bg-emerald-700 text-sm font-bold text-white shadow-lg shadow-emerald-800/20 transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-60">
        Tạo tài khoản
      </button>

      <p className="text-center text-sm text-slate-500">
        Đã có tài khoản?{' '}
        <Link to={ROUTES.LOGIN} className="font-semibold text-emerald-700 hover:text-emerald-800">Đăng nhập ngay</Link>
      </p>
    </form>
  )
}

type PasswordToggleProps = {
  onToggle: () => void
  visible: boolean
}

function PasswordToggle({ onToggle, visible }: PasswordToggleProps) {
  return (
    <button type="button" onClick={onToggle} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-400 transition hover:text-emerald-700" aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
      <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current" strokeWidth="1.8" aria-hidden="true">
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    </button>
  )
}
