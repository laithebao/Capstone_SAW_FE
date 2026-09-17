import { ROLES } from '@/constants/roles'
import RoleDashboard from '@/features/role-dashboard/RoleDashboard'
import { roleDashboardConfigs } from '@/features/role-dashboard/roleDashboardConfig'
export default function OperationDashboardPage(){return <RoleDashboard config={roleDashboardConfigs[ROLES.OPERATION_STAFF]}/>}
