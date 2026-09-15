import { useAuth } from '@/hooks/useAuth'
import AppIcon from '@/components/common/AppIcon'
import { roleLabels } from '@/features/role-dashboard/roleDashboardConfig'

export default function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button type="button" onClick={onOpenMenu} className="grid size-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Mở menu"><AppIcon name="menu" className="size-5" /></button>
      <label className="relative hidden w-full max-w-md sm:block"><span className="sr-only">Tìm kiếm</span><AppIcon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input className="h-10 w-full rounded-xl border-0 bg-slate-50 pl-10 pr-4 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-600" placeholder="Tìm kiếm..." /></label>
      <div className="ml-auto flex items-center gap-3"><button type="button" className="relative grid size-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100" aria-label="Thông báo"><AppIcon name="bell" className="size-5"/><span className="absolute right-2.5 top-2 size-2 rounded-full bg-red-500 ring-2 ring-white"/></button><div className="hidden text-right sm:block"><p className="text-sm font-semibold">{user?.name}</p><p className="text-xs text-slate-500">{user ? roleLabels[user.role] : ''}</p></div><div className="grid size-10 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-700">{user?.name?.charAt(0).toUpperCase()||'A'}</div></div>
    </header>
  )
}
