import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import AppIcon from '@/components/common/AppIcon'
import { apiClient } from '@/services/apiClient'
import { getAuthErrorMessage } from '@/services/authService'
import type { ApiResponse } from '@/types/api'
import { field, panel, primary, timestamp } from './format'

type ReturnItem = { purchaseOrderId: number; orderCode?: string; status: string; reason: string; reviewNote?: string; receiptNote?: string; requestedAt: string; receivedAt?: string; lots: { batchCode: string; productName: string; weightKg: number }[] }
type Props = { orderId: number; orderStatus: string; receivedAt?: string | null; onChanged?: () => void; receiptActions?: ReactNode; receiptMessage?: string }
const labels: Record<string, string> = { REQUESTED: 'Chờ quản lý duyệt', APPROVED: 'Đã duyệt · chờ nhận hàng trả', REJECTED: 'Từ chối trả hàng', RECEIVED: 'Đã kiểm nhận hàng trả' }

export default function OrderReturnsPanel({ orderId, orderStatus, receivedAt, onChanged, receiptActions, receiptMessage }: Props) {
  const [items, setItems] = useState<ReturnItem[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const { data } = await apiClient.get<ApiResponse<ReturnItem | null>>(`/order-returns/${orderId}`, { signal })
      if (!signal?.aborted) { setItems(data.data ? [data.data] : []); setError('') }
    } catch (e) { if (!signal?.aborted) { const message = getAuthErrorMessage(e, 'Không thể tải yêu cầu trả hàng.'); setError(message === 'An unexpected error occurred' ? 'Không tải được trạng thái trả hàng. Vui lòng thử lại hoặc liên hệ quản trị hệ thống.' : message) } }
    finally { if (!signal?.aborted) setLoading(false) }
  }, [orderId])
  useEffect(() => { const c = new AbortController(); const timer = window.setTimeout(() => void load(c.signal), 0); return () => { window.clearTimeout(timer); c.abort() } }, [load])
  const open = () => { setConfirming(true); setNote(''); setMessage('') }
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!confirming || busy) return
    setBusy(true); setError('')
    try {
      await apiClient.post(`/order-returns/${orderId}`, { note: note.trim() })
      setConfirming(false); setMessage('Đã gửi yêu cầu trả hàng. Vui lòng chờ kho xử lý.'); await load(); onChanged?.()
    } catch (e) { setError(getAuthErrorMessage(e)) }
    finally { setBusy(false) }
  }
  const canRequest = ['ISSUED', 'DISPATCHED', 'DELIVERED'].includes(orderStatus) && !items.length
  return <section className={panel}>
    <div className="flex items-center justify-between gap-3"><h2 className="font-bold">Nhận hàng và xử lý đơn</h2><button type="button" onClick={() => void load()} disabled={busy} className="text-sm text-emerald-700">Làm mới</button></div>
    {orderStatus === 'DELIVERED' ? <div role="status" className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><AppIcon name="shield" className="h-5 w-5" /></span>
      <div className="min-w-0 text-sm"><p className="font-semibold text-emerald-900">Đã nhận đủ hàng</p>
        {receivedAt && <p className="mt-1 text-emerald-700">Xác nhận lúc {timestamp(receivedAt)}</p>}
        {receiptMessage && <p className="mt-2 text-slate-600">{receiptMessage}</p>}
      </div>
    </div> : receiptMessage && <p role="status" className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{receiptMessage}</p>}
    <div className="mt-4 flex flex-wrap gap-3">{receiptActions}<button type="button" disabled={loading || !!error || busy || !canRequest} onClick={open} className="rounded-lg border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50">Yêu cầu trả hàng</button></div>
    <p className="mt-2 text-sm text-slate-500">Yêu cầu trả toàn bộ các lô trong đơn. Sau khi xác nhận, yêu cầu được gửi đến kho để xử lý. Tiền và đối soát thực hiện bên ngoài hệ thống.</p>
    {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
    {message && <p role="status" className="mt-3 text-sm text-emerald-700">{message}</p>}
    {loading ? <p className="mt-3 text-sm">Đang tải...</p> : !error && <div className="mt-3 space-y-3">{!items.length && <p className="text-sm text-slate-500">Chưa có yêu cầu trả hàng.</p>}{items.map(item => <article key={item.purchaseOrderId} className="rounded-lg border border-slate-200 p-4 text-sm">
      <p className="font-semibold">{item.orderCode ?? `Đơn #${item.purchaseOrderId}`} · {labels[item.status] ?? item.status}</p>
      <ul className="mt-2 space-y-1">{item.lots.map((lot, index) => <li key={index}>{lot.batchCode} · {lot.productName} · {lot.weightKg.toLocaleString('vi-VN')} kg (nguyên lô)</li>)}</ul>
      <p className="mt-2 whitespace-pre-wrap">Lý do: {item.reason}</p><p className="mt-1 text-xs text-slate-500">{timestamp(item.requestedAt)}</p>
      {item.reviewNote && <p className="mt-2 whitespace-pre-wrap">Ý kiến quản lý: {item.reviewNote}</p>}
      {item.receiptNote && <p className="mt-2 whitespace-pre-wrap">Kiểm nhận: {item.receiptNote}</p>}
      {item.receivedAt && <p className="mt-1 text-xs text-slate-500">{timestamp(item.receivedAt)} · Hàng trả lưu riêng, chưa cộng tồn bán được.</p>}
    </article>)}</div>}
    {confirming && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><form role="dialog" aria-modal="true" aria-labelledby="return-title" onSubmit={e => void submit(e)} className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-xl">
      <h3 id="return-title" className="font-bold">Xác nhận yêu cầu trả nguyên đơn</h3>
      <label className="block text-sm">Lý do trả hàng <span className="text-rose-600">*</span><textarea required maxLength={1000} className={`${field} mt-2`} value={note} disabled={busy} onChange={e => setNote(e.target.value)} /></label>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={() => setConfirming(false)}>Quay lại</button><button className={primary} disabled={busy || !note.trim()}>{busy ? 'Đang lưu...' : 'Xác nhận'}</button></div>
    </form></div>}
  </section>
}
