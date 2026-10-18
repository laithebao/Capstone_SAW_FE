import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Plus } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { getAdjustmentLocations, getAdjustments } from '@/services/stockAdjustmentService'
import { getAdjustmentReviewLocations, getAdjustmentReviews } from '@/services/stockAdjustmentReviewService'
import { getAuthErrorMessage } from '@/services/authService'
import { WarehouseDetailLink, WarehouseListFilters, warehouseFilterInput as issueInput } from '@/features/operation/components/WarehouseListControls'
import { AdjustmentStatus } from '@/features/operation/components/StockAdjustmentPresentation'
import { adjustmentTypes } from '@/features/operation/stockAdjustmentFormat'
import { pickingTime, pickingKg } from '@/features/operation/pickingFormat'
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
  return <div className="mx-auto max-w-[1600px] space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold text-emerald-700">{manager ? 'QUẢN LÝ KHO · PHÊ DUYỆT' : 'VẬN HÀNH · ĐIỀU CHỈNH TỒN'}</p><h1 className="mt-1 text-xl font-bold">{manager ? 'Duyệt điều chỉnh tồn kho' : 'Yêu cầu điều chỉnh tồn kho'}</h1><p className="mt-1 text-sm text-slate-500">Theo dõi điều chỉnh kiểm đếm và đề nghị loại bỏ toàn lô.</p></div>{!manager && <Link className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800" to={ROUTES.OPERATION_STOCK_ADJUSTMENT_CREATE}><Plus className="size-4" aria-hidden="true" />Tạo yêu cầu</Link>}</header>
    <WarehouseListFilters onReset={() => { setFilters(initial); setQuery({ page: 1, pageSize: query.pageSize, sortBy: initial.sortBy }); setReload(x => x + 1) }} onSubmit={e => { e.preventDefault(); setQuery({ search: filters.search || undefined, productBatchId: Number(filters.productBatchId) || undefined, warehouseLocationId: Number(filters.warehouseLocationId) || undefined, requestKind: filters.requestKind || undefined, adjustmentType: filters.adjustmentType || undefined, status: filters.status || undefined, fromDate: filters.fromDate || undefined, toDate: filters.toDate || undefined, sortBy: filters.sortBy, page: 1, pageSize: query.pageSize }) }}>
      <label className="grid gap-1 text-xs text-slate-500">Tìm mã phiếu / lô / lý do<input aria-label="Tìm phiếu điều chỉnh" className={issueInput} maxLength={100} value={filters.search} onChange={e => change('search', e.target.value)} /></label>
      <label className="grid gap-1 text-xs text-slate-500">Loại yêu cầu<select className={issueInput} value={filters.requestKind} onChange={e => change('requestKind', e.target.value)}><option value="">Tất cả</option><option value="COUNT">Điều chỉnh kiểm đếm</option><option value="DISPOSAL">Loại bỏ toàn lô</option></select></label>
      <label className="grid gap-1 text-xs text-slate-500">Trạng thái<select className={issueInput} value={filters.status} onChange={e => change('status', e.target.value)}><option value="">Tất cả</option><option value="PENDING">Chờ duyệt</option><option value="APPROVED">Đã duyệt</option><option value="REJECTED">Đã từ chối</option></select></label>
      <label className="grid gap-1 text-xs text-slate-500">Vị trí<select className={issueInput} value={filters.warehouseLocationId} onChange={e => change('warehouseLocationId', e.target.value)}><option value="">Tất cả vị trí</option>{locations.map(l => <option key={l.id} value={l.id}>{l.code}</option>)}</select></label>
      <label className="grid gap-1 text-xs text-slate-500">Nguyên nhân<select className={issueInput} value={filters.adjustmentType} onChange={e => change('adjustmentType', e.target.value)}><option value="">Tất cả nguyên nhân</option>{Object.entries(adjustmentTypes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label className="grid gap-1 text-xs text-slate-500">Sắp xếp<select className={issueInput} value={filters.sortBy} onChange={e => change('sortBy', e.target.value)}><option value="createdDesc">Mới nhất</option><option value="createdAsc">Cũ nhất</option><option value="codeAsc">Mã tăng dần</option><option value="codeDesc">Mã giảm dần</option></select></label>
      <label className="grid gap-1 text-xs text-slate-500">Từ ngày<input type="date" className={issueInput} value={filters.fromDate} max={filters.toDate || undefined} onChange={e => change('fromDate', e.target.value)} /></label><label className="grid gap-1 text-xs text-slate-500">Đến ngày<input type="date" className={issueInput} value={filters.toDate} min={filters.fromDate || undefined} onChange={e => change('toDate', e.target.value)} /></label>
    </WarehouseListFilters>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">{error}<button className="ml-3 underline" onClick={() => setReload(x => x + 1)}>Thử lại</button></p>}
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><h2 className="border-b border-slate-100 p-4 font-semibold">Danh sách yêu cầu {data && `(${data.totalCount})`}</h2>
      {loading ? <p role="status" className="p-8">Đang tải...</p> : !error && (!data?.items.length ? <p className="p-8 text-slate-500">Chưa có phiếu điều chỉnh phù hợp.</p> : <><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Phiếu / loại', 'Lô / vị trí', 'Chênh lệch / loại bỏ', 'Người lập', 'Thời gian', 'Trạng thái', 'Thao tác'].map((v, i) => <th className={`p-4 ${v === 'Thao tác' ? 'text-center' : ''}`} key={i}>{v}</th>)}</tr></thead><tbody>{data.items.map(a => <tr key={a.id} className="border-t border-slate-100 align-middle hover:bg-slate-50"><td className="max-w-64 break-words p-4"><p className="break-all font-mono font-semibold text-emerald-700">{a.adjustmentCode}</p><p>{a.requestKind === 'DISPOSAL' ? 'Loại bỏ toàn lô' : 'Điều chỉnh kiểm đếm'}</p></td><td className="max-w-64 p-4"><p>{a.batchCode} · {a.productName}</p><p className="text-slate-500">{a.locations}</p></td><td className="p-4">{a.requestKind === 'DISPOSAL' ? `Đề nghị loại bỏ ${pickingKg(a.systemQuantity)}` : `${a.differenceQuantity > 0 ? '+' : ''}${pickingKg(a.differenceQuantity)}`}</td><td className="max-w-40 break-words p-4">{a.createdBy}</td><td className="whitespace-nowrap p-4"><p>{pickingTime(a.createdAt).split(' ').at(-1)}</p><p className="mt-1 text-xs text-slate-500">{pickingTime(a.createdAt).split(' ')[0]}</p></td><td className="p-4"><AdjustmentStatus status={a.status} />{a.workState && <p className="mt-2 text-xs text-slate-600">{{ PENDING_CUSTOMER: 'Chờ khách phản hồi', CUSTOMER_ACCEPTED: 'Khách đồng ý · chờ quản lý', CUSTOMER_DECLINED: 'Đơn đã hủy · chờ duyệt tồn', REJECTED_HELD: 'Vẫn tạm dừng · cần kiểm tra lại', PENDING_MANAGER: 'Chờ quản lý', RESOLVED: 'Đã xử lý', REPLACED: 'Đã có phiếu thay thế', CLEARED: 'Đã xác minh' }[a.workState] ?? 'Đang xử lý'}{a.orderCode && <span className="block">{a.orderCode}</span>}</p>}</td><td className="p-4 text-center"><WarehouseDetailLink label={`Xem chi tiết phiếu ${a.adjustmentCode}`} to={(manager ? ROUTES.WAREHOUSE_STOCK_ADJUSTMENT_DETAIL : ROUTES.OPERATION_STOCK_ADJUSTMENT_DETAIL).replace(':id', String(a.id))} /></td></tr>)}</tbody></table></div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-sm"><label>Số dòng <select aria-label="Số dòng mỗi trang" className="ml-2 rounded border border-slate-200 p-1" value={query.pageSize} onChange={e => setQuery(old => ({ ...old, page: 1, pageSize: Number(e.target.value) }))}><option>20</option><option>50</option><option>100</option></select></label><div className="flex items-center gap-3"><button className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40" disabled={query.page <= 1} onClick={() => setQuery(old => ({ ...old, page: old.page - 1 }))}>Trước</button><span>{query.page}/{Math.max(1, Math.ceil(data.totalCount / query.pageSize))}</span><button className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40" disabled={query.page * query.pageSize >= data.totalCount} onClick={() => setQuery(old => ({ ...old, page: old.page + 1 }))}>Sau</button></div></div></>)}
    </section>
  </div>
}
