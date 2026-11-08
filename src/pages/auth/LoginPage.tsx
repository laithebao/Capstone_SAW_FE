import LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <section
      className="w-full rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[0_24px_64px_rgba(16,52,40,0.08)] sm:p-8 lg:p-9"
      aria-labelledby="login-title"
    >
      <div className="mb-7">
        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
          Cổng vận hành SAW
        </p>
        <h1 id="login-title" className="text-[1.85rem] font-bold tracking-[-0.035em] text-slate-950 sm:text-[2rem]">
          Chào mừng trở lại
        </h1>
        <p className="mt-2.5 text-sm leading-6 text-slate-500">
          Đăng nhập để tiếp tục quản lý kho nông sản thông minh.
        </p>
      </div>

      <LoginForm />
    </section>
  )
}
