import OrderAdjustmentProposals from '@/features/distributor-orders/OrderAdjustmentProposals'
import OrderDeliveryRefusalPanel from '@/features/distributor-orders/OrderDeliveryRefusalPanel'
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
  // Returning from the native file picker must not reload and unmount the refusal form.
  const result = useDistributorResource(useCallback((signal: AbortSignal) => getDistributorOrder(id, signal), [id]), { refreshOnFocus: false })
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
      setMessage(action === 'cancel' ? 'Đã hủy đơn hàng.' : result.data?.status === 'PARTIALLY_REFUSED' ? 'Đã xác nhận nhận các lô còn lại.' : 'Đã xác nhận nhận đủ hàng.'); setAction(null); result.reload()
    } catch (cause) { setError(getAuthErrorMessage(cause, 'Không thể thực hiện thao tác. Vui lòng tải lại đơn.')); result.reload() }
    finally { submitting.current = false; setBusy(false) }
  }
  const order = result.data
  const shipped = ['ISSUED', 'DISPATCHED'].includes(order?.status ?? '')
  const receiptMessage = order?.status === 'DELIVERED' ? 'Nếu có lô bị lỗi, bạn có thể chọn lô đó để từ chối kèm lý do và ảnh bằng chứng bên dưới.'
    : order?.status === 'PARTIALLY_REFUSED' ? order.receivedAt ? 'Bạn đã nhận các lô còn lại. Chỉ các lô bị từ chối được xử lý bên ngoài hệ thống.' : 'Một số lô đã bị từ chối. Bạn có thể xác nhận nhận các lô còn lại hoặc chọn thêm lô có vấn đề.'
    : order?.status === 'DELIVERY_REFUSED' ? 'Bạn đã từ chối nhận đơn. Các bên sẽ liên hệ xử lý bên ngoài hệ thống.'
    : order?.status === 'RETURNED' ? 'Đơn đã kết thúc theo luồng xử lý trước đây.'
    : ['CANCELLED', 'REJECTED'].includes(order?.status ?? '') ? 'Đơn đã hủy hoặc bị từ chối, không có thao tác nhận hàng.'
    : !shipped ? `Đơn đang ở trạng thái “${orderStatuses[order?.status ?? ''] ?? order?.status}”. Kho chưa xuất đủ hàng nên các thao tác xác nhận hoặc từ chối nhận hàng chưa khả dụng.`
    : order?.canConfirmReceipt ? 'Kho đã xuất hàng. Vui lòng chọn thao tác phù hợp với tình trạng nhận hàng thực tế.'
    : 'Đơn chưa đủ điều kiện xác nhận nhận hàng. Vui lòng kiểm tra thông tin bên dưới.'
  const dialogTitle = action === 'cancel' ? 'Xác nhận hủy đơn hàng?' : order?.status === 'PARTIALLY_REFUSED' ? 'Xác nhận đã nhận các lô còn lại?' : 'Xác nhận đã nhận đủ hàng?'
  const dialogBody = action === 'cancel' ? 'Bạn có chắc muốn hủy đơn hàng này không? Thao tác này không thể hoàn tác.'
    : order?.status === 'PARTIALLY_REFUSED' ? 'Chỉ xác nhận khi đã nhận đủ các lô không bị từ chối. Những lô đã từ chối giữ nguyên; thao tác này không xác nhận thanh toán.' : 'Chỉ xác nhận sau khi thực tế đã nhận đủ hàng. Thao tác này không xác nhận thanh toán.'
  return <div className="mx-auto max-w-[1200px] space-y-5"><DistributorHeader title="Chi tiết Purchase Order" description="Theo dõi trạng thái đơn mua nguyên lô và xác nhận khi đã nhận đủ hàng." />
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-4 text-emerald-800">{message}</p>}
    {(error || result.error) && <p role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">{error || result.error} <button onClick={result.reload} className="underline">Tải lại đơn</button></p>}
    {result.loading ? <p role="status">Đang tải đơn...</p> : order && <>
      <section className={panel}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="break-all font-mono text-sm font-bold">{order.orderCode}</h2><StatusBadge status={order.status} /></div>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Địa chỉ nhận hàng</dt><dd>{order.deliveryAddress}</dd></div><div><dt className="text-slate-500">Liên hệ</dt><dd>{order.contactPhone}</dd></div><div><dt className="text-slate-500">Ngày đặt</dt><dd>{timestamp(order.createdAt)}</dd></div><div><dt className="text-slate-500">Ngày mong muốn nhận hàng</dt><dd>{order.expectedDeliveryDate ? date(order.expectedDeliveryDate) : 'Không yêu cầu ngày cụ thể'}</dd></div>{order.approvedAt && <div><dt className="text-slate-500">Thời điểm duyệt</dt><dd>{timestamp(order.approvedAt)}</dd></div>}{order.receivedAt && <div><dt className="text-slate-500">Đã xác nhận nhận hàng</dt><dd>{timestamp(order.receivedAt)}</dd></div>}</dl>
        {order.note && <p className="mt-4 whitespace-pre-wrap text-sm">Ghi chú: {order.note}</p>}{order.rejectionReason && <p className="mt-4 text-sm text-rose-700">Lý do từ chối: {order.rejectionReason}</p>}
      </section>
      <OrderAdjustmentProposals orderId={id} onChanged={result.reload} />
      {order.cancellationReason && <p className="rounded-lg bg-rose-50 p-4 text-rose-800">Lý do hủy: {order.cancellationReason} Đối soát tiền thực hiện ngoài hệ thống.</p>}
      <section className={panel}><h2 className="font-bold">Các lô đã đặt</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="border-b text-slate-500"><tr>{['Lô hàng', 'Sản phẩm', 'Khối lượng nguyên lô', 'Giá cả lô', 'Nhận hàng'].map(h => <th key={h} className="py-3 pr-4">{h}</th>)}</tr></thead><tbody className="divide-y">{order.lines.map(l => <tr key={l.batchId}><td className="py-3 pr-4">{l.batchId > 0 ? <Link className="font-semibold text-emerald-700 underline" to={ROUTES.DISTRIBUTOR_LOT_DETAIL.replace(':id', String(l.batchId))}>{l.batchCode}</Link> : l.batchCode}</td><td className="py-3 pr-4">{l.productName}</td><td className="py-3 pr-4">{weight(l.weightKg)} kg{l.originalWeightKg != null && l.originalWeightKg !== l.weightKg && <span className="block text-xs text-slate-500">Ban đầu: {weight(l.originalWeightKg)} kg</span>}</td><td className="py-3 pr-4 font-semibold">{money(l.wholeLotPrice)}{l.originalWholeLotPrice != null && l.originalWholeLotPrice !== l.wholeLotPrice && <span className="block text-xs text-slate-500">Ban đầu: {money(l.originalWholeLotPrice)}</span>}</td><td className="py-3 pr-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${l.isDeliveryRefused ? 'bg-rose-50 text-rose-700' : order.receivedAt ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{l.isDeliveryRefused ? 'Đã từ chối nhận' : order.receivedAt ? 'Đã nhận' : 'Chưa xác nhận'}</span></td></tr>)}</tbody></table></div><p className="mt-4 text-right text-lg font-bold">Tổng: {money(order.totalAmount)}</p><p className="mt-2 text-sm text-slate-500">Thanh toán thực hiện bên ngoài hệ thống.</p></section>
      <OrderDeliveryRefusalPanel orderId={id} orderStatus={order.status} lines={order.lines} receivedAt={order.receivedAt} onChanged={result.reload} receiptMessage={receiptMessage} receiptActions={<>
        {!['DELIVERED', 'RETURNED', 'DELIVERY_REFUSED'].includes(order.status) && !order.receivedAt && <button type="button" disabled={busy || !order.canConfirmReceipt} onClick={() => { setAction('receive'); setError(null) }} className={primary}>{order.status === 'PARTIALLY_REFUSED' ? 'Đã nhận các lô còn lại' : 'Đã nhận đủ hàng'}</button>}
      </>} />
      <section className={panel}><h2 className="font-bold">Tiến trình xử lý</h2><ol className="mt-4 space-y-4">{order.history.map((h, index) => <li key={`${h.changedAt}-${index}`} className="border-l-2 border-emerald-200 pl-4"><p className="text-sm font-semibold">{orderStatuses[h.newStatus] ?? h.newStatus}</p><p className="text-xs text-slate-500">{timestamp(h.changedAt)}</p>{h.reason && <p className="mt-1 text-sm text-slate-600">{h.reason}</p>}</li>)}</ol>{!order.history.length && <p className="mt-3 text-sm text-slate-500">Chưa có lịch sử xử lý.</p>}<button onClick={result.reload} className="mt-4 text-sm font-semibold text-emerald-700">Cập nhật trạng thái</button></section>
      <div className="flex flex-wrap gap-3">{order.canCancel && <button disabled={busy} onClick={() => { setAction('cancel'); setError(null) }} className="rounded-lg border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-700">Hủy đơn hàng</button>}</div>
      {action && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={e => { if (e.target === e.currentTarget && !busy) setAction(null) }}><form onSubmit={e => void perform(e)} role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-label={dialogTitle} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"><h2 id="confirm-title" className="text-lg font-bold">{dialogTitle}</h2><p className="mt-3 text-sm text-slate-600">{dialogBody}</p><div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} onClick={() => setAction(null)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">Quay lại</button><button disabled={busy} className={action === 'cancel' ? 'rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50' : primary}>{busy ? 'Đang xử lý...' : 'Xác nhận'}</button></div></form></div>}
    </>}
  </div>
}
