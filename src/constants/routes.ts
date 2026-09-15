import { ROLES, type Role } from '@/constants/roles'

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  TRACEABILITY: '/trace/:qrCode',
  ADMIN: '/admin',
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
