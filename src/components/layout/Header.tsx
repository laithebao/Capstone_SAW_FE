import { useNavigate } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b p-4">
      <span>Smart Agri-Warehouse</span>
      <span>{user?.name}</span>
      <button type="button" onClick={handleLogout} className="underline">
        Đăng xuất
      </button>
    </header>
  )
}
