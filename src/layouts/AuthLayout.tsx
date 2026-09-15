import { Outlet } from 'react-router'
import AuthBrandPanel from '@/components/auth/AuthBrandPanel'
import AuthFooter from '@/components/auth/AuthFooter'
import BrandMark from '@/components/common/BrandMark'

export default function AuthLayout() {
  return (
    <main className="min-h-screen bg-[#f7faf8] lg:flex">
      <AuthBrandPanel />

      <div className="flex min-h-screen flex-1 flex-col bg-white">
        <header className="flex items-center justify-between px-6 py-5 sm:px-10 lg:justify-end">
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 sm:inline-flex">
            Hệ thống nội bộ
          </span>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-8 sm:px-10 lg:px-14">
          <div className="w-full max-w-[430px]">
            <Outlet />
            <AuthFooter />
          </div>
        </div>
      </div>
    </main>
  )
}
