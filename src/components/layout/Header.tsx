import { useAuth } from '@/hooks/useAuth'
import AppIcon from '@/components/common/AppIcon'
import { roleLabels } from '@/features/role-dashboard/roleDashboardConfig'
import { Link, useLocation } from 'react-router'
import { ROUTES } from '@/constants/routes'

export default function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const isProductBatchPage = pathname === ROUTES.OPERATION_PRODUCT_BATCHES ||
    pathname.startsWith(`${ROUTES.OPERATION_PRODUCT_BATCHES}/`)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button type="button" onClick={onOpenMenu} className="grid size-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Mở menu"><AppIcon name="menu" className="size-5" /></button>
      {!isProductBatchPage && <label className="relative hidden w-full max-w-md sm:block"><span className="sr-only">Tìm kiếm</span><AppIcon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input className="h-10 w-full rounded-xl border-0 bg-slate-50 pl-10 pr-4 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-600" placeholder="Tìm kiếm..." /></label>}
      <div className="ml-auto flex items-center gap-3"><button type="button" className="relative grid size-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100" aria-label="Thông báo"><AppIcon name="bell" className="size-5"/><span className="absolute right-2.5 top-2 size-2 rounded-full bg-red-500 ring-2 ring-white"/></button><Link to={ROUTES.CHANGE_PASSWORD} className="hidden text-right sm:block" title="Đổi mật khẩu"><p className="text-sm font-semibold">{user?.name}</p><p className="text-xs text-slate-500">{user ? roleLabels[user.role] : ''}</p></Link><Link to={ROUTES.CHANGE_PASSWORD} className="grid size-10 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-700" title="Đổi mật khẩu">{user?.name?.charAt(0).toUpperCase()||'A'}</Link></div>
    </header>
  )
}
