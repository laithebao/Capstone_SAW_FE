import { ROLES } from '@/constants/roles'
import { ROUTES } from '@/constants/routes'
import RoleDashboard from '@/features/role-dashboard/RoleDashboard'
import { roleDashboardConfigs } from '@/features/role-dashboard/roleDashboardConfig'
export default function SupplierDashboardPage(){return <RoleDashboard config={roleDashboardConfigs[ROLES.SUPPLIER]} primaryActionRoute={ROUTES.SUPPLIER_BATCH_NEW}/>}
