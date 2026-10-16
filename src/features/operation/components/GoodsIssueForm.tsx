import { useRef, useState } from 'react'
import type { GoodsIssueDetail, GoodsIssueDraft, GoodsIssueOrder } from '@/types/goodsIssue'
import { pickingDate, pickingKg } from '@/features/operation/pickingFormat'
import { getAuthErrorMessage } from '@/services/authService'
import { issueOperationKey } from '@/services/goodsIssueService'

export const issueInput = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100'
export function GoodsIssueStatus({ status }: { status: string }) {
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${status === 'COMMITTED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{status === 'COMMITTED' ? 'Đã xác nhận xuất kho' : 'Phiếu nháp'}</span>
}
export default function GoodsIssueForm({ order, existing, disabled, onSave }: { order: GoodsIssueOrder; existing?: GoodsIssueDetail; disabled?: boolean; onSave: (draft: GoodsIssueDraft, key: string) => Promise<void> }) {
  const [today] = useState(() => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10))
  const [date, setDate] = useState(existing?.summary.issuedDate ?? today)
  const [receiver, setReceiver] = useState(existing?.receiverName ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [amounts, setAmounts] = useState<Record<number, string>>(Object.fromEntries(existing?.lines.map(l => [l.reservationId, String(l.weightInKg)]) ?? []))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const sending = useRef(false)
  const attempt = useRef<{ payload: string; key: string } | null>(null)
  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (sending.current || disabled) return
    const selected = Object.entries(amounts).filter(([, value]) => value.trim())
    if (!selected.length || selected.some(([id, value]) => !/^\d+(\.\d{1,3})?$/.test(value) || Number(value) <= 0 || !order.allocations.some(a => a.reservationId === Number(id) && a.canIssue && Number(value) <= Math.min(a.remainingWeightKg, a.quantityOnHandKg)))) {
      setError('Chọn ít nhất một dòng; nhập kg lớn hơn 0, tối đa 3 số thập phân và không vượt lượng còn được xuất.'); return
    }
    const draft = { issuedDate: date, receiverName: receiver.trim() || null, note: note.trim() || null, lines: selected.map(([id, value]) => ({ reservationId: Number(id), weightInKg: Number(value) })) }
    const payload = JSON.stringify(draft)
    if (attempt.current?.payload !== payload) attempt.current = { payload, key: issueOperationKey() }
    sending.current = true; setBusy(true); setError('')
    try { await onSave(draft, attempt.current.key) }
    catch (e) { setError(getAuthErrorMessage(e, 'Chưa xác định được kết quả lưu. Giữ nguyên dữ liệu; tải lại danh sách kiểm tra trước khi thử lại.')) }
    finally { sending.current = false; setBusy(false) }
  }
  return <form onSubmit={save} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div><h2 className="text-lg font-bold">{existing ? 'Chỉnh sửa phiếu nháp' : 'Thông tin phiếu xuất nháp'}</h2><p className="mt-1 text-sm text-slate-500">{order.orderCode} · {order.distributorName}. Lưu nháp chưa giảm tồn hoặc lượng giữ.</p></div>
    <fieldset disabled={busy || disabled} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2"><label className="space-y-2 text-sm">Ngày xuất<input required type="date" aria-label="Ngày xuất" value={date} max={today} className={issueInput} onChange={e => setDate(e.target.value)} /></label><label className="space-y-2 text-sm">Người nhận (tùy chọn)<input aria-label="Người nhận" maxLength={200} className={issueInput} value={receiver} onChange={e => setReceiver(e.target.value)} /></label></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Lô / vị trí', 'Đã soạn', 'Đã xuất', 'Còn được xuất', 'Tồn thực tế', 'Xuất lần này (kg)'].map(s => <th className="p-3" key={s}>{s}</th>)}</tr></thead><tbody>{order.allocations.map(a => <tr key={a.reservationId} className="border-t border-slate-100 align-top"><td className="max-w-72 p-3"><p className="font-semibold text-emerald-700">{a.batchCode}</p><p>{a.productName} · {a.locationName}</p><p className="text-xs text-slate-500">HSD: {pickingDate(a.expiryDate)}</p>{a.lockReason && <p className="mt-2 text-xs text-rose-700">{a.lockReason}</p>}</td><td className="p-3">{pickingKg(a.pickedWeightKg)}</td><td className="p-3">{pickingKg(a.issuedWeightKg)}</td><td className="p-3">{pickingKg(a.remainingWeightKg)}</td><td className="p-3">{pickingKg(a.quantityOnHandKg)}</td><td className="w-40 p-3"><input aria-label={`Khối lượng xuất ${a.batchCode} ${a.locationName}`} type="number" step="0.001" min="0.001" max={Math.min(a.remainingWeightKg, a.quantityOnHandKg)} disabled={!a.canIssue} value={amounts[a.reservationId] ?? ''} className={issueInput} onChange={e => setAmounts(old => ({ ...old, [a.reservationId]: e.target.value }))} /><p className="mt-1 text-xs text-slate-500">Để trống để bỏ dòng</p></td></tr>)}</tbody></table></div>
      <label className="block space-y-2 text-sm">Ghi chú (tùy chọn)<textarea aria-label="Ghi chú phiếu xuất" maxLength={1000} rows={3} className={issueInput} value={note} onChange={e => setNote(e.target.value)} /></label>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <div className="flex justify-end"><button disabled={busy || disabled || !order.allocations.some(a => a.canIssue)} className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? 'Đang lưu...' : existing ? 'Lưu thay đổi' : 'Lưu nháp'}</button></div>
    </fieldset>
  </form>
}
