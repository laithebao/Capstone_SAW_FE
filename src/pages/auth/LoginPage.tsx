import LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <section className="w-full" aria-labelledby="login-title">
      <div className="mb-8">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
          Cổng vận hành SAW
        </p>
        <h1 id="login-title" className="text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.15rem]">
          Chào mừng trở lại
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Đăng nhập để tiếp tục quản lý kho nông sản thông minh.
        </p>
      </div>

      <LoginForm />
    </section>
  )
}
