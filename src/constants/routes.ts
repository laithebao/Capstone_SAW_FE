import { ROLES, type Role } from '@/constants/roles'

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  CHANGE_PASSWORD: '/account/change-password',
  TRACEABILITY: '/trace/:qrCode',
  ADMIN: '/admin',
  ADMIN_USER_ACCESS: '/admin/user-access',
  ADMIN_CROP_TYPES: '/admin/crop-types',
  ADMIN_CROP_TYPE_NEW: '/admin/crop-types/new',
  ADMIN_CROP_TYPE_EDIT: '/admin/crop-types/:id/edit',
  ADMIN_INSPECTION_STANDARDS: '/admin/inspection-standards',
  ADMIN_INSPECTION_STANDARD_NEW: '/admin/inspection-standards/new',
  ADMIN_INSPECTION_STANDARD_DETAIL: '/admin/inspection-standards/:id',
  ADMIN_INSPECTION_STANDARD_VERSION_NEW: '/admin/inspection-standards/:id/versions/new',
  ADMIN_AUDIT_LOGS: '/admin/audit-logs',
  ADMIN_AUDIT_CHANGES: '/admin/audit-logs/changes',
  ADMIN_AUDIT_DETAIL: '/admin/audit-logs/:id',
  WAREHOUSE_MANAGER: '/warehouse-manager',
  QC: '/qc',
  OPERATION: '/operation',
  SUPPLIER: '/supplier',
  DISTRIBUTOR: '/distributor',
  FORBIDDEN: '/403',
} as const

export const ROLE_HOME_ROUTES: Record<Role, string> = {
  [ROLES.ADMINISTRATOR]: ROUTES.ADMIN,
  [ROLES.WAREHOUSE_MANAGER]: ROUTES.WAREHOUSE_MANAGER,
  [ROLES.QC_STAFF]: ROUTES.QC,
  [ROLES.OPERATION_STAFF]: ROUTES.OPERATION,
  [ROLES.SUPPLIER]: ROUTES.SUPPLIER,
  [ROLES.DISTRIBUTOR]: ROUTES.DISTRIBUTOR,
}
