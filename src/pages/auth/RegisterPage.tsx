import RegisterForm from '@/components/auth/RegisterForm'

export default function RegisterPage() {
  return (
    <section className="w-full" aria-labelledby="register-title">
      <div className="mb-7">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
          Gia nhập hệ thống SAW
        </p>
        <h1 id="register-title" className="text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.15rem]">
          Tạo tài khoản mới
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Điền thông tin bên dưới để đăng ký tài khoản sử dụng hệ thống.
        </p>
      </div>

      <RegisterForm />
    </section>
  )
}
