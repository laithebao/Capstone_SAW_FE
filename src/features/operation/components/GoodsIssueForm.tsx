import { useRef, useState } from 'react'
import type { GoodsIssueDetail, GoodsIssueDraft, GoodsIssueOrder } from '@/types/goodsIssue'
import { pickingDate, pickingKg } from '@/features/operation/pickingFormat'
import { getAuthErrorMessage } from '@/services/authService'
import { issueOperationKey } from '@/services/goodsIssueService'

export const issueInput = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100'
export function GoodsIssueStatus({ status }: { status: string }) {
  return <span className={`inline-flex h-fit shrink-0 items-center self-start whitespace-nowrap rounded-full px-2.5 py-1 align-middle text-xs font-medium leading-5 ${status === 'COMMITTED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{status === 'COMMITTED' ? 'Đã xác nhận xuất kho' : status === 'CANCELLED' ? 'Đã vô hiệu phiếu nháp' : 'Phiếu nháp'}</span>
}
export default function GoodsIssueForm({ order, existing, disabled, onSave }: { order: GoodsIssueOrder; existing?: GoodsIssueDetail; disabled?: boolean; onSave: (draft: GoodsIssueDraft, key: string) => Promise<void> }) {
  const [today] = useState(() => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10))
  const [date, setDate] = useState(existing?.summary.issuedDate ?? today)
  const [receiver, setReceiver] = useState(existing?.receiverName ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const lots = Array.from(new Set(order.allocations.map(a => a.orderDetailId))).map(id => {
    const rows = order.allocations.filter(a => a.orderDetailId === id)
    return { id, rows, canIssue: rows.length > 0 && rows.every(a => a.canIssue) }
  })
  const [selectedLots, setSelectedLots] = useState<number[]>(() => lots.filter(lot => existing
    ? lot.rows.some(a => existing.lines.some(l => l.reservationId === a.reservationId)) : lot.canIssue).map(lot => lot.id))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const sending = useRef(false)
  const attempt = useRef<{ payload: string; key: string } | null>(null)
  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (sending.current || disabled) return
    const selected = lots.filter(lot => selectedLots.includes(lot.id))
    if (!selected.length || selected.some(lot => !lot.canIssue)) {
      setError('Chọn ít nhất một lô đã soạn đủ và còn được phép xuất. Mỗi lô phải xuất đủ tại tất cả vị trí.'); return
    }
    const draft = { issuedDate: date, receiverName: receiver.trim() || null, note: note.trim() || null,
      lines: selected.flatMap(lot => lot.rows.map(a => ({ reservationId: a.reservationId, weightInKg: a.reservedWeightKg }))) }
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
      <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">Chọn nguyên lô để xuất. Khối lượng lấy từ phần giữ hàng đã soạn đủ, không nhập hoặc chia nhỏ số kg.</p>
      {lots.map(lot => <section key={lot.id} className="space-y-3 rounded-lg border border-slate-200 p-4">
        <label className="flex items-center gap-3 font-semibold"><input type="checkbox" aria-label={`Xuất nguyên lô ${lot.rows[0].batchCode}`} disabled={!lot.canIssue && !selectedLots.includes(lot.id)} checked={selectedLots.includes(lot.id)} onChange={e => setSelectedLots(old => e.target.checked ? [...old, lot.id] : old.filter(id => id !== lot.id))} />{lot.rows[0].batchCode} · {pickingKg(lot.rows[0].approvedWeightKg)}</label>
        {!lot.canIssue && <p className="text-sm text-rose-700">{lot.rows.find(a => a.lockReason)?.lockReason ?? 'Lô chưa đủ điều kiện xuất.'}</p>}
        <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Sản phẩm / vị trí', 'Đã soạn', 'Đã xuất', 'Tồn hệ thống', 'Khối lượng nguyên lô tại vị trí'].map(s => <th className="p-3" key={s}>{s}</th>)}</tr></thead><tbody>{lot.rows.map(a => <tr key={a.reservationId} className="border-t border-slate-100 align-top"><td className="p-3"><p>{a.productName} · {a.locationName}</p><p className="text-xs text-slate-500">HSD: {pickingDate(a.expiryDate)}</p></td><td className="p-3">{pickingKg(a.pickedWeightKg)}</td><td className="p-3">{pickingKg(a.issuedWeightKg)}</td><td className="p-3">{pickingKg(a.quantityOnHandKg)}</td><td className="p-3 font-semibold">{pickingKg(a.reservedWeightKg)}</td></tr>)}</tbody></table></div>
      </section>)}
      <label className="block space-y-2 text-sm">Ghi chú (tùy chọn)<textarea aria-label="Ghi chú phiếu xuất" maxLength={1000} rows={3} className={issueInput} value={note} onChange={e => setNote(e.target.value)} /></label>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <div className="flex justify-end"><button disabled={busy || disabled || !order.allocations.some(a => a.canIssue)} className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? 'Đang lưu...' : existing ? 'Lưu thay đổi' : 'Lưu nháp'}</button></div>
    </fieldset>
  </form>
}
