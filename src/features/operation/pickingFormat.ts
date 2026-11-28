import { formatVietnamDateTime } from '@/utils/vietnamTime'
export const pickingKg = (value: number) => `${value.toLocaleString('vi-VN', { maximumFractionDigits: 3 })} kg`
export const pickingTime = (value: string | null) => value ? formatVietnamDateTime(/(Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`, { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa ghi nhận'
export const pickingDate = (value: string | null) => value ? value.split('-').reverse().join('/') : 'Chưa xác định'
