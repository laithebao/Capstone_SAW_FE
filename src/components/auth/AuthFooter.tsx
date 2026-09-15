const footerLinks = ['Chính sách bảo mật', 'Điều khoản sử dụng', 'Hỗ trợ']

export default function AuthFooter() {
  return (
    <footer className="mt-10 border-t border-slate-200 pt-5 text-center">
      <nav aria-label="Liên kết hỗ trợ" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
        {footerLinks.map((label) => (
          <a key={label} href="#" className="text-xs text-slate-500 transition hover:text-emerald-700">{label}</a>
        ))}
      </nav>
      <p className="mt-4 text-[11px] text-slate-400">© 2026 Smart Agri-Warehouse</p>
    </footer>
  )
}
