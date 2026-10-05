import { useCallback, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { confirmGoodsReceipt, getGoodsReceipt } from '@/services/goodsReceiptService'
import { getAuthErrorMessage } from '@/services/authService'
import { useGoodsReceiptResource } from '@/features/operation/hooks/useGoodsReceiptResource'
import GoodsReceiptStatusBadge from '@/features/operation/components/GoodsReceiptStatusBadge'
import EditGoodsReceiptDraftForm from '@/features/operation/components/EditGoodsReceiptDraftForm'
import type { GoodsReceipt } from '@/types/goodsReceipt'

export default function GoodsReceiptDetailPage() {
  const { id } = useParams()
  return <ReceiptDetail key={id} id={Number(id)} />
}
function ReceiptDetail({ id }: { id: number }) {
  const location = useLocation()
  const resource = useGoodsReceiptResource(useCallback((signal: AbortSignal) => getGoodsReceipt(id, signal), [id]), true)
  const [modal, setModal] = useState<GoodsReceipt | null>(null)
  const [editing, setEditing] = useState<GoodsReceipt | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState(location.state?.savedDraft ? 'Đã lưu phiếu nhập nháp' : '')
  const receipt = resource.data
  async function confirm() {
    if (saving || !modal || resource.loading || receipt?.receiptStatus !== 'DRAFT') return
    setSaving(true); setError(null); setMessage('')
    try { await confirmGoodsReceipt(id, modal.snapshot); setMessage('Đã xác nhận nhập kho. Tồn kho đã được cập nhật.'); resource.reload() }
    catch (cause) { setError(getAuthErrorMessage(cause, 'Chưa xác định được kết quả xác nhận. Hãy tải lại phiếu để kiểm tra trước khi thử lại.')); resource.reload() }
    finally { setSaving(false); setModal(null) }
  }
  return <div className="mx-auto max-w-5xl space-y-5">
    <header className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-bold text-emerald-700">VẬN HÀNH · NHẬP KHO</p><h1 className="mt-1 text-2xl font-bold">CHI TIẾT PHIẾU NHẬP</h1></div><Link className="text-sm text-emerald-700" to={ROUTES.OPERATION_GOODS_RECEIPTS}>← Quay lại danh sách</Link></header>
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-4 text-emerald-700">{message}</p>}
    {(resource.error || error) && <div role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">{error || resource.error} <button className="underline" onClick={resource.reload}>Tải lại phiếu</button></div>}
    {resource.loading ? <p>Đang tải phiếu nhập...</p> : receipt && <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4"><h2 className="break-all font-mono font-bold text-emerald-700">{receipt.receiptCode}</h2><GoodsReceiptStatusBadge status={receipt.receiptStatus} /></div>
      <dl className="mt-5 grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-3">{[
        ['Mã lô', receipt.batchCode], ['Sản phẩm', receipt.productName], ['Nhà cung cấp', receipt.supplierName],
        ['Số lượng nhập', `${receipt.receivedQuantity.toLocaleString('vi-VN')} ${receipt.unit}`], ['Khối lượng nhập', `${receipt.weightInKg.toLocaleString('vi-VN')} kg`], ['Vị trí kho', receipt.locationName],
        ['Ngày nhận', receipt.receivedDate.split('-').reverse().join('/')], ['Người lập', receipt.operationStaffName], ['Thời điểm xác nhận', receipt.committedAt ? new Date(`${receipt.committedAt}Z`.replace('ZZ', 'Z')).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa xác nhận'],
      ].map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}</dl>
      <div className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-sm text-slate-500">Ghi chú</h3><p className="mt-1 whitespace-pre-wrap text-sm">{receipt.note || 'Không có ghi chú.'}</p></div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">{receipt.receiptStatus === 'DRAFT' ? 'Phiếu nháp chưa tăng tồn kho. Kiểm tra lại trước khi xác nhận.' : 'Phiếu đã xác nhận, không thể sửa hoặc xóa.'}</p>{receipt.receiptStatus === 'DRAFT' && !editing && <div className="flex flex-wrap gap-3"><button disabled={saving} onClick={() => { setEditing(receipt); setError(null); setMessage('') }} className="rounded-lg border border-emerald-200 px-4 py-2 text-emerald-700">Chỉnh sửa phiếu nháp</button><button disabled={saving} onClick={() => setModal(receipt)} className="rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white disabled:opacity-50">Xác nhận nhập kho</button></div>}</div>
    </section>}
    {editing && <EditGoodsReceiptDraftForm receipt={editing} committed={receipt?.receiptStatus === 'COMMITTED'} onCancel={() => { setEditing(null); resource.reload() }} onSaved={() => { setEditing(null); setMessage('Đã lưu thay đổi phiếu nháp'); resource.reload() }} />}
    {modal && <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/50 p-4" onKeyDown={e => { if (e.key === 'Escape' && !saving) setModal(null) }}><section role="dialog" aria-modal="true" aria-labelledby="confirm-receipt-title" className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
      <h2 id="confirm-receipt-title" className="text-lg font-bold">Xác nhận nhập kho?</h2><p className="mt-3 text-sm">Lô <strong>{modal.batchCode}</strong>: {modal.receivedQuantity.toLocaleString('vi-VN')} {modal.unit} · <strong>{modal.weightInKg.toLocaleString('vi-VN')} kg</strong></p><p className="mt-2 text-sm">Vị trí: <strong>{modal.locationName}</strong></p><p className="mt-2 text-sm">Ngày nhận: {modal.receivedDate.split('-').reverse().join('/')}<br />Ghi chú: {modal.note || 'Không có ghi chú.'}</p><p className="mt-3 text-sm text-slate-500">Sau xác nhận, phiếu không thể sửa hoặc xóa.</p>
      <div className="mt-5 flex justify-end gap-3"><button autoFocus disabled={saving} onClick={() => setModal(null)} className="rounded-lg border border-slate-200 px-4 py-2">Hủy</button><button disabled={saving || resource.loading || receipt?.receiptStatus !== 'DRAFT'} onClick={() => void confirm()} className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{saving ? 'Đang xác nhận...' : 'Xác nhận'}</button></div>
    </section></div>}
  </div>
}
