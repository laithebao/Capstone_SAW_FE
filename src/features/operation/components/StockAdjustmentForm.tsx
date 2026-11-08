import { useEffect, useRef, useState } from 'react'
import { createAdjustment, removeAdjustmentImage, uploadAdjustmentImage } from '@/services/stockAdjustmentService'
import { issueOperationKey } from '@/services/goodsIssueService'
import { getAuthErrorMessage } from '@/services/authService'
import { issueInput } from './GoodsIssueForm'
import { adjustmentTypes } from '@/features/operation/stockAdjustmentFormat'
import { pickingKg } from '@/features/operation/pickingFormat'
import type { AdjustmentDetail, AdjustmentImage, AdjustmentKind, AdjustmentScope } from '@/types/stockAdjustment'

export default function StockAdjustmentForm({ scope, kind, inventoryId, replaces, refreshing, onBusy, onSaved, onReload }: { scope: AdjustmentScope; kind: AdjustmentKind; inventoryId: number | null; replaces?: number; refreshing: boolean; onBusy: (busy: boolean) => void; onSaved: (data: AdjustmentDetail) => void; onReload: () => void }) {
  const [actual, setActual] = useState(''), [reason, setReason] = useState(''), [type, setType] = useState(kind === 'DISPOSAL' ? 'DAMAGE' : 'COUNTING_ERROR')
  const [images, setImages] = useState<{ file: File; preview: string }[]>([])
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirm, setConfirm] = useState(false)
  const sending = useRef(false), saved = useRef(false), uploaded = useRef(new Map<File, AdjustmentImage>()), previews = useRef(new Set<string>())
  const operation = useRef({ payload: '', id: '' })
  useEffect(() => () => {
    for (const url of previews.current) URL.revokeObjectURL(url)
    if (!saved.current) for (const image of uploaded.current.values()) void removeAdjustmentImage(image.id).catch(() => {})
  }, [])
  const system = scope.stocks.reduce((sum, i) => sum + i.systemQuantityKg, 0)
  const numeric = Number(actual), valid = kind === 'DISPOSAL' || (actual.trim() !== '' && numeric >= 0 && numeric < 1e15 && /^\d+(\.\d{1,3})?$/.test(actual) && numeric !== system)
  const selectFiles = (files: FileList | null) => {
    if (!files) return
    const additions = Array.from(files)
    if (images.length + additions.length > 5 || additions.some(f => !['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.size === 0 || f.size > 10 * 1024 * 1024)) { setError('Chọn tối đa 5 ảnh PNG, JPEG, WEBP; mỗi ảnh tối đa 10 MB.'); return }
    setError(''); setImages(old => [...old, ...additions.map(file => { const preview = URL.createObjectURL(file); previews.current.add(preview); return { file, preview } })])
  }
  const remove = async (file: File) => {
    if (sending.current) return
    const image = uploaded.current.get(file)
    try { if (image) await removeAdjustmentImage(image.id); uploaded.current.delete(file); setImages(old => old.filter(i => i.file !== file)); setError('') }
    catch (e) { setError(getAuthErrorMessage(e, 'Không thể bỏ ảnh. Vui lòng thử lại.')) }
  }
  const submit = async () => {
    if (sending.current || refreshing || !scope.canRequest || !valid || !reason.trim()) return
    sending.current = true; setBusy(true); onBusy(true); setError(''); setConfirm(false)
    try {
      for (const { file } of images) if (!uploaded.current.has(file)) uploaded.current.set(file, await uploadAdjustmentImage(file))
      const draft = { ...(replaces ? { replacesStockAdjustmentId: replaces } : {}), productBatchId: scope.batch.id, requestKind: kind, inventoryId: kind === 'COUNT' ? inventoryId : null, actualQuantityKg: kind === 'COUNT' ? numeric : null, adjustmentType: type, reason: reason.trim(), expectedSnapshot: scope.snapshot, imageIds: images.map(i => uploaded.current.get(i.file)!.id).sort() }
      const payload = JSON.stringify(draft)
      if (payload !== operation.current.payload) operation.current = { payload, id: issueOperationKey() }
      const result = await createAdjustment({ ...draft, requestId: operation.current.id })
      saved.current = true; onSaved(result)
    } catch (e) { setError(getAuthErrorMessage(e, 'Chưa xác định được kết quả gửi yêu cầu. Giữ nguyên nội dung; thử lại cùng dữ liệu hoặc kiểm tra danh sách.')) }
    finally { sending.current = false; setBusy(false); onBusy(false) }
  }
  return <form className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={e => { e.preventDefault(); if (valid && reason.trim()) setConfirm(true) }}>
    <h2 className="text-xl font-bold">{kind === 'DISPOSAL' ? 'Đề nghị loại bỏ toàn bộ lô' : 'Ghi nhận kiểm đếm thực tế'}</h2>
    <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Yêu cầu sẽ chờ quản lý kho duyệt. Tồn kho, lượng giữ và chứng từ chưa thay đổi.</p>
    {!!scope.relatedOrders?.length && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><h3 className="font-semibold">Đơn liên quan (hệ thống xác định)</h3>{scope.relatedOrders.map(o => <p key={o.lineId}>{o.orderCode} · {o.weightKg} kg</p>)}<p>Lô và toàn đơn tạm dừng trong lúc xử lý. Không tự thay lượng hoặc giá khách đặt.</p><p>Chỉ ghi phần hàng còn lại đã kiểm tra đủ điều kiện giao. Nếu còn nghi ngờ chất lượng, cần kho xác minh theo quy trình trước khi đề xuất tiếp tục đơn.</p></div>}
    {!scope.canRequest && <p role="alert" className="text-rose-700">{scope.lockReason}</p>}
    <fieldset disabled={busy || refreshing || !scope.canRequest} className="space-y-5 disabled:opacity-60">
      <div className="grid gap-4 sm:grid-cols-3"><div><p className="text-sm text-slate-500">Tồn hệ thống</p><strong>{pickingKg(system)}</strong></div>{kind === 'DISPOSAL' ? <><div><p className="text-sm text-slate-500">Đề nghị loại bỏ</p><strong>{pickingKg(system)}</strong></div><div><p className="text-sm text-slate-500">Tồn dự kiến sau duyệt</p><strong>0 kg</strong></div></> : <><label>Lượng thực đếm (kg)<input aria-label="Lượng thực đếm" required type="number" step="0.001" min="0" className={issueInput} value={actual} onChange={e => setActual(e.target.value)} /></label><div><p className="text-sm text-slate-500">Chênh lệch</p><strong>{actual === '' ? 'Chưa nhập' : `${numeric - system > 0 ? '+' : ''}${pickingKg(numeric - system)}`}</strong><p className="text-sm text-slate-500">{actual !== '' && numeric > system ? 'Điều chỉnh tăng' : actual !== '' && numeric < system ? 'Điều chỉnh giảm' : ''}</p></div></>}
      </div>
      {kind === 'COUNT' && actual !== '' && !valid && <p className="text-sm text-rose-700">Lượng thực đếm phải không âm, tối đa 3 số lẻ, khác tồn hệ thống.</p>}
      {kind === 'COUNT' && valid && numeric < (scope.stocks[0]?.reservedQuantityKg ?? 0) && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Thực đếm thấp hơn lượng đang giữ cho đơn. Bạn vẫn có thể gửi báo hao hụt. Lô sẽ tạm dừng soạn/xuất; quản lý kho phải xử lý lại đơn và phần giữ hàng trước khi duyệt. Khối lượng và tiền của đơn không tự thay đổi.</p>}
      <label className="block">Nguyên nhân<select className={issueInput} value={type} onChange={e => setType(e.target.value)}>{Object.entries(adjustmentTypes).filter(([k]) => kind === 'COUNT' || k === 'DAMAGE' || k === 'SPOILAGE').map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label className="block">Lý do chi tiết <span className="text-rose-600">*</span><textarea aria-label="Lý do điều chỉnh" required maxLength={1000} rows={4} className={issueInput} value={reason} onChange={e => setReason(e.target.value)} /><span className="text-xs text-slate-500">{reason.length}/1000 ký tự</span></label>
      <label className="block">Ảnh bằng chứng (tùy chọn)<input aria-label="Ảnh bằng chứng" className="mt-2 block w-full text-sm" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={e => { selectFiles(e.target.files); e.target.value = '' }} /><span className="text-xs text-slate-500">Tối đa 5 ảnh, 10 MB/ảnh. Ảnh được kiểm tra và lưu khi gửi.</span></label>
      <div className="flex flex-wrap gap-4">{images.map((i, index) => <div key={i.preview} className="space-y-2"><img src={i.preview} alt={`Ảnh bằng chứng ${index + 1}`} className="h-28 w-36 rounded-lg object-cover" /><button type="button" className="text-sm text-rose-700 underline" onClick={() => void remove(i.file)}>Bỏ ảnh {index + 1}</button></div>)}</div>
      <button disabled={!valid || !reason.trim()} className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? 'Đang gửi...' : kind === 'DISPOSAL' ? 'Gửi yêu cầu loại bỏ' : 'Gửi yêu cầu điều chỉnh'}</button>
    </fieldset>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">{error}<button type="button" disabled={busy} className="ml-3 underline" onClick={onReload}>Tải lại số liệu</button></p>}
    {confirm && <div role="dialog" aria-modal="true" aria-label="Xác nhận gửi yêu cầu" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-xl"><h3 className="text-lg font-bold">Xác nhận gửi yêu cầu</h3><p>{kind === 'DISPOSAL' ? `Đề nghị loại bỏ toàn bộ ${pickingKg(system)} tại tất cả vị trí của lô. Lô sẽ tạm dừng bán và xử lý kho trong khi chờ duyệt.` : `Ghi nhận thực đếm ${pickingKg(numeric)}; chênh lệch ${pickingKg(numeric - system)}.`}</p><p className="text-sm text-slate-500">Tồn kho chỉ thay đổi khi quản lý kho phê duyệt. Trong khi chờ duyệt, lô tạm dừng bán, giữ hàng, soạn và xuất kho.</p><div className="flex justify-end gap-3"><button type="button" className="rounded-lg border border-slate-300 px-4 py-2" onClick={() => setConfirm(false)}>Quay lại</button><button type="button" className="rounded-lg bg-emerald-700 px-4 py-2 text-white" onClick={() => void submit()}>Xác nhận gửi</button></div></div></div>}
  </form>
}
