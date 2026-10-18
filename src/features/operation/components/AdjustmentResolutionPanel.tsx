import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { actOnAdjustment, type ProposalAction } from '@/services/adjustmentResolutionService'
import { issueOperationKey } from '@/services/goodsIssueService'
import { getAuthErrorMessage } from '@/services/authService'
import type { AdjustmentDetail } from '@/types/stockAdjustment'
import { issueInput } from './GoodsIssueForm'

const resolutionStates: Record<string, string> = { PENDING_MANAGER: 'Chờ quản lý kho', PENDING_CUSTOMER: 'Chờ khách phản hồi', CUSTOMER_ACCEPTED: 'Khách đã đồng ý — chờ quản lý duyệt điều chỉnh', ORDER_CANCELLED: 'Đơn đã hủy — chờ kho xử lý tồn', CUSTOMER_DECLINED: 'Đơn đã hủy — chờ duyệt điều chỉnh tồn', REJECTED_HELD: 'Phiếu bị từ chối — lô vẫn tạm dừng', REPLACED: 'Đã có phiếu thay thế', RESOLVED: 'Đã xử lý', CLEARED: 'Đã xác minh báo cáo sai' }
const proposalStates: Record<string, string> = { DRAFT: 'Nháp', SENT: 'Đã gửi khách', ACCEPTED: 'Khách đồng ý', DECLINED: 'Khách từ chối', WITHDRAWN: 'Đã thu hồi', FINALIZED: 'Đã có hiệu lực' }
const money = (value: number) => value.toLocaleString('vi-VN') + ' đ'

export default function AdjustmentResolutionPanel({ data, manager = false, snapshot, onChanged }: { data: AdjustmentDetail; manager?: boolean; snapshot?: string; onChanged?: () => void }) {
  const r = data.resolution
  const [price, setPrice] = useState(''), [message, setMessage] = useState(''), [reason, setReason] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [action, setAction] = useState<ProposalAction['action'] | null>(null)
  const key = useRef({ payload: '', value: '' }), sending = useRef(false)
  if (!r) return null
  const current = r.proposals[0], live = current && ['SENT', 'ACCEPTED', 'DRAFT'].includes(current.status)
  const isCoordinator = !r.coordinatingAdjustmentId || r.coordinatingAdjustmentId === data.summary.id
  const canPropose = manager && isCoordinator && data.summary.status === 'PENDING' && data.summary.requestKind === 'COUNT' && r.order
  async function perform() {
    if (!r || !action || sending.current) return
    const request = { expectedVersion: r.version, action, ...(action === 'SAVE' || action === 'SEND' ? { wholeLotPrice: Number(price), message } : { reason }), ...(current ? { proposalId: current.id } : {}), ...(['CLEAR', 'SAVE', 'SEND'].includes(action) ? { expectedSnapshot: snapshot } : {}) }
    const payload = JSON.stringify(request)
    if (key.current.payload !== payload) key.current = { payload, value: issueOperationKey() }
    sending.current = true; setBusy(true); setError('')
    try { await actOnAdjustment(data.summary.id, { ...request, requestId: key.current.value }); setAction(null); onChanged?.() }
    catch (e) { setError(getAuthErrorMessage(e, 'Không thể lưu quyết định. Nội dung được giữ; hãy tải lại hồ sơ trước khi thử lại.')) }
    finally { sending.current = false; setBusy(false) }
  }
  return <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Xử lý lô và đơn liên quan</h2><p className={'rounded-lg p-3 font-semibold ' + (['RESOLVED', 'CLEARED'].includes(r.state) ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900')}>{resolutionStates[r.state] ?? r.state}</p>
    {!isCoordinator && <Link className="font-semibold text-emerald-700 underline" to={(manager ? ROUTES.WAREHOUSE_STOCK_ADJUSTMENT_DETAIL : ROUTES.OPERATION_STOCK_ADJUSTMENT_DETAIL).replace(':id', String(r.coordinatingAdjustmentId))}>Mở phiếu đầu mối để xem quyết định chung</Link>}
    {data.summary.requestKind === 'COUNT' && !!r.counts?.length && <div className="space-y-2 text-sm"><h3 className="font-semibold">Phạm vi kiểm đếm sẽ xử lý cùng nhau</h3>{r.counts.map(c => <p key={c.id} className="break-all">{c.code}: {c.systemQuantity} kg → {c.actualQuantity} kg</p>)}<p>Tổng hao hụt ghi nhận: {r.counts.reduce((total, c) => total + c.systemQuantity - c.actualQuantity, 0)} kg. Các vị trí khác của lô được giữ nguyên.</p></div>}
    {r.replacesStockAdjustmentId && <Link className="block text-sm font-semibold text-emerald-700 underline" to={(manager ? ROUTES.WAREHOUSE_STOCK_ADJUSTMENT_DETAIL : ROUTES.OPERATION_STOCK_ADJUSTMENT_DETAIL).replace(':id', String(r.replacesStockAdjustmentId))}>Xem phiếu gốc được thay thế</Link>}
    {r.replacementAdjustmentId && <Link className="block text-sm font-semibold text-emerald-700 underline" to={(manager ? ROUTES.WAREHOUSE_STOCK_ADJUSTMENT_DETAIL : ROUTES.OPERATION_STOCK_ADJUSTMENT_DETAIL).replace(':id', String(r.replacementAdjustmentId))}>Mở phiếu thay thế đang xử lý</Link>}
    {r.resolutionReason && <p className="whitespace-pre-wrap text-sm">Kết luận kiểm tra: {r.resolutionReason}</p>}
    {r.updatedAt && <p className="text-xs text-slate-500">Cập nhật: {new Date(r.updatedAt.endsWith('Z') ? r.updatedAt : r.updatedAt + 'Z').toLocaleString('vi-VN')} · {r.updatedBy ?? 'Chưa ghi nhận'}</p>}
    {r.order && <p>Đơn <strong>{r.order.orderCode}</strong> · {r.order.weightKg.toLocaleString('vi-VN')} kg · {money(r.order.wholeLotPrice)}. {r.order.status === 'CANCELLED' ? 'Đơn đã hủy — không tiếp tục soạn.' : r.state === 'RESOLVED' ? 'Tồn và giá đã được cập nhật theo quyết định duyệt.' : 'Tồn và giá chỉ đổi khi quản lý phê duyệt cuối.'}</p>}
    {r.proposals.map(p => <article key={p.id} className="space-y-2 rounded-lg border border-slate-200 p-4"><h3 className="font-semibold">Đề xuất điều chỉnh · {proposalStates[p.status] ?? p.status}</h3><p>{p.originalWeightKg} kg → {p.proposedWeightKg} kg; giá cả lô {money(p.originalWholeLotPrice)} → {money(p.proposedWholeLotPrice)}</p><p>Tổng đơn: {money(p.originalOrderTotal)} → {money(p.proposedOrderTotal)}</p><p className="whitespace-pre-wrap">{p.customerMessage}</p>{p.responseReason && <p>Khách phản hồi: {p.responseReason}</p>}{p.withdrawalReason && <p>Lý do rút: {p.withdrawalReason}</p>}</article>)}
    {canPropose && r.order && ['APPROVED', 'RESERVED'].includes(r.order.status) && r.state === 'PENDING_MANAGER' && <div className="grid gap-4 sm:grid-cols-2"><label>Giá nguyên phần lô còn lại (đ)<input aria-label="Giá đề xuất nguyên lô" type="number" min="0.01" step="0.01" disabled={busy} value={price} onChange={e => setPrice(e.target.value)} className={issueInput} /></label><label>Nội dung gửi khách (lượng còn lại đã kiểm tra đủ điều kiện giao)<textarea aria-label="Nội dung đề xuất" maxLength={1000} disabled={busy} value={message} onChange={e => setMessage(e.target.value)} className={issueInput} /></label><div className="flex flex-wrap gap-3 sm:col-span-2">{(['SAVE', 'SEND'] as const).map(a => <button key={a} disabled={busy || Number(price) <= 0 || !message.trim()} className="rounded-lg bg-emerald-700 px-4 py-2 text-white disabled:opacity-50" onClick={() => setAction(a)}>{a === 'SAVE' ? 'Lưu nháp đề xuất' : 'Gửi đề xuất'}</button>)}</div></div>}
    {manager && isCoordinator && (live || r.state === 'REJECTED_HELD') && <div className="space-y-3"><p className="text-xs text-slate-500">Lý do thu hồi đề xuất sẽ được gửi cho khách. Căn cứ xác minh báo cáo sai chỉ lưu nội bộ.</p><label className="block">Lý do thu hồi / kết luận kiểm tra<textarea className={issueInput} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} disabled={busy} /></label><div className="flex flex-wrap gap-3">{live && data.summary.status === 'PENDING' && <button disabled={busy || !reason.trim()} className="rounded-lg border px-4 py-2 disabled:opacity-50" onClick={() => setAction('WITHDRAW')}>Thu hồi đề xuất</button>}{r.state === 'REJECTED_HELD' && <button disabled={busy || !reason.trim()} className="rounded-lg border px-4 py-2 disabled:opacity-50" onClick={() => setAction('CLEAR')}>Xác minh không có hao hụt / hỏng</button>}</div></div>}
    {r.state === 'REJECTED_HELD' && !manager && <Link className="font-semibold text-emerald-700 underline" to={ROUTES.OPERATION_STOCK_ADJUSTMENT_CREATE + '?batchId=' + data.summary.productBatchId + '&kind=' + data.summary.requestKind + '&replaces=' + data.summary.id}>Lập phiếu thay thế sau kiểm tra</Link>}
    {error && <div role="alert" className="text-rose-700">{error}<button onClick={onChanged} disabled={busy} className="ml-2 underline">Tải lại hồ sơ</button></div>}
    {action && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div role="dialog" aria-modal="true" aria-label="Xác nhận xử lý đề xuất" className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6"><h3 className="text-lg font-bold">Xác nhận quyết định</h3><p>{action === 'CLEAR' ? 'Chỉ kết luận báo cáo sai khi đã kiểm tra không có hao hụt/hỏng. Không phục hồi đơn đã hủy.' : action === 'SEND' ? 'Xác nhận phần hàng còn lại đã được kiểm tra đủ điều kiện giao trước khi gửi giá nguyên lô mới cho khách. Tồn và giá đơn chưa đổi.' : action === 'WITHDRAW' ? 'Thu hồi đề xuất này. Khách phải đồng ý lại nếu gửi đề xuất mới.' : 'Lưu nháp, chưa gửi khách.'}</p><div className="flex justify-end gap-3"><button autoFocus disabled={busy} onClick={() => setAction(null)}>Quay lại</button><button className="rounded-lg bg-emerald-700 px-4 py-2 text-white" disabled={busy} onClick={() => void perform()}>{busy ? 'Đang xử lý…' : 'Xác nhận'}</button></div></div></div>}
  </section>
}
