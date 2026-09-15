import warehouseHero from '@/assets/images/warehouse-login-hero.png'
import BrandMark from '@/components/common/BrandMark'

const highlights = [
  'Theo dõi tồn kho theo thời gian thực',
  'Kiểm soát chất lượng từng lô hàng',
  'Truy xuất nguồn gốc minh bạch',
]

export default function AuthBrandPanel() {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-slate-950 lg:flex lg:w-[48%] lg:flex-col">
      <img src={warehouseHero} alt="Kho nông sản hiện đại với hệ thống kệ lưu trữ" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/20 to-slate-950/95" />
      <div className="absolute inset-0 bg-emerald-950/15" />

      <header className="relative z-10 px-10 py-8 xl:px-14">
        <BrandMark inverted />
      </header>

      <div className="relative z-10 mt-auto max-w-xl px-10 pb-14 xl:px-14 xl:pb-16">
        <span className="mb-5 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 backdrop-blur-sm">
          Nền tảng quản lý kho nông sản
        </span>
        <h2 className="max-w-lg text-4xl font-bold leading-[1.12] tracking-tight text-white xl:text-5xl">
          Vận hành thông minh.
          <span className="block text-emerald-400">Nông sản an toàn.</span>
        </h2>
        <p className="mt-5 max-w-md text-sm leading-6 text-slate-300">
          Kết nối toàn bộ quy trình từ nhập kho, kiểm định chất lượng đến xuất hàng và truy xuất nguồn gốc.
        </p>

        <ul className="mt-7 grid gap-3 text-sm text-slate-200">
          {highlights.map((item) => (
            <li key={item} className="flex items-center gap-3">
              <span className="grid size-5 place-items-center rounded-full bg-emerald-500/20 text-emerald-300" aria-hidden="true">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
