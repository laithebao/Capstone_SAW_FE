import { ArrowDownRight, ArrowRight, ClipboardCheck, Handshake, Leaf, PackageCheck, ScanLine, ThermometerSun, Truck, Warehouse } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import { Link } from 'react-router'
import BrandMark from '@/components/common/BrandMark'
import { ROLE_HOME_ROUTES, ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import { useHomeWheelSmoothing } from '@/hooks/useHomeWheelSmoothing'
import { useHomeSequentialReveal } from '@/hooks/useHomeSequentialReveal'
import { restoreInterruptedHomeScroll, showNavigationRipple } from '@/hooks/showNavigationRipple'
import warehouseImage from '@/assets/images/warehouse-login-hero.png'
import produceImage from '@/assets/images/home-produce.png'
import HomeCatalog from './HomeCatalog'
import './home.css'

const steps = [
  { number: '01', title: 'Kết nối nguồn cung', text: 'Nhà cung cấp xác nhận hợp đồng và khai báo thông tin lô nông sản.', icon: Handshake },
  { number: '02', title: 'Kiểm định và lưu kho', text: 'Lô hàng được tiếp nhận, kiểm định chất lượng và theo dõi trong kho.', icon: ClipboardCheck },
  { number: '03', title: 'Phân phối và truy xuất', text: 'Nhà phân phối đặt mua lô hàng và theo dõi quá trình xử lý đơn.', icon: Truck },
]

export default function HomePage() {
  const { user, isAuthenticated } = useAuth()
  useHomeWheelSmoothing()
  useHomeSequentialReveal()
  const cursorRingRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const navigationTarget = useRef<{ id: string; until: number } | null>(null)
  const [activeSection, setActiveSection] = useState('top')
  const destination = isAuthenticated && user ? ROLE_HOME_ROUTES[user.role] : ROUTES.LOGIN

  useLayoutEffect(() => { restoreInterruptedHomeScroll() }, [])

  useLayoutEffect(() => {
    const nav = navRef.current
    const active = nav?.querySelector<HTMLElement>('a[aria-current]')
    if (!nav || !active) return
    const position = () => {
      nav.style.setProperty('--home-nav-left', `${active.offsetLeft}px`)
      nav.style.setProperty('--home-nav-width', `${active.offsetWidth}px`)
      nav.classList.add('home-nav-ready')
    }
    position()
    window.addEventListener('resize', position)
    return () => window.removeEventListener('resize', position)
  }, [activeSection])

  useEffect(() => {
    const sections = ['giai-phap', 'lo-hang', 'quy-trinh', 'doi-tac', 'cau-hoi']
    let frame = 0
    const update = () => {
      frame = 0
      const target = navigationTarget.current
      if (target) {
        const destinationTop = document.getElementById(target.id)?.getBoundingClientRect().top
        if (performance.now() < target.until && destinationTop !== undefined && Math.abs(destinationTop) > 150) return
        navigationTarget.current = null
      }
      let current = 'top'
      for (const id of sections) {
        const section = document.getElementById(id)
        if (section && section.getBoundingClientRect().top <= 150) current = id
      }
      setActiveSection(current)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    const cancelNavigation = () => { navigationTarget.current = null }
    const onKeyDown = (event: KeyboardEvent) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) cancelNavigation()
    }
    const onHistoryChange = () => {
      const hash = decodeURIComponent(window.location.hash.slice(1))
      const id = sections.includes(hash) ? hash : 'top'
      navigationTarget.current = { id, until: performance.now() + 3000 }
      setActiveSection(id)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    window.addEventListener('wheel', cancelNavigation, { passive: true })
    window.addEventListener('touchstart', cancelNavigation, { passive: true })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('hashchange', onHistoryChange)
    window.addEventListener('popstate', onHistoryChange)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('wheel', cancelNavigation)
      window.removeEventListener('touchstart', cancelNavigation)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('hashchange', onHistoryChange)
      window.removeEventListener('popstate', onHistoryChange)
      cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    const ring = cursorRingRef.current
    if (!ring) return
    const motionAllowed = window.matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)')
    let frame = 0
    let x = 0
    let y = 0
    let interactive = false

    const hideRing = () => {
      ring.style.opacity = '0'
      if (frame) cancelAnimationFrame(frame)
      frame = 0
    }
    const moveRing = (event: PointerEvent) => {
      if (!motionAllowed.matches || event.pointerType !== 'mouse') return
      x = event.clientX
      y = event.clientY
      interactive = event.target instanceof Element && !!event.target.closest('a, button, summary, input, select, textarea')
      if (!frame) frame = requestAnimationFrame(() => {
        ring.style.transform = `translate3d(${x}px, ${y}px, 0)`
        ring.style.opacity = '1'
        ring.classList.toggle('home-cursor-ring--interactive', interactive)
        frame = 0
      })
    }
    const leavePage = (event: PointerEvent) => { if (!event.relatedTarget) hideRing() }
    const handlePreference = () => { if (!motionAllowed.matches) hideRing() }
    window.addEventListener('pointermove', moveRing, { passive: true })
    document.addEventListener('pointerout', leavePage)
    window.addEventListener('blur', hideRing)
    motionAllowed.addEventListener('change', handlePreference)
    return () => {
      hideRing()
      window.removeEventListener('pointermove', moveRing)
      document.removeEventListener('pointerout', leavePage)
      window.removeEventListener('blur', hideRing)
      motionAllowed.removeEventListener('change', handlePreference)
    }
  }, [])

  function transitionToLogin(event: MouseEvent<HTMLAnchorElement>) {
    if (destination !== ROUTES.LOGIN || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    showNavigationRipple(event.currentTarget)
  }

  return (
    <div className="saw-home">
      <div ref={cursorRingRef} className="home-cursor-ring" aria-hidden="true" />
      <header className="home-header">
        <a href="#top" aria-label="SAW, về đầu trang"><BrandMark inverted /></a>
        <nav ref={navRef} aria-label="Điều hướng trang chủ" className="home-nav">
          <span className="home-nav-indicator" aria-hidden="true" />
          {[
            ['top', 'Trang chủ'], ['giai-phap', 'Giải pháp'], ['lo-hang', 'Lô hàng'], ['quy-trinh', 'Quy trình'],
            ['doi-tac', 'Đối tác'], ['cau-hoi', 'Câu hỏi'],
          ].map(([id, label]) => <a key={id} href={`#${id}`} aria-current={activeSection === id ? 'location' : undefined} onClick={(event) => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
            navigationTarget.current = { id, until: performance.now() + 3000 }
            setActiveSection(id)
          }}>{label}</a>)}
        </nav>
        <Link className="home-header-link" to={destination} onClick={transitionToLogin}>{isAuthenticated ? 'Vào hệ thống' : 'Đăng nhập'} <ArrowRight size={17} /></Link>
      </header>

      <main id="top">
        <section className="home-cinematic" aria-label="Giới thiệu Smart Agri-Warehouse">
        <div className="home-hero">
          <div className="home-hero-copy">
            <p className="home-eyebrow"><Leaf size={16} /> SMART AGRI-WAREHOUSE</p>
            <h1>Nông sản tốt.<br /><span>Vận hành thông minh.</span></h1>
            <p className="home-intro">Kết nối nguồn cung, kiểm định và phân phối nông sản trong một hệ thống quản lý kho.</p>
            <div className="home-actions"><Link className="home-button" to={destination} onClick={transitionToLogin}>{isAuthenticated ? 'Vào hệ thống' : 'Bắt đầu ngay'} <ArrowRight size={18} /></Link><a className="home-text-link" href="#lo-hang">Xem lô hàng đang bán <ArrowDownRight size={18} /></a></div>
          </div>
          <div className="home-hero-image"><img src={produceImage} alt="Kiểm tra nông sản tại khu vực đóng gói" /></div>
          <div className="home-scroll-hint" aria-hidden="true"><span>Cuộn để khám phá</span><span className="home-scroll-line" /></div>
        </div>
        </section>

        <section id="giai-phap" className="home-container home-section home-overview">
          <div className="home-overview-heading"><p className="home-eyebrow">MỘT QUY TRÌNH LIỀN MẠCH</p><h2>Chăm chút từng lô hàng.<br /><span>Kết nối cả hành trình.</span></h2><p>SAW giúp các bên cùng theo dõi nông sản từ hợp đồng, tiếp nhận và kiểm định đến lưu kho, xuất hàng.</p></div>
          <div className="home-features">
            <article><img src={warehouseImage} alt="" loading="lazy" /><span className="home-feature-icon"><Warehouse /></span><div><h3>Quản lý kho</h3><p>Theo dõi tồn kho, vị trí lưu trữ và hoạt động nhập xuất.</p></div><ArrowDownRight className="home-feature-arrow" /></article>
            <article><img src={produceImage} alt="" loading="lazy" /><span className="home-feature-icon"><ClipboardCheck /></span><div><h3>Kiểm định chất lượng</h3><p>Ghi nhận kết quả QC và theo dõi điều kiện bảo quản.</p></div><ArrowDownRight className="home-feature-arrow" /></article>
            <article><img src={produceImage} alt="" loading="lazy" /><span className="home-feature-icon"><ScanLine /></span><div><h3>Truy xuất lô hàng</h3><p>Tra cứu thông tin và lịch sử xử lý theo từng lô nông sản.</p></div><ArrowDownRight className="home-feature-arrow" /></article>
            <article><img src={warehouseImage} alt="" loading="lazy" /><span className="home-feature-icon"><ThermometerSun /></span><div><h3>Theo dõi rủi ro</h3><p>Tham khảo dự báo hao hụt và tình trạng nhiệt độ, độ ẩm.</p></div><ArrowDownRight className="home-feature-arrow" /></article>
          </div>
        </section>

        <HomeCatalog />
        <section className="home-quality" aria-labelledby="home-quality-title">
          <div className="home-quality-image"><img src={produceImage} alt="Nông sản được kiểm tra trong khu vực đóng gói" loading="lazy" /></div>
          <div className="home-quality-copy"><p className="home-eyebrow">CHẤT LƯỢNG TRONG TỪNG BƯỚC</p><h2 id="home-quality-title">Thông tin rõ ràng.<br /><span>An tâm phối hợp.</span></h2><p>Mỗi lô hàng gắn với thông tin nguồn cung, kết quả kiểm định và quá trình lưu kho để các bên dễ theo dõi.</p><a className="home-text-link" href="#quy-trinh">Tìm hiểu quy trình <ArrowDownRight size={18} /></a></div>
        </section>

        <section id="quy-trinh" className="home-process"><div className="home-container home-section">
          <div className="home-process-heading"><div><p className="home-eyebrow">TỪ NÔNG TRẠI ĐẾN ĐỐI TÁC</p><h2>Mỗi bước đều<br /><span>có thể theo dõi.</span></h2><p>Một luồng làm việc kết nối nhà cung cấp, đội ngũ kho và nhà phân phối.</p></div></div>
          <div className="home-steps">{steps.map(step => <article key={step.number}><span>{step.number}</span><div><h3>{step.title}</h3><p>{step.text}</p></div><step.icon size={24} strokeWidth={1.6} aria-hidden="true" /></article>)}</div>
        </div></section>

        <section id="doi-tac" className="home-container home-section home-partners">
          <div className="home-partner-heading"><p className="home-eyebrow">DÀNH CHO ĐỐI TÁC</p><h2>Cùng kết nối<br /><span>chuỗi nông sản.</span></h2><p>Tham gia hệ thống để quản lý công việc theo vai trò của bạn.</p>{isAuthenticated && <Link className="home-button" to={destination}>Vào hệ thống <ArrowRight size={18} /></Link>}</div>
          <div className="home-partner-list"><article><span className="home-partner-icon"><Leaf /></span><div><h3>Nhà cung cấp</h3><p>Quản lý hợp đồng, khai báo và theo dõi lô hàng từ lúc gửi đến khi nhập kho.</p></div><ArrowRight /></article><article><span className="home-partner-icon"><PackageCheck /></span><div><h3>Nhà phân phối</h3><p>Xem lô hàng được công bố, đặt mua và theo dõi quá trình xử lý đơn.</p></div><ArrowRight /></article></div>
        </section>
        <section id="cau-hoi" className="home-faq"><div className="home-container home-section"><div className="home-faq-heading"><div><p className="home-eyebrow">TÌM HIỂU THÊM</p><h2>Câu hỏi thường gặp</h2></div><p>Thông tin cơ bản để bắt đầu sử dụng hệ thống SAW.</p></div><div className="home-faq-list"><details><summary>Những ai có thể sử dụng SAW?<span>+</span></summary><p>Nhà cung cấp, nhà phân phối và các nhân sự vận hành kho sử dụng hệ thống theo vai trò được cấp.</p></details><details><summary>Nhà cung cấp theo dõi lô hàng như thế nào?<span>+</span></summary><p>Nhà cung cấp có thể khai báo lô hàng và theo dõi trạng thái xử lý trong tài khoản của mình.</p></details><details><summary>Nhà phân phối đặt mua nông sản ở đâu?<span>+</span></summary><p>Sau khi đăng nhập, nhà phân phối có thể xem các lô đã công bố và tạo đơn mua trong hệ thống.</p></details><details><summary>SAW theo dõi chất lượng như thế nào?<span>+</span></summary><p>Hệ thống ghi nhận kết quả kiểm định QC, nhiệt độ và độ ẩm bảo quản theo từng lô hàng.</p></details></div></div></section>
      </main>
      <footer className="home-footer"><div className="home-container home-footer-inner"><div><BrandMark /><p>Hệ thống quản lý kho nông sản thông minh.<br />Kết nối thông tin trên từng hành trình lô hàng.</p></div><div><h3>Khám phá</h3><div className="home-footer-links"><a href="#giai-phap">Giải pháp</a><a href="#quy-trinh">Quy trình</a><a href="#doi-tac">Đối tác</a></div></div><div><h3>Hệ thống</h3><div className="home-footer-links"><Link to={destination} onClick={transitionToLogin}>{isAuthenticated ? 'Vào hệ thống' : 'Đăng nhập'}</Link></div></div></div><div className="home-container home-footer-bottom"><span>© {new Date().getFullYear()} Smart Agri-Warehouse</span><a href="#top">Về đầu trang ↑</a></div></footer>
    </div>
  )
}
