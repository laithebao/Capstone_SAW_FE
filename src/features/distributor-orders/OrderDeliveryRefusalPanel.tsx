import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import AppIcon from '@/components/common/AppIcon'
import { apiClient } from '@/services/apiClient'
import { getAuthErrorMessage } from '@/services/authService'
import type { ApiResponse } from '@/types/api'
import type { DistributorOrderDetail } from '@/types/order'
import { canRefuseDelivery, MAX_REFUSAL_IMAGES, REFUSED_DELIVERY_STATUS, validateRefusalImage } from './deliveryRefusal'
import { field, money, panel, timestamp, weight } from './format'

type Evidence = { id: string; fileName: string; url: string }
type Refusal = { purchaseOrderId: number; requestId: string; orderCode: string; reason: string; createdAt: string; images: Evidence[]; lots: { batchId: number; batchCode: string; productName: string; weightKg: number }[] }
type SelectedImage = { id: string; file: File; preview: string }
type Props = { orderId: number; orderStatus: string; lines: DistributorOrderDetail['lines']; receivedAt?: string | null; onChanged?: () => void; receiptActions?: ReactNode; receiptMessage?: string }

function EvidenceImage({ image }: { image: Evidence }) {
  const [url, setUrl] = useState('')
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    let objectUrl = ''
    void apiClient.get<Blob>(image.url.substring(4), { responseType: 'blob', signal: controller.signal }).then(response => {
      if (controller.signal.aborted) return
      objectUrl = URL.createObjectURL(response.data)
      setUrl(objectUrl)
    }).catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [image.url])
  return <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-2">
    {url ? <a href={url} download={image.fileName} className="block"><img src={url} alt={image.fileName} className="h-32 w-full rounded object-contain" /><span className="mt-2 block truncate text-xs text-emerald-700">Tải ảnh: {image.fileName}</span></a>
      : <p className="flex h-32 items-center justify-center text-xs text-slate-500">{failed ? 'Không tải được ảnh.' : 'Đang tải ảnh...'}</p>}
  </div>
}

export default function OrderDeliveryRefusalPanel({ orderId, orderStatus, lines, receivedAt, onChanged, receiptActions, receiptMessage }: Props) {
  const [reports, setReports] = useState<Refusal[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')
  const [requestId, setRequestId] = useState('')
  const [selectedBatchIds, setSelectedBatchIds] = useState<number[]>([])
  const [images, setImages] = useState<SelectedImage[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const previews = useRef(new Set<string>())
  const submitting = useRef(false)
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const response = await apiClient.get<ApiResponse<Refusal[]>>(`/order-delivery-refusals/${orderId}`, { signal })
      if (!signal?.aborted) { setReports(response.data.data); setError('') }
    } catch (cause) { if (!signal?.aborted) setError(getAuthErrorMessage(cause, 'Không tải được thông tin nhận hàng.')) }
    finally { if (!signal?.aborted) setLoading(false) }
  }, [orderId])
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => void load(controller.signal), 0)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [load])
  useEffect(() => {
    const urls = previews.current
    return () => { urls.forEach(url => URL.revokeObjectURL(url)); urls.clear() }
  }, [])

  const clearImages = () => { previews.current.forEach(url => URL.revokeObjectURL(url)); previews.current.clear(); setImages([]) }
  const open = () => { clearImages(); setSelectedBatchIds([]); setReason(''); setError(''); setMessage(''); setRequestId(crypto.randomUUID()); setConfirming(true) }
  const close = () => { setConfirming(false); clearImages(); setError('') }
  function selectImages(files: FileList | null) {
    if (!files) return
    const selected = Array.from(files)
    if (images.length + selected.length > MAX_REFUSAL_IMAGES) { setError('Chỉ đính kèm tối đa 5 ảnh.'); return }
    for (const file of selected) { const invalid = validateRefusalImage(file); if (invalid) { setError(invalid); return } }
    const added = selected.map(file => {
      const preview = URL.createObjectURL(file)
      previews.current.add(preview)
      return { id: crypto.randomUUID(), file, preview }
    })
    setImages(current => [...current, ...added])
    setError('')
  }
  function removeImage(image: SelectedImage) {
    URL.revokeObjectURL(image.preview); previews.current.delete(image.preview)
    setImages(current => current.filter(file => file.id !== image.id))
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting.current || !reason.trim() || !images.length || !selectedBatchIds.length) return
    submitting.current = true; setBusy(true); setError('')
    const data = new FormData()
    data.append('requestId', requestId)
    data.append('reason', reason.trim())
    selectedBatchIds.forEach(id => data.append('batchIds', String(id)))
    images.forEach(image => data.append('images', image.file))
    try {
      const response = await apiClient.post<ApiResponse<Refusal>>(`/order-delivery-refusals/${orderId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
      setReports(current => [response.data.data, ...current.filter(r => r.requestId !== response.data.data.requestId)]); setConfirming(false); clearImages()
      setMessage('Đã ghi nhận từ chối các lô đã chọn. Các lô còn lại giữ nguyên; kho sẽ liên hệ xử lý bên ngoài hệ thống.')
      onChanged?.()
    } catch (cause) { setError(getAuthErrorMessage(cause, 'Không thể gửi thông tin từ chối nhận hàng.')) }
    finally { submitting.current = false; setBusy(false) }
  }
  const refusedBatchIds = new Set(reports.flatMap(report => report.lots.map(lot => lot.batchId)))
  const availableLots = lines.filter(line => !line.isDeliveryRefused && !refusedBatchIds.has(line.batchId))
  const allRefused = orderStatus === REFUSED_DELIVERY_STATUS || availableLots.length === 0
  const hasRefusals = reports.length > 0 || lines.some(line => line.isDeliveryRefused)
  return <section className={panel}>
    <div className="flex items-center justify-between gap-3"><h2 className="font-bold">Nhận hàng và xử lý đơn</h2><button type="button" disabled={busy || loading} onClick={() => void load()} className="text-sm text-emerald-700">Làm mới</button></div>
    {!allRefused && (orderStatus === 'DELIVERED' || !!receivedAt) ? <div role="status" className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><AppIcon name="shield" className="h-5 w-5" /></span>
      <div className="text-sm"><p className="font-semibold text-emerald-900">{hasRefusals ? 'Đã nhận các lô còn lại' : 'Đã nhận đủ hàng'}</p>{receivedAt && <p className="mt-1 text-emerald-700">Xác nhận lúc {timestamp(receivedAt)}</p>}{receiptMessage && <p className="mt-2 text-slate-600">{receiptMessage}</p>}</div>
    </div> : receiptMessage && <p role="status" className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{receiptMessage}</p>}
    {!allRefused && <div className="mt-4 flex flex-wrap gap-3">{receiptActions}<button type="button" onClick={open} disabled={loading || busy || !!error || !canRefuseDelivery(orderStatus, availableLots.length > 0)} className="rounded-lg border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50">Từ chối lô hàng</button></div>}
    {!allRefused && <p className="mt-3 text-sm text-slate-500">Chọn những lô có vấn đề để từ chối nguyên lô, kèm lý do và ảnh bằng chứng. Các lô không chọn giữ nguyên. Các bên xử lý bên ngoài hệ thống; không tiếp nhận hàng trở lại kho.</p>}
    {message && <p role="status" className="mt-3 text-sm text-emerald-700">{message}</p>}
    {error && !confirming && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
    {loading ? <p className="mt-3 text-sm text-slate-500">Đang tải...</p> : reports.map(report => <article key={report.requestId} className="mt-4 rounded-xl border border-rose-200 bg-rose-50/50 p-4">
      <div className="flex items-start gap-3"><AppIcon name="alert" className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" /><div><h3 className="font-semibold text-rose-900">Đã từ chối {report.lots.length} lô hàng</h3><p className="mt-1 text-xs text-slate-500">{timestamp(report.createdAt)}</p></div></div>
      <ul className="mt-3 space-y-1 text-sm">{report.lots.map(lot => <li key={lot.batchId}><span className="font-semibold">{lot.batchCode}</span> · {lot.productName} · {weight(lot.weightKg)} kg (nguyên lô)</li>)}</ul>
      <p className="mt-3 whitespace-pre-wrap text-sm text-slate-800"><span className="font-semibold">Lý do: </span>{report.reason}</p>
      <p className="mt-3 text-sm font-semibold">Ảnh bằng chứng ({report.images.length})</p><div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{report.images.map(image => <EvidenceImage key={image.id} image={image} />)}</div>
      <p className="mt-4 text-sm text-slate-600">Đã gửi thông tin đến quản lý kho. Việc giải quyết và đối soát thực hiện bên ngoài hệ thống; hàng không được nhập trở lại kho.</p>
    </article>)}
    {confirming && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form role="dialog" aria-modal="true" aria-labelledby="refusal-title" onSubmit={event => void submit(event)} className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
      <h3 id="refusal-title" className="text-lg font-bold">Chọn lô hàng cần từ chối</h3>
      <p className="text-sm text-slate-600">Thông tin và ảnh bằng chứng sẽ được gửi đến kho. Sau khi xác nhận, các bên xử lý bên ngoài hệ thống.</p>
      <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">Lô cần từ chối <span className="text-rose-600">*</span></legend>
        {availableLots.map(lot => <label key={lot.batchId} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${selectedBatchIds.includes(lot.batchId) ? 'border-rose-300 bg-rose-50' : 'border-slate-200'}`}>
          <input type="checkbox" disabled={busy} checked={selectedBatchIds.includes(lot.batchId)} onChange={event => setSelectedBatchIds(current => event.target.checked ? [...current, lot.batchId] : current.filter(id => id !== lot.batchId))} className="mt-1 accent-rose-700" />
          <span><span className="font-semibold">{lot.batchCode} · {lot.productName}</span><span className="mt-1 block text-xs text-slate-500">{weight(lot.weightKg)} kg / nguyên lô · {money(lot.wholeLotPrice)}</span></span>
        </label>)}
        <p className="text-xs text-slate-500">Đã chọn {selectedBatchIds.length}/{availableLots.length} lô. Các lô không chọn sẽ không bị từ chối.</p>
      </fieldset>
      <label className="block text-sm font-medium">Lý do từ chối <span className="text-rose-600">*</span><textarea required maxLength={1000} rows={3} value={reason} onChange={event => setReason(event.target.value)} disabled={busy} className={`${field} mt-2`} /></label>
      <label className="block text-sm font-medium">Ảnh bằng chứng <span className="text-rose-600">*</span><input type="file" multiple accept="image/jpeg,image/png,image/webp" required={!images.length} disabled={busy} className={`${field} mt-2`} onChange={event => { selectImages(event.target.files); event.target.value = '' }} /><span className="mt-1 block text-xs font-normal text-slate-500">Từ 1 đến 5 ảnh JPG, PNG hoặc WEBP; tối đa 10 MB mỗi ảnh.</span></label>
      {images.length > 0 && <div className="grid grid-cols-3 gap-3">{images.map(image => <div key={image.id} className="min-w-0 rounded-lg border border-slate-200 p-2"><img src={image.preview} alt={image.file.name} className="h-24 w-full rounded object-contain" /><p className="mt-1 truncate text-xs">{image.file.name}</p><button type="button" disabled={busy} onClick={() => removeImage(image)} className="mt-1 text-xs text-rose-700">Bỏ ảnh</button></div>)}</div>}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={close} className="px-3 py-2 text-sm">Quay lại</button><button type="submit" disabled={busy || !reason.trim() || !images.length || !selectedBatchIds.length} className="rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Đang gửi...' : `Từ chối ${selectedBatchIds.length} lô đã chọn`}</button></div>
    </form></div>}
  </section>
}
