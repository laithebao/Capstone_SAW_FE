export interface ApiResponse<T> {
  statusCode: number
  isSuccess: boolean
  message: string
  data: T
  errors: string[] | null
  timestamp: string
}

export interface PagedResponse<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
}
