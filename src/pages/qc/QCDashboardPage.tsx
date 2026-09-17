import { ROLES } from '@/constants/roles'
import RoleDashboard from '@/features/role-dashboard/RoleDashboard'
import { roleDashboardConfigs } from '@/features/role-dashboard/roleDashboardConfig'
export default function QCDashboardPage(){return <RoleDashboard config={roleDashboardConfigs[ROLES.QC_STAFF]}/>}
