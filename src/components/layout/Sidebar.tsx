import { NavLink } from 'react-router'
import { ROLE_HOME_ROUTES, ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import AppIcon from '@/components/common/AppIcon'
import BrandMark from '@/components/common/BrandMark'
import { ROLES } from '@/constants/roles'
import { adminMenu, roleDashboardConfigs } from '@/features/role-dashboard/roleDashboardConfig'

export default function Sidebar({isOpen,onClose}:{isOpen:boolean;onClose:()=>void}) {
  const { user, logout } = useAuth()
  const items = user?.role === ROLES.ADMINISTRATOR
    ? adminMenu
    : user ? roleDashboardConfigs[user.role].menu : []
  const adminRoutes: Record<string, string> = {
    'Bảng điều khiển': ROUTES.ADMIN,
    'Người dùng': ROUTES.ADMIN_USER_ACCESS,
    'Loại nông sản': ROUTES.ADMIN_CROP_TYPES,
    'Tiêu chuẩn kiểm định': ROUTES.ADMIN_INSPECTION_STANDARDS,
    'Nhật ký hệ thống': ROUTES.ADMIN_AUDIT_LOGS,
  }

  const supplierRoutes: Record<string, string> = {
    'Lô hàng của tôi': ROUTES.SUPPLIER_BATCHES,
    'Khai báo lô': ROUTES.SUPPLIER_BATCH_NEW,
    'Hồ sơ doanh nghiệp': ROUTES.SUPPLIER_PROFILE,
  }

  const operationRoutes: Record<string, string> = {
    'Quản lý lô hàng': ROUTES.OPERATION_PRODUCT_BATCHES,
  }

  const getRoute = (label: string, index: number): string | undefined => {
    if (index === 0) return ROLE_HOME_ROUTES[user!.role]
    if (user?.role === ROLES.ADMINISTRATOR) return adminRoutes[label]
    if (user?.role === ROLES.SUPPLIER) return supplierRoutes[label]
    if (user?.role === ROLES.OPERATION_STAFF) return operationRoutes[label]
    return undefined
  }

  return (
    <>
      {isOpen && <button className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden" onClick={onClose} aria-label="Đóng menu" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#17231f] text-white transition-transform lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
          <BrandMark compact inverted />
          <div className="min-w-0">
            <p className="truncate text-base font-bold leading-5">SAW System</p>
            <p className="mt-0.5 truncate text-[11px] text-slate-400">Quản lý kho thông minh</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Điều hướng chính">
          {user && items.map((item, i) => {
            const route = getRoute(item.label, i)
            return route
              ? <NavLink key={item.label} to={route} onClick={onClose} end={i === 0} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${isActive ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}><AppIcon name={item.icon} className="size-[18px]" />{item.label}</NavLink>
              : <button key={item.label} type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-400 hover:bg-white/10 hover:text-white"><AppIcon name={item.icon} className="size-[18px]" />{item.label}</button>
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <button type="button" onClick={() => void logout()} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-400 hover:bg-white/10 hover:text-white"><AppIcon name="logout" className="size-[18px]" />Đăng xuất</button>
        </div>
      </aside>
    </>
  )
}
