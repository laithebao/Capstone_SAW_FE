import { Navigate, Outlet } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import DistributorGuard from './DistributorGuard'

export default function ProtectedRoute() {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />
  return user?.role === 'DISTRIBUTOR' ? <DistributorGuard /> : <Outlet />
}
