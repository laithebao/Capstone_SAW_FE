import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { getAdjustmentReview, reviewAdjustment } from '@/services/stockAdjustmentReviewService'
import { issueOperationKey } from '@/services/goodsIssueService'
import { getAuthErrorMessage } from '@/services/authService'
import { AdjustmentStatus } from '@/features/operation/components/StockAdjustmentPresentation'
import { adjustmentTypes } from '@/features/operation/stockAdjustmentFormat'
import ProductBatchStatusBadge from '@/features/operation/components/ProductBatchStatusBadge'
import { issueInput } from '@/features/operation/components/GoodsIssueForm'
import { pickingKg } from '@/features/operation/pickingFormat'
import { PickingStatus } from '@/features/operation/components/PickingPresentation'
import type { AdjustmentReviewDetail } from '@/types/stockAdjustment'

const card = 'space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm'
const time = (v: string | null) => v ? new Date(/(Z|[+-]\d{2}:\d{2})$/.test(v) ? v : v + 'Z').toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa ghi nhận'
export default function WarehouseStockAdjustmentDetailPage() {
  const { id } = useParams()
  return <ReviewContent key={id} id={Number(id)} />
}
function ReviewContent({ id }: { id: number }) {
  const [data, setData] = useState<AdjustmentReviewDetail | null>(null), [loading, setLoading] = useState(true), [reload, setReload] = useState(0)
  const [loadError, setLoadError] = useState(''), [saveError, setSaveError] = useState(''), [success, setSuccess] = useState('')
  const [note, setNote] = useState(''), [busy, setBusy] = useState(false), [needsReload, setNeedsReload] = useState(false)
  const [pending, setPending] = useState<{ decision: 'APPROVE' | 'REJECT'; snapshot: string } | null>(null)
  const current = useRef<AdjustmentReviewDetail | null>(null), explicit = useRef(false), sending = useRef(false)
  const operation = useRef({ payload: '', id: '' })
  useEffect(() => {
    const c = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true); setLoadError('')
      try {
        if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Mã phiếu không hợp lệ.')
        const result = await getAdjustmentReview(id, c.signal)
        if (!c.signal.aborted) {
          if (explicit.current) { setNeedsReload(false); setSaveError(''); explicit.current = false }
          else if (current.current && current.current.reviewSnapshot !== result.reviewSnapshot) setNeedsReload(true)
          current.current = result; setData(result)
        }
      } catch (e) { if (!c.signal.aborted) setLoadError(getAuthErrorMessage(e, 'Không thể tải yêu cầu điều chỉnh.')) }
      finally { if (!c.signal.aborted) setLoading(false) }
    }, 0)
    return () => { c.abort(); clearTimeout(timer) }
  }, [id, reload])
  useEffect(() => { const refresh = () => { if (document.visibilityState === 'visible' && !sending.current) setReload(x => x + 1) }; window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh); return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) } }, [])
  const refresh = () => { if (!sending.current) { explicit.current = true; setPending(null); setReload(x => x + 1) } }
  const save = async () => {
    if (!pending || sending.current || needsReload || loading || !data) return
    if (pending.decision === 'REJECT' && !note.trim()) { setSaveError('Vui lòng nhập lý do từ chối.'); return }
    sending.current = true; setBusy(true); setSaveError(''); setSuccess('')
    const draft = { decision: pending.decision, expectedSnapshot: pending.snapshot, reviewNote: note.trim() || null }
    const payload = JSON.stringify(draft)
    if (operation.current.payload !== payload) operation.current = { payload, id: issueOperationKey() }
    try {
      const result = await reviewAdjustment(id, { ...draft, requestId: operation.current.id })
      current.current = result; setData(result); setPending(null)
      setSuccess(draft.decision === 'APPROVE' ? 'Đã duyệt yêu cầu và cập nhật tồn kho.' : 'Đã từ chối yêu cầu; tồn kho giữ nguyên.')
    } catch (e) {
      setPending(null); setSaveError(getAuthErrorMessage(e, 'Chưa xác định được kết quả. Kiểm tra lại phiếu trước khi thử lại; ghi chú được giữ nguyên.'))
      if (axios.isAxiosError(e) && e.response?.status === 409) setNeedsReload(true)
    } finally { sending.current = false; setBusy(false) }
  }
  const request = data?.request, summary = request?.summary
  const locked = busy || loading || needsReload || !!loadError
  return <div className="space-y-6"><header className="flex flex-wrap justify-between gap-4"><div><p className="text-sm font-semibold text-emerald-700">QUẢN LÝ KHO · PHÊ DUYỆT</p><h1 className="mt-2 text-3xl font-bold">Xem xét yêu cầu điều chỉnh</h1></div><Link className="h-fit rounded-lg border border-slate-300 bg-white px-4 py-2" to={ROUTES.WAREHOUSE_STOCK_ADJUSTMENTS}>Quay lại danh sách</Link></header>
    {loading && <p role="status">Đang tải số liệu...</p>}
    {(loadError || saveError || needsReload) && <div role="alert" className="space-y-2 rounded-lg bg-rose-50 p-4 text-rose-800"><p>{saveError || loadError || 'Số liệu đã thay đổi. Hãy rà soát và tải lại trước khi quyết định.'}</p><p className="text-sm">Ghi chú đang nhập được giữ lại; không tự gửi lại thao tác.</p><button disabled={busy} className="font-semibold underline" onClick={refresh}>Tải lại số liệu</button></div>}
    {success && <p role="status" className="rounded-lg bg-emerald-50 p-4 text-emerald-800">{success}</p>}
    {data && request && summary && <>
      <section className={card}><div className="flex flex-wrap justify-between gap-3"><div><p className="break-all font-mono font-bold text-emerald-700">{summary.adjustmentCode}</p><h2 className="mt-2 text-xl font-bold">{summary.requestKind === 'DISPOSAL' ? 'Loại bỏ toàn bộ lô' : 'Điều chỉnh kiểm đếm'}</h2></div><AdjustmentStatus status={summary.status} /></div>
        <div className="grid gap-4 text-sm sm:grid-cols-2"><p>Lô hàng: <strong className="font-semibold text-emerald-700">{summary.batchCode}</strong> · {summary.productName}</p><ProductBatchStatusBadge status={data.batchStatus} /><p>Người lập: {summary.createdBy}<br />Thời gian: {time(summary.createdAt)}</p><p>Nguyên nhân: {adjustmentTypes[summary.adjustmentType] ?? summary.adjustmentType}</p></div>
        <div><h3 className="font-semibold">Lý do yêu cầu</h3><p className="mt-2 whitespace-pre-wrap break-words">{request.reason}</p></div>
        {summary.requestKind === 'DISPOSAL' && <p className="rounded-lg bg-amber-50 p-3 text-amber-900">Đề nghị loại bỏ {pickingKg(summary.systemQuantity)} tại {request.lines.length} vị trí. Khi duyệt, mọi tồn của lô về 0 và trạng thái lô là Đã loại bỏ. QC, QR và chứng từ được giữ để truy vết.</p>}
        {!data.hasOriginalSnapshot && <p className="text-sm text-amber-800">Phiếu kiểm đếm cũ chưa lưu đầy đủ snapshot. Hệ thống đối chiếu tồn gốc, lượng giữ hiện tại và phiên bản bạn đang xem; không tự tạo bằng chứng quá khứ.</p>}
      </section>
      <section className={card}><h2 className="text-lg font-bold">Đối chiếu tồn khi lập phiếu và hiện tại</h2><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50"><tr>{['Vị trí', 'Tồn lúc lập (kg)', 'Thực đếm / đề nghị sau (kg)', 'Chênh lệch (kg)', 'Tồn hiện tại (kg)', 'Đang giữ (kg)'].map(t => <th key={t} className="p-3">{t}</th>)}</tr></thead><tbody>{Array.from(new Set([...request.lines.map(l => l.inventoryId), ...data.currentStocks.map(i => i.inventoryId)])).map(inventoryId => {
        const original = request.lines.find(l => l.inventoryId === inventoryId), stock = data.currentStocks.find(i => i.inventoryId === inventoryId)
        return <tr key={inventoryId} className="border-t border-slate-100"><td className="p-3">{stock?.locationCode ?? original?.locationCode}{!original && <span className="block text-rose-700">Vị trí mới</span>}</td><td className="p-3">{original ? pickingKg(original.systemQuantity) : 'Không có trong phiếu'}</td><td className="p-3">{original ? pickingKg(original.actualQuantity) : '—'}</td><td className="p-3">{original ? pickingKg(original.differenceQuantity) : '—'}</td><td className="p-3 font-semibold">{stock ? pickingKg(stock.systemQuantityKg) : 'Không còn bản ghi'}</td><td className="p-3">{stock ? pickingKg(stock.reservedQuantityKg) : '—'}</td></tr>
      })}</tbody></table></div>{data.approvalLockReason && summary.status === 'PENDING' && <p role="status" className="rounded-lg bg-amber-50 p-3 text-amber-900">{data.approvalLockReason}</p>}
        {data.reservations.length > 0 && <div><h3 className="font-semibold">Giữ hàng / đơn liên quan</h3><ul className="mt-2 space-y-2 text-sm">{data.reservations.map(r => <li key={r.id}>Đơn {r.orderCode} · #{r.id} · <PickingStatus status={r.status} /> · giữ {pickingKg(r.reservedQuantityKg)}, đã soạn {pickingKg(r.pickedQuantityKg)}</li>)}</ul></div>}
      </section>
      <section className={card}><h2 className="text-lg font-bold">Ảnh bằng chứng</h2>{request.images.length ? <div className="flex flex-wrap gap-3">{request.images.map((i, index) => <a key={i.id} href={i.url} target="_blank" rel="noreferrer"><img className="h-36 w-48 rounded-lg object-cover" src={i.url} alt={`Bằng chứng ${index + 1}`} /></a>)}</div> : <p className="text-slate-500">Không có ảnh bằng chứng.</p>}</section>
      <section className={card}>{summary.status === 'PENDING' ? <><h2 className="text-lg font-bold">Quyết định của quản lý kho</h2><label className="block text-sm">Ghi chú duyệt / lý do từ chối<textarea aria-label="Ghi chú quyết định" disabled={busy} maxLength={1000} className={issueInput} rows={4} value={note} onChange={e => setNote(e.target.value)} /></label><div className="flex flex-wrap justify-end gap-3"><button disabled={locked || !data.canReject} className="rounded-lg border border-rose-300 px-4 py-2 text-rose-700 disabled:opacity-50" onClick={() => setPending({ decision: 'REJECT', snapshot: data.reviewSnapshot })}>Từ chối yêu cầu</button><button disabled={locked || !data.canApprove} className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-50" onClick={() => setPending({ decision: 'APPROVE', snapshot: data.reviewSnapshot })}>Duyệt yêu cầu</button></div></> : <><h2 className="text-lg font-bold">Kết quả xử lý</h2><p>Người xử lý: {request.reviewedBy ?? 'Chưa ghi nhận'}</p><p>Thời gian: {time(request.reviewedAt)}</p><p className="whitespace-pre-wrap break-words">Ghi chú: {request.reviewNote ?? 'Không có'}</p><p className="text-sm text-slate-500">Phiếu đã xử lý chỉ được xem.</p></>}</section>
    </>}
    {pending && summary && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form role="dialog" aria-modal="true" aria-label="Xác nhận quyết định" className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-xl" onSubmit={e => { e.preventDefault(); void save() }}><h2 className="text-xl font-bold">{pending.decision === 'REJECT' ? 'Từ chối yêu cầu?' : summary.requestKind === 'DISPOSAL' ? 'Duyệt loại bỏ toàn bộ lô?' : 'Duyệt kết quả kiểm đếm?'}</h2><p>{summary.batchCode} · {summary.requestKind === 'DISPOSAL' ? `${pickingKg(summary.systemQuantity)} tại ${request!.lines.length} vị trí` : `Tồn từ ${pickingKg(summary.systemQuantity)} thành ${pickingKg(summary.actualQuantity)}`}</p><p>{pending.decision === 'REJECT' ? 'Tồn và trạng thái lô không thay đổi.' : summary.requestKind === 'DISPOSAL' ? 'Toàn bộ tồn về 0, lô chuyển Đã loại bỏ. Thao tác được ghi lịch sử.' : 'Tồn được gán bằng số thực đếm sau khi kiểm tra sức chứa và lượng giữ.'}</p>{pending.decision === 'REJECT' && <label className="block">Lý do từ chối<textarea aria-label="Lý do từ chối" required disabled={busy} maxLength={1000} rows={3} className={issueInput} value={note} onChange={e => setNote(e.target.value)} /></label>}<div className="flex justify-end gap-3"><button type="button" disabled={busy} className="rounded-lg border border-slate-300 px-4 py-2" onClick={() => setPending(null)}>Quay lại</button><button disabled={busy || locked || (pending.decision === 'REJECT' && !note.trim())} className="rounded-lg bg-emerald-700 px-4 py-2 text-white disabled:opacity-50">{busy ? 'Đang xử lý...' : 'Xác nhận quyết định'}</button></div></form></div>}
  </div>
}
