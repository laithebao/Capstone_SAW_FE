import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { getAdjustmentLocations, getAdjustments } from '@/services/stockAdjustmentService'
import { getAdjustmentReviewLocations, getAdjustmentReviews } from '@/services/stockAdjustmentReviewService'
import { getAuthErrorMessage } from '@/services/authService'
import { issueInput } from '@/features/operation/components/GoodsIssueForm'
import { AdjustmentStatus } from '@/features/operation/components/StockAdjustmentPresentation'
import { adjustmentTypes } from '@/features/operation/stockAdjustmentFormat'
import { pickingDate, pickingKg } from '@/features/operation/pickingFormat'
import type { AdjustmentQuery, AdjustmentSummary } from '@/types/stockAdjustment'
import type { PagedResponse } from '@/types/api'

const initial = { search: '', productBatchId: '', warehouseLocationId: '', requestKind: '', adjustmentType: '', status: '', fromDate: '', toDate: '', sortBy: 'createdDesc' }
export default function StockAdjustmentManagementPage({ manager = false }: { manager?: boolean }) {
  const [filters, setFilters] = useState(initial)
  const [query, setQuery] = useState<AdjustmentQuery>({ page: 1, pageSize: 20, sortBy: 'createdDesc' })
  const [data, setData] = useState<PagedResponse<AdjustmentSummary> | null>(null)
  const [locations, setLocations] = useState<{ id: number; code: string }[]>([])
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [reload, setReload] = useState(0)
  useEffect(() => {
    const c = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true); setError('')
      try { const [rows, places] = await Promise.all([manager ? getAdjustmentReviews(query, c.signal) : getAdjustments(query, c.signal), manager ? getAdjustmentReviewLocations(c.signal) : getAdjustmentLocations(c.signal)]); if (!c.signal.aborted) { setData(rows); setLocations(places) } }
      catch (e) { if (!c.signal.aborted) setError(getAuthErrorMessage(e, 'Không thể tải phiếu điều chỉnh.')) }
      finally { if (!c.signal.aborted) setLoading(false) }
    }, 0)
    return () => { c.abort(); clearTimeout(timer) }
  }, [query, reload, manager])
  const change = (key: keyof typeof initial, value: string) => setFilters(old => ({ ...old, [key]: value }))
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-semibold text-emerald-700">{manager ? 'QUẢN LÝ KHO · PHÊ DUYỆT' : 'VẬN HÀNH · ĐIỀU CHỈNH TỒN'}</p><h1 className="mt-2 text-3xl font-bold">{manager ? 'Duyệt điều chỉnh tồn kho' : 'Yêu cầu điều chỉnh tồn kho'}</h1><p className="mt-2 text-slate-500">Theo dõi điều chỉnh kiểm đếm và đề nghị loại bỏ toàn lô.</p></div>{!manager && <Link className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white" to={ROUTES.OPERATION_STOCK_ADJUSTMENT_CREATE}>Tạo yêu cầu</Link>}</header>
    <form className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3" onSubmit={e => { e.preventDefault(); setQuery({ search: filters.search || undefined, productBatchId: Number(filters.productBatchId) || undefined, warehouseLocationId: Number(filters.warehouseLocationId) || undefined, requestKind: filters.requestKind || undefined, adjustmentType: filters.adjustmentType || undefined, status: filters.status || undefined, fromDate: filters.fromDate || undefined, toDate: filters.toDate || undefined, sortBy: filters.sortBy, page: 1, pageSize: query.pageSize }) }}>
      <label>Tìm mã phiếu / lô / lý do<input aria-label="Tìm phiếu điều chỉnh" className={issueInput} maxLength={100} value={filters.search} onChange={e => change('search', e.target.value)} /></label>
      <label>Loại yêu cầu<select className={issueInput} value={filters.requestKind} onChange={e => change('requestKind', e.target.value)}><option value="">Tất cả</option><option value="COUNT">Điều chỉnh kiểm đếm</option><option value="DISPOSAL">Loại bỏ toàn lô</option></select></label>
      <label>Trạng thái<select className={issueInput} value={filters.status} onChange={e => change('status', e.target.value)}><option value="">Tất cả</option><option value="PENDING">Chờ duyệt</option><option value="APPROVED">Đã duyệt</option><option value="REJECTED">Đã từ chối</option></select></label>
      <label>Vị trí<select className={issueInput} value={filters.warehouseLocationId} onChange={e => change('warehouseLocationId', e.target.value)}><option value="">Tất cả vị trí</option>{locations.map(l => <option key={l.id} value={l.id}>{l.code}</option>)}</select></label>
      <label>Nguyên nhân<select className={issueInput} value={filters.adjustmentType} onChange={e => change('adjustmentType', e.target.value)}><option value="">Tất cả nguyên nhân</option>{Object.entries(adjustmentTypes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label>Sắp xếp<select className={issueInput} value={filters.sortBy} onChange={e => change('sortBy', e.target.value)}><option value="createdDesc">Mới nhất</option><option value="createdAsc">Cũ nhất</option><option value="codeAsc">Mã tăng dần</option><option value="codeDesc">Mã giảm dần</option></select></label>
      <label>Từ ngày<input type="date" className={issueInput} value={filters.fromDate} max={filters.toDate || undefined} onChange={e => change('fromDate', e.target.value)} /></label><label>Đến ngày<input type="date" className={issueInput} value={filters.toDate} min={filters.fromDate || undefined} onChange={e => change('toDate', e.target.value)} /></label>
      <div className="flex items-end gap-2"><button className="rounded-lg bg-emerald-700 px-4 py-2 text-white">Áp dụng bộ lọc</button><button type="button" className="rounded-lg border border-slate-300 px-4 py-2" onClick={() => { setFilters(initial); setQuery({ page: 1, pageSize: 20, sortBy: 'createdDesc' }) }}>Xóa bộ lọc</button></div>
    </form>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">{error}<button className="ml-3 underline" onClick={() => setReload(x => x + 1)}>Thử lại</button></p>}
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><h2 className="border-b border-slate-100 p-5 text-lg font-bold">Danh sách yêu cầu {data && `(${data.totalCount})`}</h2>
      {loading ? <p role="status" className="p-8">Đang tải...</p> : !error && (!data?.items.length ? <p className="p-8 text-slate-500">Chưa có phiếu điều chỉnh phù hợp.</p> : <><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{['Phiếu / loại', 'Lô / vị trí', 'Chênh lệch / loại bỏ', 'Người lập', 'Thời gian', 'Trạng thái', ''].map((v, i) => <th className="p-4" key={i}>{v}</th>)}</tr></thead><tbody>{data.items.map(a => <tr key={a.id} className="border-t border-slate-100"><td className="max-w-64 break-words p-4"><p className="font-mono font-semibold text-emerald-700">{a.adjustmentCode}</p><p>{a.requestKind === 'DISPOSAL' ? 'Loại bỏ toàn lô' : 'Điều chỉnh kiểm đếm'}</p></td><td className="max-w-64 p-4"><p>{a.batchCode} · {a.productName}</p><p className="text-slate-500">{a.locations}</p></td><td className="p-4">{a.requestKind === 'DISPOSAL' ? `Đề nghị loại bỏ ${pickingKg(a.systemQuantity)}` : `${a.differenceQuantity > 0 ? '+' : ''}${pickingKg(a.differenceQuantity)}`}</td><td className="p-4">{a.createdBy}</td><td className="p-4">{pickingDate(a.createdAt)}</td><td className="p-4"><AdjustmentStatus status={a.status} /></td><td className="p-4"><Link className="text-emerald-700 underline" to={(manager ? ROUTES.WAREHOUSE_STOCK_ADJUSTMENT_DETAIL : ROUTES.OPERATION_STOCK_ADJUSTMENT_DETAIL).replace(':id', String(a.id))}>Xem chi tiết</Link></td></tr>)}</tbody></table></div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4"><label>Số dòng <select value={query.pageSize} onChange={e => setQuery(old => ({ ...old, page: 1, pageSize: Number(e.target.value) }))}><option>20</option><option>50</option><option>100</option></select></label><div className="flex gap-3"><button disabled={query.page <= 1} onClick={() => setQuery(old => ({ ...old, page: old.page - 1 }))}>Trước</button><span>{query.page}/{Math.max(1, Math.ceil(data.totalCount / query.pageSize))}</span><button disabled={query.page * query.pageSize >= data.totalCount} onClick={() => setQuery(old => ({ ...old, page: old.page + 1 }))}>Sau</button></div></div></>)}
    </section>
  </div>
}
