import AdjustmentResolutionPanel from '@/features/operation/components/AdjustmentResolutionPanel'
import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { getAdjustment } from '@/services/stockAdjustmentService'
import { getAuthErrorMessage } from '@/services/authService'
import { AdjustmentStatus } from '@/features/operation/components/StockAdjustmentPresentation'
import { adjustmentTypes } from '@/features/operation/stockAdjustmentFormat'
import { pickingKg } from '@/features/operation/pickingFormat'
import type { AdjustmentDetail } from '@/types/stockAdjustment'

const time = (v: string | null) => v ? new Date(v.endsWith('Z') ? v : v + 'Z').toLocaleString('vi-VN') : 'Chưa ghi nhận'
export default function StockAdjustmentDetailPage() {
  const id = Number(useParams().id), location = useLocation()
  const [data, setData] = useState<AdjustmentDetail | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [reload, setReload] = useState(0)
  useEffect(() => {
    const c = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true); setError('')
      try { if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Mã phiếu không hợp lệ.'); const result = await getAdjustment(id, c.signal); if (!c.signal.aborted) setData(result) }
      catch (e) { if (!c.signal.aborted) setError(getAuthErrorMessage(e, 'Không thể tải chi tiết phiếu điều chỉnh.')) }
      finally { if (!c.signal.aborted) setLoading(false) }
    }, 0)
    return () => { c.abort(); clearTimeout(timer) }
  }, [id, reload])
  useEffect(() => { const refresh = () => { if (document.visibilityState === 'visible') setReload(v => v + 1) }; window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh); return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) } }, [])
  return <div className="space-y-6"><header className="flex flex-wrap justify-between gap-4"><h1 className="text-3xl font-bold">Chi tiết phiếu điều chỉnh</h1><Link className="rounded-lg border border-slate-300 bg-white px-4 py-2" to={ROUTES.OPERATION_STOCK_ADJUSTMENTS}>Quay lại danh sách</Link></header>
    {loading ? <p role="status">Đang tải chi tiết...</p> : error ? <p role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">{error}<button className="ml-3 underline" onClick={() => setReload(x => x + 1)}>Thử lại</button></p> : data && <>
      <AdjustmentResolutionPanel data={data} onChanged={() => setReload(v => v + 1)} />
      {location.state?.created && <p role="status" className="rounded-lg bg-emerald-50 p-4 text-emerald-800">Đã gửi yêu cầu; tồn kho chưa thay đổi.</p>}
      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-3"><div><p className="break-all font-mono font-bold text-emerald-700">{data.summary.adjustmentCode}</p><h2 className="mt-2 text-xl font-bold">{data.summary.requestKind === 'DISPOSAL' ? 'Loại bỏ toàn bộ lô' : 'Điều chỉnh kiểm đếm'}</h2></div><AdjustmentStatus status={data.summary.status} /></div>
        {data.summary.status === 'PENDING' && <p className="rounded-lg bg-amber-50 p-3 text-amber-900">Đang chờ quản lý kho duyệt. Phiếu chưa làm thay đổi tồn kho. Lô tạm dừng bán, giữ hàng, soạn hàng và xuất kho.</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><p>Lô hàng: <Link className="text-emerald-700 underline" to={ROUTES.OPERATION_PRODUCT_BATCH_DETAIL.replace(':id', String(data.summary.productBatchId))}>{data.summary.batchCode}</Link><br />{data.summary.productName}</p><p>Nguyên nhân: {adjustmentTypes[data.summary.adjustmentType] ?? data.summary.adjustmentType}</p><p>Người lập: {data.summary.createdBy}<br />Thời gian: {time(data.summary.createdAt)}</p><p>Tồn ghi nhận: <strong>{pickingKg(data.summary.systemQuantity)}</strong></p><p>{data.summary.requestKind === 'DISPOSAL' ? 'Đề nghị loại bỏ' : 'Chênh lệch'}: <strong>{pickingKg(data.summary.requestKind === 'DISPOSAL' ? data.summary.systemQuantity : data.summary.differenceQuantity)}</strong></p><p>Tồn đề nghị sau duyệt: <strong>{pickingKg(data.summary.actualQuantity)}</strong></p></div>
        <div><h3 className="font-bold">Lý do</h3><p className="mt-2 whitespace-pre-wrap break-words">{data.reason}</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50"><tr>{['Vị trí', 'Trước (kg)', 'Đề nghị sau (kg)', 'Chênh lệch (kg)', 'Lượng giữ khi lập phiếu'].map(t => <th className="p-3" key={t}>{t}</th>)}</tr></thead><tbody>{data.lines.map(l => <tr key={l.inventoryId} className="border-t border-slate-100"><td className="p-3">{l.locationCode}</td><td className="p-3">{pickingKg(l.systemQuantity)}</td><td className="p-3">{pickingKg(l.actualQuantity)}</td><td className="p-3">{pickingKg(l.differenceQuantity)}</td><td className="p-3">{l.reservedQuantity === null ? 'Chưa ghi nhận' : pickingKg(l.reservedQuantity)}</td></tr>)}</tbody></table></div>
      </section>
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Ảnh bằng chứng</h2>{data.images.length ? <div className="flex flex-wrap gap-4">{data.images.map((i, index) => <a key={i.id} href={i.url} target="_blank" rel="noreferrer"><img className="h-36 w-48 rounded-lg object-cover" src={i.url} alt={`Bằng chứng ${index + 1}`} /></a>)}</div> : <p className="text-slate-500">Không có ảnh bằng chứng.</p>}</section>
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Kết quả xử lý của quản lý kho</h2>{data.summary.status === 'PENDING' ? <p className="text-slate-500">Chưa có quyết định.</p> : <><p>Người xử lý: {data.reviewedBy ?? 'Chưa ghi nhận'}</p><p>Thời gian: {time(data.reviewedAt)}</p><p className="whitespace-pre-wrap break-words">Ghi chú / lý do từ chối: {data.reviewNote ?? 'Chưa ghi nhận'}</p></>}</section>
    </>}
  </div>
}
