import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { Link, useParams } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { confirmGoodsIssue, getGoodsIssue, getIssueOrder, issueOperationKey, updateGoodsIssue } from '@/services/goodsIssueService'
import { getAuthErrorMessage } from '@/services/authService'
import GoodsIssueForm, { GoodsIssueStatus } from '@/features/operation/components/GoodsIssueForm'
import { pickingDate, pickingKg, pickingTime } from '@/features/operation/pickingFormat'
import type { GoodsIssueDetail, GoodsIssueOrder } from '@/types/goodsIssue'

export default function GoodsIssueDetailPage() {
  const { id } = useParams()
  const issueId = Number(id)
  const valid = Number.isSafeInteger(issueId) && issueId > 0
  const [detail, setDetail] = useState<GoodsIssueDetail | null>(null)
  const [order, setOrder] = useState<GoodsIssueOrder | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [stale, setStale] = useState(false)
  const [reload, setReload] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const sending = useRef(false)
  const current = useRef<GoodsIssueDetail | null>(null)
  const confirmAttempt = useRef<{ requestId: string; expectedSnapshot: string } | null>(null)
  useEffect(() => {
    if (!valid) return
    const controller = new AbortController()
    let generation = 0
    const load = async (first: boolean) => {
      const ticket = ++generation
      if (first) { setLoading(true); current.current = null }
      try {
        const data = await getGoodsIssue(issueId, controller.signal)
        const allocation = data.canEdit ? await getIssueOrder(data.summary.purchaseOrderId, controller.signal) : null
        if (controller.signal.aborted || ticket !== generation) return
        if (!first && current.current && current.current.snapshot !== data.snapshot) { setStale(true); return }
        current.current = data; setDetail(data); setOrder(allocation); setError(''); setStale(false)
      } catch (e) { if (!controller.signal.aborted && ticket === generation) setError(getAuthErrorMessage(e, 'Không thể tải chi tiết phiếu xuất.')) }
      finally { if (!controller.signal.aborted && ticket === generation) setLoading(false) }
    }
    const timer = window.setTimeout(() => void load(true), 0)
    const focus = () => { if (!sending.current) void load(false) }
    window.addEventListener('focus', focus)
    return () => { controller.abort(); window.clearTimeout(timer); window.removeEventListener('focus', focus) }
  }, [issueId, valid, reload])
  const refresh = () => { if (editing && !window.confirm('Tải lại sẽ bỏ nội dung chưa lưu. Tiếp tục?')) return; setEditing(false); setConfirming(false); setReload(x => x + 1) }
  const confirm = async () => {
    if (!detail || sending.current || stale) return
    if (confirmAttempt.current?.expectedSnapshot !== detail.snapshot) confirmAttempt.current = { requestId: issueOperationKey(), expectedSnapshot: detail.snapshot }
    sending.current = true; setBusy(true); setError('')
    try {
      const saved = await confirmGoodsIssue(issueId, confirmAttempt.current)
      current.current = saved; setDetail(saved); setConfirming(false); setSuccess('Đã xác nhận xuất kho.'); setOrder(null)
    } catch (e) {
      setError(getAuthErrorMessage(e, 'Chưa xác định được kết quả xác nhận. Tải lại phiếu để kiểm tra trước khi thử lại.'))
      setStale(true); setConfirming(false)
    } finally { sending.current = false; setBusy(false) }
  }
  if (!valid) return <p role="alert">Mã phiếu không hợp lệ.</p>
  if (loading) return <p role="status">Đang tải phiếu xuất...</p>
  return <div className="space-y-6"><header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-semibold text-emerald-700">VẬN HÀNH · XUẤT KHO</p><h1 className="mt-2 text-3xl font-bold">Chi tiết phiếu xuất</h1></div><div className="flex flex-wrap gap-2"><button disabled={busy} onClick={refresh} className="rounded-lg border bg-white px-4 py-2">Tải lại phiếu</button><Link to={ROUTES.OPERATION_GOODS_ISSUES} className="rounded-lg border bg-white px-4 py-2">Quay lại danh sách</Link></div></header>
    {error && <div role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">{error}<button className="ml-3 underline" onClick={refresh}>Tải lại phiếu</button></div>}{success && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-emerald-700">{success}</p>}
    {stale && <p role="alert" className="rounded-lg bg-amber-50 p-4 text-amber-900">Phiếu hoặc điều kiện xuất đã thay đổi. Nội dung đang nhập được giữ lại; hãy tải lại và kiểm tra trước khi lưu/xác nhận.<button className="ml-3 font-semibold underline" onClick={refresh}>Tải lại phiếu</button></p>}
    {detail && <><section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><h2 className="max-w-full break-all font-mono text-lg font-bold text-emerald-700">{detail.summary.issueCode}</h2><GoodsIssueStatus status={detail.summary.issueStatus} /></div><dl className="grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-3">{[['Đơn hàng', detail.summary.orderCode], ['Nhà phân phối', detail.summary.distributorName], ['Ngày xuất', pickingDate(detail.summary.issuedDate)], ['Người lập', detail.summary.operationStaffName], ['Người nhận', detail.receiverName ?? 'Chưa ghi nhận'], ['Xác nhận lúc', pickingTime(detail.committedAt)]].map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}</dl><p className="whitespace-pre-wrap text-sm">Ghi chú: {detail.note ?? 'Chưa ghi nhận'}</p><p className="font-semibold">Tổng khối lượng: {pickingKg(detail.summary.weightInKg)}</p>{detail.lockReason && <p className="text-sm text-slate-500">{detail.lockReason}</p>}
      <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{['Lô / sản phẩm', 'Vị trí', 'Số lượng / đơn vị', 'Khối lượng'].map(s => <th className="p-3" key={s}>{s}</th>)}</tr></thead><tbody>{detail.lines.map(l => <tr key={l.id} className="border-t"><td className="p-3"><Link className="font-semibold text-emerald-700 underline" to={ROUTES.OPERATION_PRODUCT_BATCH_DETAIL.replace(':id', String(l.productBatchId))}>{l.batchCode}</Link><p>{l.productName}</p></td><td className="p-3">{l.locationName}</td><td className="p-3">{l.issuedQuantity.toLocaleString('vi-VN')} {l.unit}</td><td className="p-3">{pickingKg(l.weightInKg)}</td></tr>)}</tbody></table></div>
      {detail.canEdit && !editing && <div className="flex flex-wrap justify-end gap-3"><button disabled={stale || busy} className="rounded-lg border px-4 py-3 font-semibold disabled:opacity-40" onClick={() => { setEditing(true); setSuccess('') }}>Chỉnh sửa phiếu nháp</button><button disabled={stale || busy} className="rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white disabled:opacity-40" onClick={() => { setConfirming(true); setSuccess('') }}>Xác nhận xuất kho</button></div>}
    </section>
    {editing && detail.canEdit && order && <><GoodsIssueForm key={detail.snapshot} order={order} existing={detail} disabled={stale} onSave={async (draft, requestId) => {
      sending.current = true
      try { const saved = await updateGoodsIssue(issueId, { ...draft, requestId, expectedSnapshot: detail.snapshot }); current.current = saved; setDetail(saved); setEditing(false); setSuccess('Đã lưu thay đổi phiếu nháp.'); setReload(x => x + 1) }
      catch (e) { if (axios.isAxiosError(e) && e.response?.status === 409) setStale(true); throw e }
      finally { sending.current = false }
    }} /><button className="rounded border px-4 py-2 text-sm" onClick={() => { if (window.confirm('Bỏ nội dung chưa lưu?')) setEditing(false) }}>Hủy chỉnh sửa</button></>}
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Lịch sử phiếu xuất</h2>{!detail.history.length ? <p className="mt-4 text-sm text-slate-500">Chưa có lịch sử được ghi nhận.</p> : <ol className="mt-4 space-y-4">{detail.history.map(h => <li key={h.id} className="border-l-2 border-emerald-200 pl-4 text-sm"><p className="font-semibold">{h.description}</p><p className="mt-1 text-slate-500">{pickingTime(h.recordedAt)} · {h.actorName ?? 'Chưa ghi nhận người thực hiện'}</p></li>)}</ol>}</section></>}
    {confirming && detail && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-label="Xác nhận xuất kho"><div className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-xl"><h2 className="text-xl font-bold">Xác nhận xuất kho?</h2><p className="text-sm">Xuất {pickingKg(detail.summary.weightInKg)} theo phiếu đã xem. Sau xác nhận, tồn kho giảm và phiếu chỉ được xem.</p><div className="flex justify-end gap-3"><button disabled={busy} className="rounded border px-4 py-2" onClick={() => setConfirming(false)}>Quay lại kiểm tra</button><button disabled={busy || stale} className="rounded bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-40" onClick={() => void confirm()}>{busy ? 'Đang xác nhận...' : 'Đồng ý xuất kho'}</button></div></div></div>}
  </div>
}
