import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { ROLE_HOME_ROUTES, ROUTES } from '@/constants/routes'
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas/loginSchema'
import { useAuth } from '@/hooks/useAuth'
import { getAuthErrorMessage, login as loginRequest } from '@/services/authService'
import GoogleLoginButton from '@/components/auth/GoogleLoginButton'

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { login } = useAuth()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '', rememberMe: false },
  })

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      const session = await loginRequest({
        identifier: values.identifier,
        password: values.password,
      })
      login(session)
      navigate(ROLE_HOME_ROUTES[session.user.role], { replace: true })
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <GoogleLoginButton />

      <div className="flex items-center gap-4" aria-hidden="true">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">hoặc</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="space-y-2">
        <label htmlFor="identifier" className="text-sm font-semibold text-slate-700">Email hoặc tên đăng nhập</label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center text-slate-400" aria-hidden="true">@</span>
          <input id="identifier" type="text" autoComplete="username" placeholder="admin@saw.local" aria-invalid={Boolean(errors.identifier)} className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" {...register('identifier')} />
        </div>
        {errors.identifier && <p role="alert" className="text-xs font-medium text-rose-600">{errors.identifier.message}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="password" className="text-sm font-semibold text-slate-700">Mật khẩu</label>
          <Link to={ROUTES.FORGOT_PASSWORD} className="text-xs font-semibold text-emerald-700 hover:text-emerald-800">Quên mật khẩu?</Link>
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center text-slate-400" aria-hidden="true">●</span>
          <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Nhập mật khẩu" aria-invalid={Boolean(errors.password)} className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" {...register('password')} />
          <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-400 transition hover:text-emerald-700" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
            <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current" strokeWidth="1.8" aria-hidden="true">
              <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
              <circle cx="12" cy="12" r="2.5" />
            </svg>
          </button>
        </div>
        {errors.password && <p role="alert" className="text-xs font-medium text-rose-600">{errors.password.message}</p>}
      </div>

      <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm text-slate-600">
        <input type="checkbox" className="size-4 rounded border-slate-300 accent-emerald-700" {...register('rememberMe')} />
        Ghi nhớ đăng nhập
      </label>

      {submitError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{submitError}</p>}

      <button type="submit" disabled={isSubmitting} className="h-12 w-full rounded-xl bg-emerald-700 text-sm font-bold text-white shadow-lg shadow-emerald-800/20 transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200 active:translate-y-px disabled:cursor-wait disabled:opacity-60">
        {isSubmitting ? 'Đang xác thực...' : 'Đăng nhập'}
      </button>

      <p className="text-center text-sm text-slate-500">
        Chưa có tài khoản?{' '}
        <Link to={ROUTES.REGISTER} className="font-semibold text-emerald-700 hover:text-emerald-800">Đăng ký ngay</Link>
      </p>
    </form>
  )
}
