/**
 * Tiện ích xử lý múi giờ Việt Nam (UTC+7 / Asia/Ho_Chi_Minh)
 */

/**
 * Trả về chuỗi định dạng YYYY-MM-DDTHH:mm theo giờ Việt Nam (Asia/Ho_Chi_Minh)
 * Dùng cho giá trị khởi tạo và thuộc tính max của input type="datetime-local"
 */
export function getVietnamDateTimeLocal(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const map: Record<string, string> = {}
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value
  }

  // en-CA format giờ có thể là 24 nếu là nửa đêm trong một số engine, đảm bảo 00
  const hour = map.hour === '24' ? '00' : map.hour
  return `${map.year}-${map.month}-${map.day}T${hour}:${map.minute}`
}

/**
 * Chuyển đổi chuỗi YYYY-MM-DDTHH:mm nhập từ input sang chuỗi ISO 8601 kèm múi giờ Việt Nam (+07:00)
 * Ví dụ: "2026-10-28T21:50" -> "2026-10-28T21:50:00+07:00"
 */
export function toVietnamIsoString(localDateTime: string): string {
  if (!localDateTime) return new Date().toISOString()
  
  // Nếu đã có timezone offset hoặc Z thì giữ nguyên
  if (localDateTime.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(localDateTime)) {
    return localDateTime
  }

  // Thêm giây nếu thiếu
  const clean = localDateTime.length === 16 ? `${localDateTime}:00` : localDateTime
  return `${clean}+07:00`
}

/**
 * Kiểm tra xem chuỗi thời gian nhập vào có nằm trong tương lai (theo giờ Việt Nam) hay không
 * Cho phép chênh lệch dung sai tối đa 1 phút
 */
export function isFutureVietnamTime(localDateTime: string, toleranceMinutes = 1): boolean {
  if (!localDateTime) return false
  const nowVn = getVietnamDateTimeLocal()
  
  // So sánh chuỗi ISO YYYY-MM-DDTHH:mm có thể so sánh trực tiếp theo thứ tự từ điển
  if (toleranceMinutes === 0) {
    return localDateTime > nowVn
  }

  // Tính chênh lệch timestamp
  const inputDate = new Date(toVietnamIsoString(localDateTime)).getTime()
  const nowDate = Date.now()
  return inputDate > nowDate + toleranceMinutes * 60 * 1000
}

/**
 * Hiển thị ngày giờ theo chuẩn Việt Nam (HH:mm dd/MM/yyyy)
 */
export function formatVietnamDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—'
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}
