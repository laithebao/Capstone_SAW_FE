// Kiểu nền tảng đề xuất; đối chiếu với hợp đồng ASP.NET Core trước khi tích hợp.
export interface ApiResponse<T> {
  data: T
}

export interface PagedResponse<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
}
