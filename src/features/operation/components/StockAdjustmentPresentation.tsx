export function AdjustmentStatus({ status }: { status: string }) {
  const text = status === 'PENDING' ? 'Chờ quản lý kho duyệt' : status === 'APPROVED' ? 'Đã duyệt' : status === 'REJECTED' ? 'Đã từ chối' : status
  const tone = status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800' : status === 'REJECTED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{text}</span>
}
