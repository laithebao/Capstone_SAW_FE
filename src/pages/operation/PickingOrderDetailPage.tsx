import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { confirmPicking, getPickingOrder } from '@/services/pickingService'
import { getAuthErrorMessage } from '@/services/authService'
import { PickingStatus } from '@/features/operation/components/PickingPresentation'
import { pickingDate, pickingKg, pickingTime } from '@/features/operation/pickingFormat'
import type { ConfirmPickingRequest, PickingOrderDetail, PickingOrderLine, PickingReservation } from '@/types/picking'

type Draft = { quantity: string; note: string; expected: number }
const input = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500'
// getRandomValues is also available on LAN HTTP; the request key is not an authentication token.
const operationKey = () => '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, char =>
  (Number(char) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(char) / 4).toString(16))
export default function PickingOrderDetailPage() {
  const { id } = useParams()
  const orderId = Number(id)
  const valid = Number.isSafeInteger(orderId) && orderId > 0
  const [detail, setDetail] = useState<PickingOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [success, setSuccess] = useState('')
  const [reload, setReload] = useState(0)
  const [drafts, setDrafts] = useState<Record<number, Draft>>({})
  const [pending, setPending] = useState<ConfirmPickingRequest | null>(null)
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const attempts = useRef<Record<number, ConfirmPickingRequest>>({})
  useEffect(() => {
    if (!valid) return
    const controller = new AbortController()
    let generation = 0
    const load = async (first = false) => {
      const current = ++generation
      if (first) setLoading(true)
      try {
        const response = await getPickingOrder(orderId, controller.signal)
        if (!controller.signal.aborted && current === generation) { setDetail(response); setLoadError('') }
      } catch (e) {
        if (!controller.signal.aborted && current === generation) setLoadError(getAuthErrorMessage(e, 'Không thể tải chi tiết đơn chờ soạn.'))
      } finally { if (!controller.signal.aborted && current === generation) setLoading(false) }
    }
    const timer = window.setTimeout(() => void load(true), 0)
    const focus = () => { if (!submitting.current) void load() }
    window.addEventListener('focus', focus)
    return () => { controller.abort(); window.clearTimeout(timer); window.removeEventListener('focus', focus) }
  }, [orderId, valid, reload])
  const edit = (reservation: PickingReservation, field: 'quantity' | 'note', value: string) => {
    setDrafts(old => ({ ...old, [reservation.id]: { ...(old[reservation.id] ?? { quantity: '', note: '', expected: reservation.pickedQuantityKg }), [field]: value } }))
    setSuccess('')
  }
  const prepare = (line: PickingOrderLine, reservation: PickingReservation) => {
    const draft = drafts[reservation.id]
    const amount = Number(draft?.quantity)
    if (!draft?.quantity.trim() || !Number.isFinite(amount) || amount <= 0 || !/^\d+(\.\d{1,3})?$/.test(draft.quantity)
      || amount > reservation.reservedQuantityKg - reservation.pickedQuantityKg || draft.note.trim().length > 1000) {
      setSaveError('Nhập lượng soạn lần này lớn hơn 0, tối đa 3 số thập phân và không vượt lượng còn cần soạn. Ghi chú tối đa 1000 ký tự.'); return
    }
    if (draft.expected !== reservation.pickedQuantityKg) { setSaveError('Dữ liệu đã thay đổi. Vui lòng tải lại để rà soát trước khi xác nhận.'); return }
    const fields = { reservationId: reservation.id, orderDetailId: line.id, inventoryId: reservation.inventoryId,
      productBatchId: reservation.productBatchId, quantityKg: amount, expectedPickedQuantityKg: draft.expected, note: draft.note.trim() || null }
    const previous = attempts.current[reservation.id]
    const same = previous && Object.entries(fields).every(([key, value]) => previous[key as keyof ConfirmPickingRequest] === value)
    const request = { ...fields, requestId: same ? previous.requestId : operationKey() }
    attempts.current[reservation.id] = request
    setPending(request); setSaveError('')
  }
  const save = async () => {
    if (!pending || submitting.current) return
    submitting.current = true; setBusy(true); setSaveError(''); setSuccess('')
    try {
      const response = await confirmPicking(orderId, pending)
      setDetail(response); setLoadError(''); setPending(null)
      setDrafts(old => { const next = { ...old }; delete next[pending.reservationId]; return next })
      setSuccess('Đã xác nhận soạn hàng. Tồn kho chưa giảm; chỉ giảm khi phiếu xuất được xác nhận ở bước sau.')
    } catch (e) {
      setSaveError(getAuthErrorMessage(e, 'Chưa xác định được kết quả lưu. Giữ nguyên dữ liệu và thử lại cùng thao tác, hoặc tải lại để kiểm tra.'))
      setPending(null) // Keep draft + operation key; retry is safe even if the previous response was lost.
    } finally { submitting.current = false; setBusy(false) }
  }
  const refresh = () => {
    if (Object.keys(drafts).length && !window.confirm('Tải lại sẽ xóa nội dung chưa lưu để dùng số liệu mới nhất. Tiếp tục?')) return
    setLoading(true); setDrafts({}); setPending(null); setSaveError(''); setSuccess(''); attempts.current = {}; setReload(x => x + 1)
  }
  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-emerald-700">VẬN HÀNH · SOẠN HÀNG</p><h1 className="mt-1 text-3xl font-bold text-slate-950">CHI TIẾT ĐƠN SOẠN HÀNG</h1></div><Link to={ROUTES.OPERATION_PICKING_ORDERS} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm">← Danh sách chờ soạn</Link></header>
    {!valid ? <p role="alert" className="text-rose-700">Mã đơn không hợp lệ.</p> : <>
      {loading && <p role="status">Đang tải chi tiết đơn...</p>}
      {(loadError || saveError) && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><p>{saveError || loadError}</p><p className="mt-2">Nội dung đang nhập được giữ lại. Không tự gửi lại thao tác.</p><button disabled={busy} type="button" className="mt-2 font-semibold underline" onClick={refresh}>Tải lại dữ liệu</button></div>}
      {success && <p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}
      {!loading && detail && <>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="min-w-0 break-all font-mono text-xl font-bold text-emerald-700">{detail.order.orderCode}</h2><PickingStatus status={detail.order.status} /></div>
          <p className="mt-3 break-words text-slate-700">Nhà phân phối: <strong>{detail.order.distributorName}</strong></p><p className="mt-2 text-sm text-slate-500">Duyệt: {pickingTime(detail.order.approvedAt)} · Giao dự kiến: {pickingDate(detail.order.expectedDeliveryDate)}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm"><p>Được duyệt: <strong>{pickingKg(detail.order.approvedWeightKg)}</strong></p><p>Đã giữ: <strong>{pickingKg(detail.order.reservedWeightKg)}</strong></p><p>Tổng đã soạn: <strong>{pickingKg(detail.order.pickedWeightKg)}</strong></p></div>
          {detail.order.pickingLockReason && <p role="status" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{detail.order.pickingLockReason}</p>}
          <button disabled={busy} onClick={refresh} className="mt-4 text-sm font-semibold text-emerald-700 underline">Tải lại dữ liệu</button>
        </section>
        {detail.lines.map(line => <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" key={line.id} aria-label={`Dòng hàng ${line.cropName}`}>
          <h2 className="text-lg font-bold text-slate-900">{line.cropName}</h2><p className="text-sm text-slate-500">Duyệt {pickingKg(line.approvedWeightKg)} · Giữ {pickingKg(line.reservedWeightKg)} · Đã soạn {pickingKg(line.pickedWeightKg)}</p>
          {line.requestedProductBatchId && <p className="break-words text-sm text-slate-600">Lô đã duyệt: <Link className="break-all font-mono font-semibold text-emerald-700 underline" to={ROUTES.OPERATION_PRODUCT_BATCH_DETAIL.replace(':id', String(line.requestedProductBatchId))}>{line.requestedBatchCode ?? `#${line.requestedProductBatchId}`}</Link>{line.productName && ` · ${line.productName}`}</p>}
          {!line.reservations.length && <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">Chưa có phần giữ hàng cho dòng này. Chờ hệ thống/quản lý kho phân bổ.</p>}
          {line.reservations.map(reservation => {
            const draft = drafts[reservation.id]
            const stale = !!draft && draft.expected !== reservation.pickedQuantityKg
            const locked = busy || !detail.order.canPick || !reservation.canPick || !!loadError || stale
            return <article key={reservation.id} className="rounded-xl border border-slate-200 p-4" aria-label={`Phần giữ hàng ${reservation.id}`}>
              <div className="flex flex-wrap justify-between gap-3"><div className="min-w-0"><Link className="break-all font-mono font-semibold text-emerald-700 underline" to={ROUTES.OPERATION_PRODUCT_BATCH_DETAIL.replace(':id', String(reservation.productBatchId))}>{reservation.batchCode}</Link><p className="mt-1 break-words text-sm text-slate-700">{reservation.productName}</p></div><PickingStatus status={reservation.status} /></div>
              <p className="mt-3 text-sm text-slate-500">Vị trí: <strong>{reservation.locationName}</strong> · Hạn sử dụng: {pickingDate(reservation.expiryDate)}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm"><p>Đã giữ: <strong>{pickingKg(reservation.reservedQuantityKg)}</strong></p><p>Tổng đã soạn: <strong>{pickingKg(reservation.pickedQuantityKg)}</strong></p><p>Còn cần soạn: <strong className="text-emerald-700">{pickingKg(Math.max(0, reservation.reservedQuantityKg - reservation.pickedQuantityKg))}</strong></p></div>
              {reservation.pickingLockReason && <p className="mt-3 text-sm text-amber-800">{reservation.pickingLockReason}</p>}
              {stale && <p role="alert" className="mt-3 text-sm font-semibold text-rose-700">Lượng đã soạn đã thay đổi. Nội dung cũ được giữ lại để đối chiếu; hãy tải lại trước khi lưu.</p>}
              {(reservation.canPick || draft) && <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); prepare(line, reservation) }}>
                <label className="space-y-2 text-sm">Lượng soạn lần này (kg)<input aria-label={`Lượng soạn lần này ${reservation.id}`} className={input} disabled={locked} type="number" min="0.001" step="0.001" max={reservation.reservedQuantityKg - reservation.pickedQuantityKg} required value={draft?.quantity ?? ''} onChange={e => edit(reservation, 'quantity', e.target.value)} /></label>
                <label className="space-y-2 text-sm">Ghi chú lần soạn<textarea aria-label={`Ghi chú soạn ${reservation.id}`} rows={2} className={input} disabled={locked} maxLength={1000} value={draft?.note ?? ''} onChange={e => edit(reservation, 'note', e.target.value)} /></label>
                <div className="sm:col-span-2 sm:text-right"><button disabled={locked} className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Xác nhận soạn hàng</button></div>
              </form>}
              <h3 className="mt-5 text-sm font-semibold text-slate-700">Lịch sử soạn hàng</h3>
              {!reservation.history.length ? <p className="mt-2 text-sm text-slate-500">Chưa có lần soạn hàng.</p> : <ol className="mt-2 space-y-2">{reservation.history.map(history => <li className="rounded-lg bg-slate-50 p-3 text-sm" key={history.id}><p><strong>{pickingKg(history.quantityKg)}</strong> · {pickingTime(history.pickedAt)} · {history.pickedByName}</p>{history.note && <p className="mt-1 whitespace-pre-wrap break-words text-slate-600">{history.note}</p>}</li>)}</ol>}
            </article>
          })}
        </section>)}
      </>}
    </>}
    {pending && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="picking-confirm-title" className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"><h2 id="picking-confirm-title" className="text-lg font-bold">Xác nhận đã soạn hàng thực tế?</h2><p className="mt-3 text-sm text-slate-700">Ghi nhận thêm <strong>{pickingKg(pending.quantityKg)}</strong> cho phần giữ hàng #{pending.reservationId}.</p><p className="mt-2 text-sm text-slate-500">Thao tác được lưu vào lịch sử, chưa giảm tồn kho và chưa xác nhận xuất kho.</p><div className="mt-6 flex justify-end gap-3"><button disabled={busy} onClick={() => setPending(null)} className="rounded-lg border border-slate-200 px-4 py-2">Quay lại</button><button disabled={busy} onClick={() => void save()} className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'Đang lưu...' : 'Xác nhận'}</button></div></section></div>}
  </div>
}
