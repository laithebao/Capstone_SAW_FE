import { Navigate, Outlet } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import DistributorGuard from './DistributorGuard'
import { DistributorCartProvider } from '@/features/distributor-orders/DistributorCartProvider'

export default function ProtectedRoute() {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />
  return user?.role === 'DISTRIBUTOR'
    ? <DistributorCartProvider key={user.id}><DistributorGuard /></DistributorCartProvider>
    : <Outlet />
}
