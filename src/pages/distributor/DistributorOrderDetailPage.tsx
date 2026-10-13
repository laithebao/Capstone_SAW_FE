import { useCallback, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { cancelDistributorOrder, confirmDistributorReceipt, getDistributorOrder } from '@/services/orderService'
import { getAuthErrorMessage } from '@/services/authService'
import { DistributorHeader, StatusBadge } from '@/features/distributor-orders/shared'
import { date, money, orderStatuses, panel, primary, timestamp, weight } from '@/features/distributor-orders/format'
import { useDistributorResource } from '@/features/distributor-orders/useDistributorResource'

export default function DistributorOrderDetailPage() {
  const id = Number(useParams().id)
  const location = useLocation()
  const result = useDistributorResource(useCallback((signal: AbortSignal) => getDistributorOrder(id, signal), [id]))
  const [action, setAction] = useState<'cancel' | 'receive' | null>(null)
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>((location.state as { message?: string } | null)?.message ?? null)
  async function perform(e: React.FormEvent) {
    e.preventDefault()
    if (!action || submitting.current) return
    submitting.current = true; setBusy(true); setError(null); setMessage(null)
    try {
      if (action === 'cancel') await cancelDistributorOrder(id)
      else await confirmDistributorReceipt(id)
      setMessage(action === 'cancel' ? 'Đã hủy đơn hàng.' : 'Đã xác nhận nhận đủ hàng.'); setAction(null); result.reload()
    } catch (cause) { setError(getAuthErrorMessage(cause, 'Không thể thực hiện thao tác. Vui lòng tải lại đơn.')); result.reload() }
    finally { submitting.current = false; setBusy(false) }
  }
  const order = result.data
  return <div className="mx-auto max-w-[1200px] space-y-5"><DistributorHeader title="Chi tiết Purchase Order" description="Theo dõi trạng thái đơn mua nguyên lô và xác nhận khi đã nhận đủ hàng." />
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-4 text-emerald-800">{message}</p>}
    {(error || result.error) && <p role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">{error || result.error} <button onClick={result.reload} className="underline">Tải lại đơn</button></p>}
    {result.loading ? <p role="status">Đang tải đơn...</p> : order && <>
      <section className={panel}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="break-all font-mono text-sm font-bold">{order.orderCode}</h2><StatusBadge status={order.status} /></div>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Địa chỉ nhận hàng</dt><dd>{order.deliveryAddress}</dd></div><div><dt className="text-slate-500">Liên hệ</dt><dd>{order.contactPhone}</dd></div><div><dt className="text-slate-500">Ngày đặt</dt><dd>{timestamp(order.createdAt)}</dd></div><div><dt className="text-slate-500">Ngày mong muốn nhận hàng</dt><dd>{order.expectedDeliveryDate ? date(order.expectedDeliveryDate) : 'Không yêu cầu ngày cụ thể'}</dd></div>{order.approvedAt && <div><dt className="text-slate-500">Thời điểm duyệt</dt><dd>{timestamp(order.approvedAt)}</dd></div>}{order.receivedAt && <div><dt className="text-slate-500">Đã xác nhận nhận hàng</dt><dd>{timestamp(order.receivedAt)}</dd></div>}</dl>
        {order.note && <p className="mt-4 whitespace-pre-wrap text-sm">Ghi chú: {order.note}</p>}{order.rejectionReason && <p className="mt-4 text-sm text-rose-700">Lý do từ chối: {order.rejectionReason}</p>}
      </section>
      <section className={panel}><h2 className="font-bold">Các lô đã đặt</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="border-b text-slate-500"><tr>{['Lô hàng', 'Sản phẩm', 'Khối lượng nguyên lô', 'Giá cả lô'].map(h => <th key={h} className="py-3 pr-4">{h}</th>)}</tr></thead><tbody className="divide-y">{order.lines.map(l => <tr key={l.batchId}><td className="py-3 pr-4">{l.batchId > 0 ? <Link className="font-semibold text-emerald-700 underline" to={ROUTES.DISTRIBUTOR_LOT_DETAIL.replace(':id', String(l.batchId))}>{l.batchCode}</Link> : l.batchCode}</td><td className="py-3 pr-4">{l.productName}</td><td className="py-3 pr-4">{weight(l.weightKg)} kg</td><td className="py-3 pr-4 font-semibold">{money(l.wholeLotPrice)}</td></tr>)}</tbody></table></div><p className="mt-4 text-right text-lg font-bold">Tổng: {money(order.totalAmount)}</p><p className="mt-2 text-sm text-slate-500">Thanh toán thực hiện bên ngoài hệ thống.</p></section>
      <section className={panel}><h2 className="font-bold">Tiến trình xử lý</h2><ol className="mt-4 space-y-4">{order.history.map((h, index) => <li key={`${h.changedAt}-${index}`} className="border-l-2 border-emerald-200 pl-4"><p className="text-sm font-semibold">{orderStatuses[h.newStatus] ?? h.newStatus}</p><p className="text-xs text-slate-500">{timestamp(h.changedAt)}</p>{h.reason && <p className="mt-1 text-sm text-slate-600">{h.reason}</p>}</li>)}</ol>{!order.history.length && <p className="mt-3 text-sm text-slate-500">Chưa có lịch sử xử lý.</p>}<button onClick={result.reload} className="mt-4 text-sm font-semibold text-emerald-700">Cập nhật trạng thái</button></section>
      <div className="flex flex-wrap gap-3">{order.canCancel && <button disabled={busy} onClick={() => { setAction('cancel'); setError(null) }} className="rounded-lg border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-700">Hủy đơn hàng</button>}{order.canConfirmReceipt && <button disabled={busy} onClick={() => { setAction('receive'); setError(null) }} className={primary}>Xác nhận đã nhận hàng</button>}</div>
      {action && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={e => { if (e.target === e.currentTarget && !busy) setAction(null) }}><form onSubmit={e => void perform(e)} role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-label={action === 'cancel' ? 'Xác nhận hủy đơn' : 'Xác nhận nhận hàng'} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"><h2 id="confirm-title" className="text-lg font-bold">{action === 'cancel' ? 'Xác nhận hủy đơn hàng?' : 'Xác nhận đã nhận hàng?'}</h2>{action === 'cancel' ? <p className="mt-3 text-sm text-slate-600">Bạn có chắc muốn hủy đơn hàng này không? Thao tác này không thể hoàn tác.</p> : <p className="mt-3 text-sm text-slate-600">Chỉ xác nhận sau khi thực tế đã nhận đủ hàng. Thao tác này không xác nhận thanh toán.</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} onClick={() => setAction(null)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">Quay lại</button><button disabled={busy} className={action === 'cancel' ? 'rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50' : primary}>{busy ? 'Đang xử lý...' : 'Xác nhận'}</button></div></form></div>}
    </>}
  </div>
}
