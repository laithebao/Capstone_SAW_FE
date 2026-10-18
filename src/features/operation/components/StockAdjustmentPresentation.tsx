export function AdjustmentStatus({ status }: { status: string }) {
  const text = status === 'PENDING' ? 'Chờ quản lý kho duyệt' : status === 'APPROVED' ? 'Đã duyệt' : status === 'REJECTED' ? 'Đã từ chối' : status
  const tone = status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800' : status === 'REJECTED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'
  return <span className={`inline-flex h-fit shrink-0 items-center self-start whitespace-nowrap rounded-full px-2.5 py-1 align-middle text-xs font-medium leading-5 ${tone}`}>{text}</span>
}
