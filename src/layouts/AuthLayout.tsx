import { useEffect, useRef, type MouseEvent } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router'
import AuthBrandPanel from '@/components/auth/AuthBrandPanel'
import AuthFooter from '@/components/auth/AuthFooter'
import BrandMark from '@/components/common/BrandMark'
import { ROUTES } from '@/constants/routes'
import { showNavigationRipple } from '@/hooks/showNavigationRipple'

export default function AuthLayout() {
  const location = useLocation()
  const homeLinkRef = useRef<HTMLAnchorElement>(null)
  useEffect(() => {
    if (location.pathname !== ROUTES.LOGIN) return
    const navigation = (window as Window & { navigation?: EventTarget }).navigation
    if (!navigation) return
    const onNavigate = (event: Event) => {
      const change = event as Event & { navigationType?: string; destination?: { url: string } }
      if (change.navigationType === 'traverse' && change.destination && new URL(change.destination.url).pathname === ROUTES.HOME && homeLinkRef.current) {
        showNavigationRipple(homeLinkRef.current, 'back')
      }
    }
    navigation.addEventListener('navigate', onNavigate)
    return () => navigation.removeEventListener('navigate', onNavigate)
  }, [location.pathname])
  const returnHome = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    showNavigationRipple(event.currentTarget, 'in')
  }
  return (
    <main className="min-h-[100dvh] bg-[#f2f7f4] lg:flex">
      <AuthBrandPanel />

      <div className="flex min-h-[100dvh] flex-1 flex-col bg-[#f7faf8]">
        <header className="flex h-[92px] shrink-0 items-center justify-between px-4 min-[651px]:px-9 lg:justify-end">
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <Link ref={homeLinkRef} to={ROUTES.HOME} onClick={returnHome} className="home-header-link auth-home-link">
            Trang chủ <ArrowRight size={17} />
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 py-7 sm:px-10 lg:px-12 lg:py-9">
          <div className="w-full max-w-[470px]">
            <Outlet />
            <AuthFooter />
          </div>
        </div>
      </div>
    </main>
  )
}
