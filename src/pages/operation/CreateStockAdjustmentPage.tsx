import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { getAdjustmentBatches, getAdjustmentScope } from '@/services/stockAdjustmentService'
import { getAuthErrorMessage } from '@/services/authService'
import { issueInput } from '@/features/operation/components/GoodsIssueForm'
import StockAdjustmentForm from '@/features/operation/components/StockAdjustmentForm'
import { pickingKg } from '@/features/operation/pickingFormat'
import type { AdjustmentBatch, AdjustmentKind, AdjustmentScope, AdjustmentStock } from '@/types/stockAdjustment'
import type { PagedResponse } from '@/types/api'

export default function CreateStockAdjustmentPage() {
  const navigate = useNavigate(), [params] = useSearchParams()
  const [batchId, setBatchId] = useState(Number(params.get('batchId')) || 0), [kind, setKind] = useState<AdjustmentKind>(params.get('kind') === 'DISPOSAL' ? 'DISPOSAL' : 'COUNT')
  const [inventoryId, setInventoryId] = useState(0), [stocks, setStocks] = useState<AdjustmentStock[]>([])
  const [search, setSearch] = useState(''), [query, setQuery] = useState({ search: '', page: 1 })
  const [batches, setBatches] = useState<PagedResponse<AdjustmentBatch> | null>(null), [scope, setScope] = useState<AdjustmentScope | null>(null)
  const [loading, setLoading] = useState(false), [error, setError] = useState(''), [reload, setReload] = useState(0), [busy, setBusy] = useState(false)
  useEffect(() => {
    const c = new AbortController()
    const timer = setTimeout(async () => {
      try { const rows = await getAdjustmentBatches(query.search, query.page, c.signal); if (!c.signal.aborted) setBatches(rows) }
      catch (e) { if (!c.signal.aborted) setError(getAuthErrorMessage(e, 'Không thể tải lô còn tồn.')) }
    }, 0)
    return () => { c.abort(); clearTimeout(timer) }
  }, [query, reload])
  useEffect(() => {
    if (batchId <= 0) return
    const c = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true); setError('')
      try { const s = await getAdjustmentScope(batchId, kind, kind === 'COUNT' && inventoryId > 0 ? inventoryId : undefined, c.signal); if (!c.signal.aborted) { setScope(s); if (inventoryId === 0) { setStocks(s.stocks); if (kind === 'COUNT' && s.stocks.length === 1) { setScope(null); setInventoryId(s.stocks[0].inventoryId) } } } }
      catch (e) { if (!c.signal.aborted) { setError(getAuthErrorMessage(e, 'Không thể tải phạm vi tồn kho.')) } }
      finally { if (!c.signal.aborted) setLoading(false) }
    }, 0)
    return () => { c.abort(); clearTimeout(timer) }
  }, [batchId, kind, inventoryId, reload])
  const reset = () => { setScope(null); setStocks([]); setInventoryId(0); setError('') }
  return <div className="space-y-6"><header className="flex flex-wrap justify-between gap-4"><div><p className="text-sm font-semibold text-emerald-700">VẬN HÀNH · ĐIỀU CHỈNH TỒN</p><h1 className="mt-2 text-3xl font-bold">Tạo yêu cầu điều chỉnh</h1></div><Link to={ROUTES.OPERATION_STOCK_ADJUSTMENTS} className="h-fit rounded-lg border border-slate-300 bg-white px-4 py-2">Quay lại danh sách</Link></header>
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Chọn phạm vi xử lý</h2><fieldset disabled={busy} className="space-y-4"><label className="block">Loại yêu cầu<select aria-label="Loại yêu cầu" className={issueInput} value={kind} onChange={e => { reset(); setKind(e.target.value as AdjustmentKind) }}><option value="COUNT">Điều chỉnh kiểm đếm / hao hụt</option><option value="DISPOSAL">Loại bỏ toàn bộ lô hết hạn / hư hỏng</option></select></label>
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); setQuery({ search, page: 1 }) }}><input aria-label="Tìm lô điều chỉnh" className={issueInput} maxLength={100} placeholder="Mã lô / tên sản phẩm" value={search} onChange={e => setSearch(e.target.value)} /><button className="shrink-0 rounded-lg border border-slate-300 px-4">Tìm lô</button></form>
      <label className="block">Lô hàng<select aria-label="Lô hàng điều chỉnh" className={issueInput} value={batchId || ''} onChange={e => { reset(); setBatchId(Number(e.target.value)) }}><option value="">Chọn lô hàng</option>{scope && scope.batch.id === batchId && !batches?.items.some(b => b.id === batchId) && <option value={batchId}>{scope.batch.batchCode} · {scope.batch.productName}</option>}{batches?.items.map(b => <option key={b.id} value={b.id}>{b.batchCode} · {b.productName} · {pickingKg(b.quantityKg)}</option>)}</select></label>
      {batches && <div className="flex gap-3 text-sm"><button disabled={query.page <= 1} onClick={() => setQuery(q => ({ ...q, page: q.page - 1 }))}>Trang trước</button><span>{query.page}/{Math.max(1, Math.ceil(batches.totalCount / batches.pageSize))}</span><button disabled={query.page * batches.pageSize >= batches.totalCount} onClick={() => setQuery(q => ({ ...q, page: q.page + 1 }))}>Trang sau</button></div>}
      {kind === 'COUNT' && batchId > 0 && stocks.length > 1 && <label className="block">Vị trí kiểm đếm<select aria-label="Vị trí kiểm đếm" className={issueInput} value={inventoryId || ''} onChange={e => { setScope(null); setInventoryId(Number(e.target.value)) }}><option value="">Chọn vị trí</option>{stocks.map(i => <option key={i.inventoryId} value={i.inventoryId}>{i.locationCode} · {pickingKg(i.systemQuantityKg)}</option>)}</select></label>}
    </fieldset></section>
    {loading && <p role="status">Đang tải tồn kho...</p>}{error && <p role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">{error}<button className="ml-3 underline" onClick={() => setReload(x => x + 1)}>Thử lại</button></p>}
    {batchId > 0 && scope?.batch.id === batchId && <><section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-bold">{scope.batch.batchCode} · {scope.batch.productName}</h2><p>Hạn sử dụng: {scope.batch.expiryDate ? new Date(scope.batch.expiryDate + 'T00:00:00').toLocaleDateString('vi-VN') : 'Chưa ghi nhận'} · Tổng tồn lô: {pickingKg(scope.batch.quantityKg)}</p><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-slate-50"><tr>{['Vị trí', 'Tồn hệ thống', 'Đang giữ', 'Hoạt động'].map(t => <th className="p-3" key={t}>{t}</th>)}</tr></thead><tbody>{scope.stocks.map(i => <tr className="border-t border-slate-100" key={i.inventoryId}><td className="p-3">{i.locationCode}</td><td className="p-3">{pickingKg(i.systemQuantityKg)}</td><td className="p-3">{pickingKg(i.reservedQuantityKg)}</td><td className="p-3">{i.locationStatus === 'ACTIVE' ? 'Đang hoạt động' : 'Ngừng hoạt động'}</td></tr>)}</tbody></table></div></section>
      {(kind === 'DISPOSAL' || inventoryId > 0) && <StockAdjustmentForm key={`${batchId}-${kind}-${inventoryId}`} scope={scope} replaces={Number(params.get('replaces')) || undefined} kind={kind} inventoryId={inventoryId || null} refreshing={loading || !!error} onBusy={setBusy} onSaved={a => navigate(ROUTES.OPERATION_STOCK_ADJUSTMENT_DETAIL.replace(':id', String(a.summary.id)), { state: { created: true } })} onReload={() => setReload(x => x + 1)} />}</>}
  </div>
}
