import { useCallback, useEffect, useRef, useState } from 'react'
import { getOrderAdjustments, respondToAdjustment } from '@/services/adjustmentResolutionService'
import { getAuthErrorMessage } from '@/services/authService'
import { issueOperationKey } from '@/services/goodsIssueService'
import type { AdjustmentProposal, AdjustmentResolution } from '@/types/stockAdjustment'
import { money, panel } from './format'

const states: Record<string, string> = { PENDING_MANAGER: 'Kho đang kiểm tra', PENDING_CUSTOMER: 'Chờ bạn phản hồi', CUSTOMER_ACCEPTED: 'Bạn đã đồng ý — chờ quản lý kho duyệt', ORDER_CANCELLED: 'Đơn đã hủy — chờ kho xử lý tồn', CUSTOMER_DECLINED: 'Đơn đã hủy — kho tiếp tục xử lý tồn', REJECTED_HELD: 'Kho cần kiểm tra lại — đơn chưa được tiếp tục', REPLACED: 'Đã có hồ sơ kiểm tra thay thế', RESOLVED: 'Kho đã xử lý', CLEARED: 'Kho đã xác minh xong' }
const proposalStates: Record<string, string> = { SENT: 'Chờ phản hồi', ACCEPTED: 'Bạn đã đồng ý', DECLINED: 'Bạn đã từ chối', WITHDRAWN: 'Đã rút', FINALIZED: 'Đã có hiệu lực' }

export default function OrderAdjustmentProposals({ orderId, onChanged }: { orderId: number; onChanged: () => void }) {
  const [data, setData] = useState<AdjustmentResolution[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(true)
  const [reason, setReason] = useState(''), [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<{ resolution: AdjustmentResolution; proposal: AdjustmentProposal; decision: 'ACCEPT' | 'DECLINE' | 'WITHDRAW' } | null>(null)
  const sending = useRef(false), key = useRef({ payload: '', id: '' })
  const load = useCallback(async (signal?: AbortSignal) => {
    try { const rows = await getOrderAdjustments(orderId, signal); if (!signal?.aborted) { setData(rows); setError('') } }
    catch (e) { if (!signal?.aborted) setError(getAuthErrorMessage(e, 'Không tải được thông tin kiểm tra lô của đơn.')) }
    finally { if (!signal?.aborted) setLoading(false) }
  }, [orderId])
  useEffect(() => { const c = new AbortController(); const timer = setTimeout(() => void load(c.signal), 0); return () => { clearTimeout(timer); c.abort() } }, [load])
  useEffect(() => { const focus = () => { if (!sending.current) void load() }; window.addEventListener('focus', focus); return () => window.removeEventListener('focus', focus) }, [load])
  async function respond() {
    if (!pending || sending.current) return
    const request = { expectedVersion: pending.resolution.version, proposalId: pending.proposal.id, revision: pending.proposal.revision, decision: pending.decision, reason: reason.trim() || null }
    const payload = JSON.stringify(request)
    if (key.current.payload !== payload) key.current = { payload, id: issueOperationKey() }
    sending.current = true; setBusy(true); setError('')
    try { const rows = await respondToAdjustment(orderId, { ...request, requestId: key.current.id }); setData(rows); setPending(null); onChanged() }
    catch (e) { setError(getAuthErrorMessage(e, 'Chưa lưu được phản hồi. Giữ nguyên nội dung; tải lại để kiểm tra phiên bản.')) }
    finally { sending.current = false; setBusy(false) }
  }
  if (!loading && !error && !data.length) return null
  return <section className={panel}><h2 className="font-bold">Kiểm tra lô và đề xuất thay đổi đơn</h2>{loading && <p role="status">Đang tải đề xuất…</p>}{error && <div role="alert" className="mt-3 text-rose-700">{error}<button disabled={busy} onClick={() => void load()} className="ml-2 underline">Tải lại đề xuất</button></div>}
    {data.map(r => <div key={r.adjustmentId} className="mt-4 space-y-3"><h3 className="font-semibold">Lô {r.batchCode ?? "—"} · {r.productName}</h3><p className="rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">{states[r.state] ?? r.state}</p>{r.proposals.map(p => <article key={p.id} className="space-y-3 rounded-lg border border-slate-200 p-4"><h3 className="font-semibold">Đề xuất điều chỉnh · {proposalStates[p.status] ?? p.status}</h3><dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt>Khối lượng nguyên lô</dt><dd>{p.originalWeightKg} kg → <strong>{p.proposedWeightKg} kg</strong></dd></div><div><dt>Giá cả lô</dt><dd>{money(p.originalWholeLotPrice)} → <strong>{money(p.proposedWholeLotPrice)}</strong></dd></div><div><dt>Tổng đơn</dt><dd>{money(p.originalOrderTotal)} → {money(p.proposedOrderTotal)}</dd></div><div><dt>Chênh lệch đối soát bên ngoài</dt><dd>{money(p.proposedOrderTotal - p.originalOrderTotal)}</dd></div></dl><p className="whitespace-pre-wrap">{p.customerMessage}</p>{p.responseReason && <p>Phản hồi của bạn: {p.responseReason}</p>}{p.withdrawalReason && <p>Lý do thu hồi: {p.withdrawalReason}</p>}<p className="text-sm text-slate-500">{p.status === 'FINALIZED' ? 'Kho đã phê duyệt. Khối lượng và giá điều chỉnh đã có hiệu lực.' : p.status === 'DECLINED' ? 'Bạn đã từ chối và đơn đã hủy. Kho xử lý số lượng tồn riêng.' : 'Đồng ý chưa làm đổi giá hoặc lượng giao cho tới khi kho phê duyệt cuối. Từ chối sẽ hủy toàn đơn.'} Thanh toán/hoàn tiền xử lý ngoài hệ thống.</p><div className="flex flex-wrap gap-3">{(p.status === 'SENT' ? ['ACCEPT', 'DECLINE'] as const : p.status === 'ACCEPTED' ? ['WITHDRAW'] as const : []).map(decision => <button disabled={busy} key={decision} onClick={() => { setPending({ resolution: r, proposal: p, decision }); setReason('') }} className={decision === 'ACCEPT' ? 'rounded-lg bg-emerald-700 px-4 py-2 text-white' : 'rounded-lg border border-rose-300 px-4 py-2 text-rose-700'}>{decision === 'ACCEPT' ? 'Đồng ý đề xuất' : decision === 'DECLINE' ? 'Từ chối và hủy đơn' : 'Rút đồng ý trước khi kho duyệt'}</button>)}</div></article>)}</div>)}
    {pending && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form role="dialog" aria-modal="true" aria-label="Xác nhận phản hồi đề xuất" className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6" onSubmit={e => { e.preventDefault(); void respond() }}><h3 className="text-lg font-bold">Xác nhận phản hồi đề xuất</h3><p>{pending.decision === 'DECLINE' ? 'Hủy toàn bộ đơn và nhả giữ hàng. Kho vẫn phải xử lý tồn riêng; đây không phải xác nhận đã hoàn tiền.' : pending.decision === 'ACCEPT' ? 'Đồng ý khối lượng và giá nguyên lô đề xuất. Chờ quản lý kho phê duyệt cuối.' : 'Rút đồng ý, đơn tiếp tục tạm dừng. Kho cần gửi lại đề xuất để bạn xác nhận.'}</p><label className="block">Lý do {pending.decision !== 'ACCEPT' && '(bắt buộc)'}<textarea autoFocus required={pending.decision !== 'ACCEPT'} disabled={busy} maxLength={1000} rows={3} value={reason} onChange={e => setReason(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 p-3" /></label><div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={() => setPending(null)}>Quay lại</button><button disabled={busy || pending.decision !== 'ACCEPT' && !reason.trim()} className="rounded-lg bg-emerald-700 px-4 py-2 text-white disabled:opacity-50">{busy ? 'Đang gửi…' : 'Xác nhận phản hồi'}</button></div></form></div>}
  </section>
}
