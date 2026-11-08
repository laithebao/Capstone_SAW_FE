import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { AtSign, Eye, EyeOff, LockKeyhole } from 'lucide-react'
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
    <form onSubmit={onSubmit} noValidate className="space-y-[18px]">
      <GoogleLoginButton />

      <div className="flex items-center gap-3.5 py-0.5" aria-hidden="true">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">hoặc</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="space-y-2">
        <label htmlFor="identifier" className="block text-[13px] font-semibold text-slate-700">Email hoặc tên đăng nhập</label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center text-slate-400" aria-hidden="true"><AtSign className="size-[17px]" strokeWidth={1.8} /></span>
          <input id="identifier" type="text" autoComplete="username" placeholder="Email hoặc tên đăng nhập" aria-invalid={Boolean(errors.identifier)} className="h-[50px] w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-11 pr-4 text-sm text-slate-900 outline-none transition-[background-color,border-color,box-shadow] duration-200 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100/80" {...register('identifier')} />
        </div>
        {errors.identifier && <p role="alert" className="text-xs font-medium text-rose-600">{errors.identifier.message}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="password" className="text-[13px] font-semibold text-slate-700">Mật khẩu</label>
          <Link to={ROUTES.FORGOT_PASSWORD} className="rounded-sm text-xs font-semibold text-emerald-700 transition-colors hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">Quên mật khẩu?</Link>
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center text-slate-400" aria-hidden="true"><LockKeyhole className="size-[16px]" strokeWidth={1.8} /></span>
          <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Nhập mật khẩu" aria-invalid={Boolean(errors.password)} className="h-[50px] w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-11 pr-12 text-sm text-slate-900 outline-none transition-[background-color,border-color,box-shadow] duration-200 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100/80" {...register('password')} />
          <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl text-slate-400 transition-colors hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
            {showPassword ? <EyeOff className="size-[18px]" strokeWidth={1.8} /> : <Eye className="size-[18px]" strokeWidth={1.8} />}
          </button>
        </div>
        {errors.password && <p role="alert" className="text-xs font-medium text-rose-600">{errors.password.message}</p>}
      </div>

      <label className="flex w-fit cursor-pointer items-center gap-2.5 py-0.5 text-[13px] text-slate-600">
        <input type="checkbox" className="size-4 rounded border-slate-300 accent-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2" {...register('rememberMe')} />
        Ghi nhớ đăng nhập
      </label>

      {submitError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{submitError}</p>}

      <button type="submit" disabled={isSubmitting} className="h-[50px] w-full rounded-xl bg-emerald-700 text-sm font-bold text-white shadow-[0_8px_18px_rgba(4,120,87,0.18)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-emerald-800 hover:shadow-[0_10px_22px_rgba(4,120,87,0.22)] focus:outline-none focus:ring-4 focus:ring-emerald-200 active:translate-y-px disabled:cursor-wait disabled:opacity-60">
        {isSubmitting ? 'Đang xác thực...' : 'Đăng nhập'}
      </button>

      <p className="text-center text-sm text-slate-500">
        Chưa có tài khoản?{' '}
        <Link to={ROUTES.REGISTER} className="font-semibold text-emerald-700 hover:text-emerald-800">Đăng ký ngay</Link>
      </p>
    </form>
  )
}
