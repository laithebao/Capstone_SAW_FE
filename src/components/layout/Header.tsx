import { useAuth } from '@/hooks/useAuth'
import AppIcon from '@/components/common/AppIcon'
import { roleLabels } from '@/features/role-dashboard/roleDashboardConfig'
import { Link } from 'react-router'
import { ROUTES } from '@/constants/routes'

export default function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button type="button" onClick={onOpenMenu} className="grid size-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Mở menu"><AppIcon name="menu" className="size-5" /></button>
      <div className="ml-auto flex items-center gap-3"><button type="button" className="relative grid size-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100" aria-label="Thông báo"><AppIcon name="bell" className="size-5"/><span className="absolute right-2.5 top-2 size-2 rounded-full bg-red-500 ring-2 ring-white"/></button><Link to={ROUTES.CHANGE_PASSWORD} className="hidden text-right sm:block" title="Đổi mật khẩu"><p className="text-sm font-semibold">{user?.name}</p><p className="text-xs text-slate-500">{user ? roleLabels[user.role] : ''}</p></Link><Link to={ROUTES.CHANGE_PASSWORD} className="grid size-10 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-700" title="Đổi mật khẩu">{user?.name?.charAt(0).toUpperCase()||'A'}</Link></div>
    </header>
  )
}
