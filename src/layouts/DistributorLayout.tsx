import { useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { Link, NavLink, useLocation, useOutlet } from 'react-router'
import AppIcon from '@/components/common/AppIcon'
import Header from '@/components/layout/Header'
import AiChatWidget from '@/components/AiChatWidget'
import DistributorFade from '@/features/distributor-orders/DistributorFade'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import type { CatalogLot } from '@/types/order'
import '@/pages/distributor/distributor-portal.css'

export interface DistributorOutletContext {
  setBatchContext: (ctx: { batchId?: number | null; batchCode?: string | null }) => void
  selectedLots: CatalogLot[]
  setSelectedLots: Dispatch<SetStateAction<CatalogLot[]>>
}

export default function DistributorLayout() {
  const [batchContext, setBatchContext] = useState<{ batchId?: number | null; batchCode?: string | null }>({})
  const [selectedLots, setSelectedLots] = useState<CatalogLot[]>([])
  const [accountOpen, setAccountOpen] = useState(false)
  const { user, logout } = useAuth()
  const location = useLocation()
  const accountRef = useRef<HTMLDivElement>(null)
  const accountTriggerRef = useRef<HTMLButtonElement>(null)
  const logoutDialogRef = useRef<HTMLDialogElement>(null)
  const outletContext = useMemo<DistributorOutletContext>(() => ({ setBatchContext, selectedLots, setSelectedLots }), [selectedLots])
  const content = useOutlet(outletContext)
  const displayName = user?.name?.trim() || 'Tài khoản'
  const avatar = displayName.charAt(0).toLocaleUpperCase('vi-VN')
  const cartActive = location.pathname === ROUTES.DISTRIBUTOR_CART || location.pathname === ROUTES.DISTRIBUTOR_ORDER_CREATE

  useEffect(() => {
    if (!accountOpen) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAccountOpen(false)
        accountTriggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [accountOpen])

  async function confirmLogout() {
    logoutDialogRef.current?.close()
    setSelectedLots([])
    setAccountOpen(false)
    await logout()
  }

  return <div className="saw-distributor">
    <header className="saw-top">
      <Link to={ROUTES.DISTRIBUTOR_CATALOG} className="saw-logo" aria-label="SAW System — Lô hàng đang bán">
        <span className="saw-mark"><AppIcon name="warehouse" /></span>
        <span><strong>SAW System</strong><small>Quản lý kho thông minh</small></span>
      </Link>
      <nav className="header-nav" aria-label="Điều hướng nhà phân phối">
        <div id="nav">
          <NavLink to={ROUTES.DISTRIBUTOR_CATALOG} className={({ isActive }) => isActive || location.pathname === ROUTES.DISTRIBUTOR ? 'active' : ''}>Lô hàng đang bán</NavLink>
          <NavLink to={ROUTES.DISTRIBUTOR_ORDERS} className={({ isActive }) => isActive ? 'active' : ''}>Đơn hàng của tôi</NavLink>
          <NavLink to={ROUTES.DISTRIBUTOR_OVERVIEW} className={({ isActive }) => isActive ? 'active' : ''}>Tổng quan mua hàng</NavLink>
          <Link to={ROUTES.DISTRIBUTOR_CART} className={'header-cart' + (cartActive ? ' active' : '')} aria-current={cartActive ? 'page' : undefined}>
            <AppIcon name="shoppingCart" /><span>Giỏ lô hàng</span><span className="header-cart-count">{selectedLots.length}</span>
          </Link>
        </div>
      </nav>
      <div className="saw-right">
        <Header marketplaceMode onOpenMenu={() => undefined} />
        <div className="account-wrap" ref={accountRef}>
          <button ref={accountTriggerRef} type="button" className="account-trigger" aria-haspopup="menu" aria-expanded={accountOpen} aria-controls="dist-account-menu" onClick={() => setAccountOpen(open => !open)}>
            <span className="saw-user"><strong>{displayName}</strong><small>Nhà phân phối</small></span>
            <span className="saw-avatar">{avatar}</span>
            <AppIcon name="chevronDown" className="account-chevron" />
          </button>
          <DistributorFade changeKey={accountOpen ? 'account' : null} className="account-menu" id="dist-account-menu" role="menu" aria-label="Tài khoản">
            <div className="account-intro"><strong>{displayName}</strong><small>Nhà phân phối</small></div>
            <Link role="menuitem" to={ROUTES.PROFILE} onClick={() => setAccountOpen(false)}><AppIcon name="users" />Cài đặt hồ sơ</Link>
            <div className="account-divider" />
            <button role="menuitem" type="button" className="logout-action" onClick={() => { setAccountOpen(false); logoutDialogRef.current?.showModal() }}><AppIcon name="logout" />Đăng xuất</button>
          </DistributorFade>
        </div>
      </div>
    </header>
    <DistributorFade as="main" changeKey={location.pathname} className="distributor-main"><div className="distributor-container">{content}</div></DistributorFade>
    <footer className="saw-marketplace-footer"><span>SAW System</span><span>Mua bán nông sản nguyên lô · Theo dõi nguồn hàng và đơn mua trên SAW</span></footer>
    <dialog ref={logoutDialogRef} className="account-dialog dist-logout-dialog">
      <form method="dialog" onSubmit={event => event.preventDefault()}>
        <div className="dist-dialog-icon"><AppIcon name="logout" /></div>
        <h2>Đăng xuất</h2>
        <p>Bạn có chắc chắn muốn đăng xuất khỏi SAW System?</p>
        <div className="dist-dialog-actions">
          <button type="button" className="dist-dialog-cancel" onClick={() => logoutDialogRef.current?.close()}>Quay lại</button>
          <button type="button" className="dist-dialog-confirm" onClick={() => void confirmLogout()}>Đăng xuất</button>
        </div>
      </form>
    </dialog>
    <AiChatWidget key={user?.id} fadePanel batchContextId={batchContext.batchId} batchContextCode={batchContext.batchCode} />
  </div>
}
