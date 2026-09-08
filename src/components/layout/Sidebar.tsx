import { NavLink } from 'react-router'
import { ROLE_HOME_ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'

export default function Sidebar() {
  const { user } = useAuth()

  return (
    <aside className="p-4 md:w-56">
      <nav aria-label="Điều hướng chính">
        {/* Bổ sung mục điều hướng theo vai trò tại đây khi triển khai màn hình. */}
        {user && (
          <NavLink to={ROLE_HOME_ROUTES[user.role]} className="underline" end>
            Tổng quan
          </NavLink>
        )}
      </nav>
    </aside>
  )
}
