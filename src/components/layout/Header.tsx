import { useAuth } from '@/hooks/useAuth'

export default function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b p-4">
      <span>Smart Agri-Warehouse</span>
      <span>{user?.name}</span>
      <button type="button" onClick={logout} className="underline">
        Đăng xuất
      </button>
    </header>
  )
}
