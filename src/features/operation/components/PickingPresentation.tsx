const labels: Record<string, string> = {
  APPROVED: 'Đã duyệt · chờ phân bổ', RESERVED: 'Đã giữ hàng', PARTIALLY_PICKED: 'Đang soạn một phần',
  PICKED: 'Đã soạn đủ', PREPARED: 'Đã chuẩn bị giao', ISSUED: 'Đã xuất kho', PARTIALLY_ISSUED: 'Đã xuất một phần',
  DISPATCHED: 'Đang giao', DELIVERED: 'Đã giao', CANCELLED: 'Đã hủy', REJECTED: 'Đã từ chối', RELEASED: 'Đã giải phóng giữ hàng',
}
export function PickingStatus({ status }: { status: string }) {
  const tone = status === 'PICKED' ? 'bg-emerald-50 text-emerald-700' : status === 'APPROVED' ? 'bg-amber-50 text-amber-800' : 'bg-sky-50 text-sky-800'
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{labels[status] ?? status}</span>
}
