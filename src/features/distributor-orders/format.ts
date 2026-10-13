export const orderStatuses: Record<string, string> = {
  PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', ISSUED: 'Đã xuất kho',
  DELIVERED: 'Đã nhận hàng', REJECTED: 'Bị từ chối', CANCELLED: 'Đã hủy',
}
export const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
export const weight = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 3 })
export const date = (value: string | null) => value ? value.slice(0, 10).split('-').reverse().join('/') : '—'
export const timestamp = (value: string) => new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`).toLocaleString('vi-VN')
export const vietnamToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
export const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm'
export const primary = 'rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50'
export const panel = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm'

