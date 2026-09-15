export const ROLES = {
  ADMINISTRATOR: 'ADMINISTRATOR',
  WAREHOUSE_MANAGER: 'WAREHOUSE_MANAGER',
  QC_STAFF: 'QC_STAFF',
  OPERATION_STAFF: 'OPERATION_STAFF',
  SUPPLIER: 'SUPPLIER',
  DISTRIBUTOR: 'DISTRIBUTOR',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const ROLE_BY_ID: Record<number, Role> = {
  1: ROLES.ADMINISTRATOR,
  2: ROLES.WAREHOUSE_MANAGER,
  3: ROLES.QC_STAFF,
  4: ROLES.OPERATION_STAFF,
  5: ROLES.SUPPLIER,
  6: ROLES.DISTRIBUTOR,
}

export const SELF_REGISTER_ROLES = [
  { id: 5, label: 'Nhà cung cấp' },
  { id: 6, label: 'Nhà phân phối' },
] as const
