import { NavLink, useLocation } from 'react-router'
import { ROLE_HOME_ROUTES, ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import AppIcon from '@/components/common/AppIcon'
import BrandMark from '@/components/common/BrandMark'
import { ROLES } from '@/constants/roles'
import { adminMenu, roleDashboardConfigs } from '@/features/role-dashboard/roleDashboardConfig'

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()

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
    'Nhập kho': ROUTES.OPERATION_GOODS_RECEIPTS,
    'Quản lý lô hàng': ROUTES.OPERATION_PRODUCT_BATCHES,
  }

  const qcRoutes: Record<string, string> = {
    'Phiếu kiểm định': ROUTES.QC_INSPECTIONS,
    'Tạo phiếu mới':  ROUTES.QC_INSPECTION_NEW,
  }

  const getRoute = (item: { label: string; route?: string }, index: number): string | undefined => {
    // 1. Use explicit route from config if available
    if (item.route) return item.route
    // 2. Index 0 is always the role's home
    if (index === 0) return ROLE_HOME_ROUTES[user!.role]
    // 3. Fallback lookup maps for roles without route in config
    if (user?.role === ROLES.ADMINISTRATOR)    return adminRoutes[item.label]
    if (user?.role === ROLES.SUPPLIER)         return supplierRoutes[item.label]
    if (user?.role === ROLES.OPERATION_STAFF)  return operationRoutes[item.label]
    if (user?.role === ROLES.QC_STAFF)         return qcRoutes[item.label]
    return undefined
  }

  /**
   * Tính isActive thủ công để kiểm soát chính xác:
   * - "Phiếu kiểm định" (/qc/inspections): active khi path bắt đầu bằng
   *   /qc/inspections NHƯNG không phải /qc/inspections/new
   * - "Tạo phiếu mới" (/qc/inspections/new): active chỉ khi path chính xác
   * - Trang home (index 0): exact match
   * - Các route khác: prefix match (active khi path bắt đầu bằng route)
   */
  const computeIsActive = (route: string, index: number): boolean => {
    if (route === ROUTES.QC_INSPECTION_NEW) {
      // "Tạo phiếu mới" — chỉ active khi đúng trang new
      return pathname === ROUTES.QC_INSPECTION_NEW
    }
    if (route === ROUTES.QC_INSPECTIONS) {
      // "Phiếu kiểm định" — active khi trong /qc/inspections/* nhưng không phải /new
      return pathname.startsWith(ROUTES.QC_INSPECTIONS) && pathname !== ROUTES.QC_INSPECTION_NEW
    }
    if (index === 0) {
      // Trang home — exact match
      return pathname === route
    }
    // Mặc định: prefix match
    return pathname.startsWith(route)
  }

  return (
    <>
      {isOpen && (
        <button
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
          aria-label="Đóng menu"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/[0.07] bg-[#14231e] text-white shadow-[10px_0_34px_rgba(8,24,18,0.14)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-20 shrink-0 items-center gap-3 border-b border-white/[0.08] px-5">
          <div className="rounded-[14px] ring-1 ring-white/10">
            <BrandMark compact inverted />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold leading-5 tracking-[-0.02em] text-white">SAW System</p>
            <p className="mt-1 truncate text-[11px] font-medium tracking-[0.01em] text-emerald-100/55">Quản lý kho thông minh</p>
          </div>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2.5 py-5" aria-label="Điều hướng chính">
          {user && items.map((item, i) => {
            const route = getRoute(item, i)
            if (!route) {
              return (
                <button
                  key={item.label}
                  type="button"
                  disabled
                  className="flex min-h-11 w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 text-[13px] font-medium text-slate-400/55"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400/60">
                    <AppIcon name={item.icon} className="size-[18px]" />
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              )
            }
            const isActive = computeIsActive(route, i)
            return (
              <NavLink
                key={item.label}
                to={route}
                onClick={onClose}
                aria-current={isActive ? 'page' : undefined}
                className={`group relative flex min-h-11 items-center gap-3 rounded-xl px-2.5 text-[13px] transition-[background-color,color,transform] duration-200 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14231e] ${isActive
                  ? 'bg-emerald-500/[0.16] font-semibold text-white shadow-[inset_0_0_0_1px_rgba(110,231,183,0.12)]'
                  : 'font-medium text-slate-300/75 hover:translate-x-0.5 hover:bg-white/[0.055] hover:text-white active:translate-x-0'} ${isActive ? 'before:absolute before:inset-y-2.5 before:left-0 before:w-[3px] before:rounded-full before:bg-emerald-300' : ''}`}
              >
                <span className={`grid size-8 shrink-0 place-items-center rounded-lg transition-colors duration-200 ${isActive ? 'bg-emerald-400/15 text-emerald-200' : 'text-slate-400 group-hover:bg-white/[0.06] group-hover:text-emerald-100'}`}>
                  <AppIcon name={item.icon} className="size-[18px]" />
                </span>
                <span className="truncate">{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
        <div className="shrink-0 border-t border-white/[0.08] p-3">
          <button
            type="button"
            onClick={() => void logout()}
            className="group flex min-h-11 w-full items-center gap-3 rounded-xl px-2.5 text-[13px] font-medium text-slate-300/70 transition-[background-color,color] duration-200 hover:bg-rose-400/[0.08] hover:text-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14231e] motion-reduce:transition-none"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors group-hover:text-rose-200">
              <AppIcon name="logout" className="size-[18px]" />
            </span>
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  )
}
