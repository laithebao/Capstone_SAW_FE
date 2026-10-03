export default function GoodsReceiptStatusBadge({ status }: { status: 'DRAFT' | 'COMMITTED' }) {
  return <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-medium ${status === 'COMMITTED' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{status === 'COMMITTED' ? 'Đã xác nhận nhập kho' : 'Nháp'}</span>
}
