import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import AppIcon from '@/components/common/AppIcon'
import { roleLabels } from '@/features/role-dashboard/roleDashboardConfig'
import { Link, useNavigate } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { getNotifications, markNotificationRead } from '@/services/notificationService'
import type { NotificationItem } from '@/types/notification'

export default function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const notificationPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const result = await getNotifications(controller.signal)
        setNotifications(result.items)
        setUnreadCount(result.unreadCount)
      } catch {
        // Keep the rest of the dashboard usable when the notification service is unavailable.
      }
    }
    void load()
    const intervalId = window.setInterval(() => void load(), 60_000)
    return () => {
      controller.abort()
      window.clearInterval(intervalId)
    }
  }, [user])

  useEffect(() => {
    if (!showNotifications) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!notificationPanelRef.current?.contains(event.target as Node)) setShowNotifications(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [showNotifications])

  const openNotification = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        await markNotificationRead(item.id)
        setNotifications((current) => current.map((notification) =>
          notification.id === item.id ? { ...notification, isRead: true } : notification))
        setUnreadCount((count) => Math.max(0, count - 1))
      } catch {
        // Navigation can proceed even if updating the read receipt fails.
      }
    }
    setShowNotifications(false)
    if (item.relatedEntityType?.startsWith('SUPPLY_CONTRACT_DELIVERY_')) {
      const contractsRoute = user?.role === 'SUPPLIER'
        ? ROUTES.SUPPLIER_CONTRACTS
        : user?.role === 'ADMINISTRATOR'
          ? ROUTES.ADMIN_CONTRACTS
          : ROUTES.WAREHOUSE_CONTRACTS
      navigate(contractsRoute)
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button type="button" onClick={onOpenMenu} className="grid size-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Mở menu"><AppIcon name="menu" className="size-5" /></button>
      <div className="ml-auto flex items-center gap-3">
        <div className="relative" ref={notificationPanelRef}>
          <button type="button" onClick={() => setShowNotifications((shown) => !shown)} className="relative grid size-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100" aria-label="Thông báo" aria-expanded={showNotifications}>
            <AppIcon name="bell" className="size-5"/>
            {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          {showNotifications && (
            <section className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl" aria-label="Danh sách thông báo">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div><h2 className="text-sm font-bold text-slate-900">Thông báo</h2><p className="text-xs text-slate-500">{unreadCount} thông báo chưa đọc</p></div>
                <button type="button" onClick={() => { setNotificationsLoading(true); void getNotifications().then((result) => { setNotifications(result.items); setUnreadCount(result.unreadCount) }).finally(() => setNotificationsLoading(false)) }} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">Làm mới</button>
              </div>
              <div className="max-h-[min(65vh,28rem)] overflow-y-auto">
                {notificationsLoading && <p className="px-4 py-3 text-xs text-slate-500">Đang tải thông báo...</p>}
                {!notificationsLoading && notifications.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">Bạn chưa có thông báo nào.</p>}
                {notifications.map((item) => (
                  <button key={item.id} type="button" onClick={() => void openNotification(item)} className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${item.isRead ? 'bg-white' : 'bg-emerald-50/60'}`}>
                    <span className="flex items-start gap-2"><span className={`mt-1.5 size-2 shrink-0 rounded-full ${item.isRead ? 'bg-transparent' : 'bg-emerald-600'}`} /><span className="min-w-0"><span className="block text-sm font-semibold text-slate-900">{item.title}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{item.message}</span><span className="mt-1 block text-[11px] text-slate-400">{new Date(item.createdAt).toLocaleString('vi-VN')}</span></span></span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
        <Link to={ROUTES.CHANGE_PASSWORD} className="hidden text-right sm:block" title="Đổi mật khẩu"><p className="text-sm font-semibold">{user?.name}</p><p className="text-xs text-slate-500">{user ? roleLabels[user.role] : ''}</p></Link><Link to={ROUTES.CHANGE_PASSWORD} className="grid size-10 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-700" title="Đổi mật khẩu">{user?.name?.charAt(0).toUpperCase()||'A'}</Link>
      </div>
    </header>
  )
}
