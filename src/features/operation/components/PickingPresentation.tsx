const labels: Record<string, string> = {
  APPROVED: 'Đã duyệt · chờ phân bổ', RESERVED: 'Đã giữ hàng', PARTIALLY_PICKED: 'Đang soạn một phần',
  PICKED: 'Đã soạn đủ', PREPARED: 'Đã chuẩn bị giao', ISSUED: 'Đã xuất kho', PARTIALLY_ISSUED: 'Đã xuất một phần',
  DISPATCHED: 'Đang giao', DELIVERED: 'Đã giao', CANCELLED: 'Đã hủy', REJECTED: 'Đã từ chối', RELEASED: 'Đã giải phóng giữ hàng',
}
export function PickingStatus({ status }: { status: string }) {
  const tone = ['PICKED', 'ISSUED', 'DELIVERED'].includes(status) ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : ['CANCELLED', 'REJECTED'].includes(status) ? 'border-rose-200 bg-rose-50 text-rose-700'
    : status === 'RELEASED' ? 'border-slate-200 bg-slate-50 text-slate-600'
    : status === 'APPROVED' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-sky-200 bg-sky-50 text-sky-800'
  return <span className={`inline-flex h-fit shrink-0 items-center gap-1.5 self-start whitespace-nowrap rounded-full border px-2.5 py-1 align-middle text-xs font-medium leading-4 ${tone}`}><span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />{labels[status] ?? status}</span>
}
