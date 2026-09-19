import { Navigate, Route, Routes } from 'react-router'
import { ROLES } from '@/constants/roles'
import { ROLE_HOME_ROUTES, ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import AuthLayout from '@/layouts/AuthLayout'
import DashboardLayout from '@/layouts/DashboardLayout'
import PublicLayout from '@/layouts/PublicLayout'
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'
import CropTypesPage from '@/pages/admin/CropTypesPage'
import CropTypeFormPage from '@/pages/admin/CropTypeFormPage'
import InspectionStandardsPage from '@/pages/admin/InspectionStandardsPage'
import InspectionStandardListPage from '@/pages/admin/InspectionStandardListPage'
import InspectionStandardDetailPage from '@/pages/admin/InspectionStandardDetailPage'
import InspectionStandardVersionFormPage from '@/pages/admin/InspectionStandardVersionFormPage'
import UserAccessPage from '@/pages/admin/UserAccessPage'
import AuditLogPage from '@/pages/admin/AuditLogPage'
import AuditLogDetailPage from '@/pages/admin/AuditLogDetailPage'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage'
import ChangePasswordPage from '@/pages/auth/ChangePasswordPage'
import DistributorDashboardPage from '@/pages/distributor/DistributorDashboardPage'
import OperationDashboardPage from '@/pages/operation/OperationDashboardPage'
import QCDashboardPage from '@/pages/qc/QCDashboardPage'
import SupplierDashboardPage from '@/pages/supplier/SupplierDashboardPage'
import ForbiddenPage from '@/pages/system/ForbiddenPage'
import NotFoundPage from '@/pages/system/NotFoundPage'
import TraceabilityPage from '@/pages/traceability/TraceabilityPage'
import WarehouseManagerDashboardPage from '@/pages/warehouse-manager/WarehouseManagerDashboardPage'
import ProtectedRoute from '@/routes/ProtectedRoute'
import RoleRoute from '@/routes/RoleRoute'

export default function AppRoutes() {
  const { user, isAuthenticated } = useAuth()
  const homeRoute = isAuthenticated && user ? ROLE_HOME_ROUTES[user.role] : ROUTES.LOGIN

  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<Navigate to={homeRoute} replace />} />

      <Route element={<AuthLayout />}>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
        <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
        <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmailPage />} />
      </Route>

      <Route element={<PublicLayout />}>
        <Route path={ROUTES.TRACEABILITY} element={<TraceabilityPage />} />
        <Route path={ROUTES.FORBIDDEN} element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path={ROUTES.CHANGE_PASSWORD} element={<ChangePasswordPage />} />
          <Route element={<RoleRoute allowedRoles={[ROLES.ADMINISTRATOR]} />}>
            <Route path={ROUTES.ADMIN} element={<AdminDashboardPage />} />
            <Route path={ROUTES.ADMIN_USER_ACCESS} element={<UserAccessPage />} />
            <Route path={ROUTES.ADMIN_CROP_TYPES} element={<CropTypesPage />} />
            <Route path={ROUTES.ADMIN_CROP_TYPE_NEW} element={<CropTypeFormPage />} />
            <Route path={ROUTES.ADMIN_CROP_TYPE_EDIT} element={<CropTypeFormPage />} />
            <Route path={ROUTES.ADMIN_INSPECTION_STANDARDS} element={<InspectionStandardListPage />} />
            <Route path={ROUTES.ADMIN_INSPECTION_STANDARD_NEW} element={<InspectionStandardsPage />} />
            <Route path={ROUTES.ADMIN_INSPECTION_STANDARD_DETAIL} element={<InspectionStandardDetailPage />} />
            <Route path={ROUTES.ADMIN_INSPECTION_STANDARD_VERSION_NEW} element={<InspectionStandardVersionFormPage />} />
            <Route path={ROUTES.ADMIN_AUDIT_LOGS} element={<AuditLogPage />} />
            <Route path={ROUTES.ADMIN_AUDIT_CHANGES} element={<AuditLogPage />} />
            <Route path={ROUTES.ADMIN_AUDIT_DETAIL} element={<AuditLogDetailPage />} />
          </Route>
          <Route element={<RoleRoute allowedRoles={[ROLES.WAREHOUSE_MANAGER]} />}>
            <Route path={ROUTES.WAREHOUSE_MANAGER} element={<WarehouseManagerDashboardPage />} />
          </Route>
          <Route element={<RoleRoute allowedRoles={[ROLES.QC_STAFF]} />}>
            <Route path={ROUTES.QC} element={<QCDashboardPage />} />
          </Route>
          <Route element={<RoleRoute allowedRoles={[ROLES.OPERATION_STAFF]} />}>
            <Route path={ROUTES.OPERATION} element={<OperationDashboardPage />} />
          </Route>
          <Route element={<RoleRoute allowedRoles={[ROLES.SUPPLIER]} />}>
            <Route path={ROUTES.SUPPLIER} element={<SupplierDashboardPage />} />
          </Route>
          <Route element={<RoleRoute allowedRoles={[ROLES.DISTRIBUTOR]} />}>
            <Route path={ROUTES.DISTRIBUTOR} element={<DistributorDashboardPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
