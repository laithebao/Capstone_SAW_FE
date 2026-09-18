export type AuditStatus = 'SUCCESS' | 'FAILED' | 'WARNING'

export interface AuditLogItem {
  id: number
  accountId: number | null
  actorName: string
  actorRole: string | null
  actionType: string
  entityName: string
  entityId: string | null
  description: string | null
  status: AuditStatus
  ipAddress: string | null
  createdAt: string
  hasChanges: boolean
}

export interface AuditLogDetail extends AuditLogItem {
  actorUsername: string | null
  actorEmail: string | null
  userAgent: string | null
  oldDataJson: string | null
  newDataJson: string | null
}

export interface AuditLogListResponse {
  items: AuditLogItem[]
  totalCount: number
  page: number
  pageSize: number
}

export interface AuditLogFilters {
  search?: string
  from?: string
  to?: string
  actionType?: string
  entityName?: string
  accountId?: number
  actor?: string
  status?: AuditStatus | ''
  changesOnly?: boolean
  page?: number
  pageSize?: number
}
