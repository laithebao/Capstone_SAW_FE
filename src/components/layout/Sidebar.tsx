import { Fragment } from 'react'
import { ClipboardList, FileCheck, History, Sprout, Warehouse } from 'lucide-react'
import './warehouse-sidebar.css'
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
  const warehouseGroups = [
    { label: 'Tổng quan', items: ['Bảng điều khiển'] },
    { label: 'Quản lý kho', items: ['Tồn kho', 'Sức chứa kho', 'Phân bố chất lượng', 'Quản lý lô hàng', 'Duyệt điều chỉnh tồn', 'Giám sát nhiệt ẩm kho'] },
    { label: 'Đơn hàng & bán hàng', items: ['Công bố lô bán', 'Phê duyệt đơn'] },
    { label: 'Nhà cung cấp', items: ['Hợp đồng nhà cung cấp'] },
  ]
  const operationGroups = [
    { label: 'Tổng quan', items: ['Bảng điều khiển'] },
    { label: 'Quản lý kho', items: ['Quản lý lô hàng', 'Nhập kho', 'Xuất kho'] },
    { label: 'Xử lý đơn hàng', items: ['Đơn hàng chờ soạn'] },
    { label: 'Kiểm soát tồn kho', items: ['Điều chỉnh tồn'] },
  ]
  const supplierGroups = [
    { label: 'Tổng quan', items: ['Bảng điều khiển'] },
    { label: 'Quản lý lô hàng', items: ['Lô hàng của tôi', 'Khai báo lô'] },
    { label: 'Hợp đồng', items: ['Hợp đồng thu mua'] },
    { label: 'Hồ sơ doanh nghiệp', items: ['Hồ sơ doanh nghiệp'] },
  ]
  const distributorGroups = [
    { label: 'Tổng quan', items: ['Bảng điều khiển'] },
    { label: 'Mua hàng', items: ['Lô hàng đang bán', 'Đơn hàng của tôi'] },
  ]
  const adminGroups = [
    { label: 'Tổng quan', items: ['Bảng điều khiển'] },
    { label: 'Quản trị hệ thống', items: ['Người dùng', 'Nhật ký hệ thống'] },
    { label: 'Danh mục & cấu hình', items: ['Loại nông sản', 'Tiêu chuẩn kiểm định', 'Sức chứa kho'] },
    { label: 'Hợp đồng', items: ['Duyệt hợp đồng'] },
  ]
  const adminIcons: Record<string, typeof Sprout> = { 'Nhật ký hệ thống': History, 'Loại nông sản': Sprout, 'Tiêu chuẩn kiểm định': ClipboardList, 'Sức chứa kho': Warehouse, 'Duyệt hợp đồng': FileCheck }
  const indexedItems = items.map((item, index) => ({ item, index }))
  const warehouseItems = warehouseGroups.flatMap(group => {
    const matching = group.items.flatMap(label => indexedItems.filter(entry => entry.item.label === label))
    return matching.map((entry, index) => ({ ...entry, heading: index === 0 ? group.label : undefined }))
  })
  const distributorItems = distributorGroups.flatMap(group => {
    const matching = group.items.flatMap(label => indexedItems.filter(entry => entry.item.label === label))
    return matching.map((entry, index) => ({ ...entry, heading: index === 0 ? group.label : undefined }))
  })
  const adminItems = adminGroups.flatMap(group => {
    const matching = group.items.flatMap(label => indexedItems.filter(entry => entry.item.label === label))
    return matching.map((entry, index) => ({ ...entry, heading: index === 0 ? group.label : undefined }))
  })
  const supplierItems = supplierGroups.flatMap(group => {
    const matching = group.items.flatMap(label => indexedItems.filter(entry => entry.item.label === label))
    return matching.map((entry, index) => ({ ...entry, heading: index === 0 ? group.label : undefined }))
  })
  const operationItems = operationGroups.flatMap(group => {
    const matching = group.items.flatMap(label => indexedItems.filter(entry => entry.item.label === label))
    return matching.map((entry, index) => ({ ...entry, heading: index === 0 ? group.label : undefined }))
  })
  const adminAssigned = new Set(adminItems.map(entry => entry.index))
  const assigned = new Set(warehouseItems.map(entry => entry.index))
  const navItems = user?.role === ROLES.WAREHOUSE_MANAGER
    ? [...warehouseItems, ...indexedItems.filter(entry => !assigned.has(entry.index)).map(entry => ({ ...entry, heading: undefined }))]
    : user?.role === ROLES.ADMINISTRATOR
      ? [...adminItems, ...indexedItems.filter(entry => !adminAssigned.has(entry.index)).map(entry => ({ ...entry, heading: undefined }))]
      : user?.role === ROLES.SUPPLIER
        ? supplierItems
        : user?.role === ROLES.OPERATION_STAFF
          ? operationItems
          : user?.role === ROLES.DISTRIBUTOR
            ? distributorItems
            : indexedItems.map(entry => ({ ...entry, heading: undefined }))

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
    if (user?.role === ROLES.SUPPLIER && route === ROUTES.SUPPLIER_BATCHES) return pathname.startsWith(route) && pathname !== ROUTES.SUPPLIER_BATCH_NEW
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
        <nav className={`min-h-0 flex-1 space-y-1 overflow-y-auto px-2.5 py-5 ${user?.role === ROLES.WAREHOUSE_MANAGER || user?.role === ROLES.ADMINISTRATOR || user?.role === ROLES.SUPPLIER || user?.role === ROLES.OPERATION_STAFF || user?.role === ROLES.DISTRIBUTOR ? 'saw-wm-sidebar-groups' : ''}`} aria-label="Điều hướng chính">
          {user && navItems.map(({ item, index: i, heading }) => {
            const route = getRoute(item, i)
            if (!route) {
              return (
                <Fragment key={item.label}>{heading && <p className="wm-nav-label">{heading}</p>}<button
                  type="button"
                  disabled
                  className="flex min-h-11 w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 text-[13px] font-medium text-slate-400/55"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400/60">
                    <AppIcon name={item.icon} className="size-[18px]" />
                  </span>
                  <span className="truncate">{item.label}</span>
                </button></Fragment>
              )
            }
            const isActive = computeIsActive(route, i)
            const AdminIcon = user.role === ROLES.ADMINISTRATOR ? adminIcons[item.label] : undefined
            return (
              <Fragment key={item.label}>{heading && <p className="wm-nav-label">{heading}</p>}<NavLink
                to={route}
                end={i === 0}
                onClick={onClose}
                aria-current={isActive ? 'page' : undefined}
                className={`group relative flex min-h-11 items-center gap-3 rounded-xl px-2.5 text-[13px] transition-[background-color,color,transform] duration-200 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14231e] ${isActive
                  ? 'bg-emerald-500/[0.16] font-semibold text-white shadow-[inset_0_0_0_1px_rgba(110,231,183,0.12)]'
                  : 'font-medium text-slate-300/75 hover:translate-x-0.5 hover:bg-white/[0.055] hover:text-white active:translate-x-0'} ${isActive ? 'before:absolute before:inset-y-2.5 before:left-0 before:w-[3px] before:rounded-full before:bg-emerald-300' : ''}`}
              >
                <span className={`grid size-8 shrink-0 place-items-center rounded-lg transition-colors duration-200 ${isActive ? 'bg-emerald-400/15 text-emerald-200' : 'text-slate-400 group-hover:bg-white/[0.06] group-hover:text-emerald-100'}`}>
                  {AdminIcon ? <AdminIcon className="size-[18px]" aria-hidden="true" /> : <AppIcon name={item.icon} className="size-[18px]" />}
                </span>
                <span className="truncate">{item.label}</span>
              </NavLink></Fragment>
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
