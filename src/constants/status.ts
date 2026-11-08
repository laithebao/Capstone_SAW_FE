// Trạng thái tải của UI; bổ sung trạng thái nghiệp vụ sau khi có hợp đồng API.
export const REQUEST_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
} as const

export type RequestStatus = (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS]
