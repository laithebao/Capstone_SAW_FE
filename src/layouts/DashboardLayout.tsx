import { useLayoutEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { flushSync } from 'react-dom'
import { Outlet, useLocation, useNavigate } from 'react-router'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import { useAuth } from '@/hooks/useAuth'
import { ROLES } from '@/constants/roles'
import { useWarehousePageMotion } from '@/hooks/useWarehousePageMotion'
import '@/styles/saw-animations.css'
import '@/styles/warehouse-scrollbars.css'
import '@/styles/admin-shared.css'
import '@/styles/supplier-portal.css'
import '@/pages/operation/operation-portal.css'

export default function DashboardLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const mainRef = useRef<HTMLElement>(null)
  const transitionRef = useRef<ViewTransition | null>(null)
  const isManager = user?.role === ROLES.WAREHOUSE_MANAGER
  const isAdmin = user?.role === ROLES.ADMINISTRATOR
  const isSupplier = user?.role === ROLES.SUPPLIER
  const isOperation = user?.role === ROLES.OPERATION_STAFF
  const motionEnabled = isManager || isAdmin || isSupplier || isOperation
  useWarehousePageMotion(motionEnabled, pathname, mainRef)
  useLayoutEffect(() => {
    if (!isManager) return
    document.documentElement.classList.add('saw-warehouse-scrollbars-hidden')
    return () => document.documentElement.classList.remove('saw-warehouse-scrollbars-hidden')
  }, [isManager])

  function navigateWithMotion(event: MouseEvent<HTMLDivElement>) {
    if (!motionEnabled || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !document.startViewTransition) return
    const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href]')
    if (!anchor || (!anchor.closest('nav[aria-label="Điều hướng chính"]') && !anchor.hasAttribute('data-saw-transition')) || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return
    const url = new URL(anchor.href, location.href)
    if (url.origin !== location.origin || url.pathname === location.pathname) return
    event.preventDefault()
    transitionRef.current?.skipTransition()
    document.documentElement.classList.add('saw-wm-transition')
    const transition = document.startViewTransition(() => flushSync(() => navigate(`${url.pathname}${url.search}${url.hash}`)))
    void transition.ready.catch(() => undefined)
    transitionRef.current = transition
    void transition.finished.catch(() => undefined).finally(() => {
      if (transitionRef.current === transition) { transitionRef.current = null; document.documentElement.classList.remove('saw-wm-transition') }
    })
  }

  return <div className={`min-h-screen bg-[#f8faf9] text-slate-900${motionEnabled ? ' saw-wm-motion' : ''}${isAdmin ? ' saw-admin-ui' : ''}${isSupplier ? ' saw-supplier-ui' : ''}${isOperation ? ' saw-operation' : ''}`} onClickCapture={navigateWithMotion}>
    <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
    <div className="min-h-screen lg:pl-64"><Header onOpenMenu={() => setSidebarOpen(true)} /><main ref={mainRef} className="min-w-0 px-4 py-5 sm:px-6 lg:px-8"><Outlet /></main></div>
  </div>
}
