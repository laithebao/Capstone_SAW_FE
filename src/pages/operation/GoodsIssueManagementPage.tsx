import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Plus, PackageOpen } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { getGoodsIssueLocations, getGoodsIssues } from '@/services/goodsIssueService'
import { getAuthErrorMessage } from '@/services/authService'
import { GoodsIssueStatus } from '@/features/operation/components/GoodsIssueForm'
import { WarehouseDetailLink, warehouseFilterInput as issueInput } from '@/features/operation/components/WarehouseListControls'
import { OperationSmartFilters } from '@/features/operation/components/OperationSmartFilters'
import { pickingDate, pickingKg } from '@/features/operation/pickingFormat'
import type { GoodsIssueQuery, GoodsIssueSummary } from '@/types/goodsIssue'
import type { PagedResponse } from '@/types/api'

const issueTabs = [{ value: '', label: 'Tất cả' }, { value: 'DRAFT', label: 'Nháp' }, { value: 'COMMITTED', label: 'Đã xác nhận' }, { value: 'CANCELLED', label: 'Đã vô hiệu' }]
const issueCount = async (status: string, signal: AbortSignal) => (await getGoodsIssues({ status: status || undefined, sortBy: 'issuedAtDesc', page: 1, pageSize: 1 }, signal)).totalCount
const initial = { search: '', status: '', warehouseLocationId: '', fromDate: '', toDate: '', sortBy: 'issuedAtDesc' }
export default function GoodsIssueManagementPage() {
  const [filters, setFilters] = useState(initial)
  const [query, setQuery] = useState<GoodsIssueQuery>({ page: 1, pageSize: 20, sortBy: 'issuedAtDesc' })
  const [data, setData] = useState<PagedResponse<GoodsIssueSummary> | null>(null)
  const [locations, setLocations] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true); setError('')
      try { const [rows, places] = await Promise.all([getGoodsIssues(query, controller.signal), getGoodsIssueLocations(controller.signal)]); if (!controller.signal.aborted) { setData(rows); setLocations(places) } }
      catch (e) { if (!controller.signal.aborted) setError(getAuthErrorMessage(e, 'Không thể tải danh sách phiếu xuất.')) }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }, 0)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [query, reload])
  useEffect(() => { const timer = window.setTimeout(() => { setQuery(old => old.search === (filters.search || undefined) ? old : { ...old, search: filters.search || undefined, page: 1 }) }, 300); return () => window.clearTimeout(timer) }, [filters.search])
  const change = (key: keyof typeof initial, value: string) => setFilters(old => ({ ...old, [key]: value }))
  return <div className="mx-auto max-w-[1600px] space-y-4">
    <header className="op-page-header flex flex-wrap items-center justify-between gap-4"><span className="op-heading-icon"><PackageOpen /></span><div className="op-page-heading"><p className="text-xs font-bold text-emerald-700">VẬN HÀNH · XUẤT KHO</p><h1 className="mt-1 text-xl font-bold">Quản lý phiếu xuất kho</h1><p className="mt-1 text-sm text-slate-500">Theo dõi phiếu nháp và các lần xuất kho đã xác nhận.</p></div><Link to={ROUTES.OPERATION_GOODS_ISSUE_CREATE} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"><Plus className="size-4" aria-hidden="true" />Tạo phiếu xuất</Link></header>
    <OperationSmartFilters tabs={issueTabs} status={query.status || ''} loadCount={issueCount} onStatus={status => { setFilters(old => ({ ...old, status })); setQuery(old => ({ ...old, status: status || undefined, page: 1 })) }}
      quick={<><label className="op-quick-field">Tìm kiếm<input className={issueInput} maxLength={100} placeholder="Mã phiếu, mã đơn hoặc mã lô" value={filters.search} onChange={e => change('search', e.target.value)} /></label><label className="op-quick-field">Vị trí kho<select className={issueInput} value={filters.warehouseLocationId} onChange={e => { const value = e.target.value; change('warehouseLocationId', value); setQuery(old => ({ ...old, warehouseLocationId: Number(value) || undefined, page: 1 })) }}><option value="">Tất cả vị trí</option>{locations.map(l => <option value={l.id} key={l.id}>{l.name}</option>)}</select></label></>}
      advanced={<><label>Từ ngày<input type="date" className={issueInput} value={filters.fromDate} max={filters.toDate || undefined} onChange={e => change('fromDate', e.target.value)} /></label><label>Đến ngày<input type="date" className={issueInput} value={filters.toDate} min={filters.fromDate || undefined} onChange={e => change('toDate', e.target.value)} /></label><label>Sắp xếp<select className={issueInput} value={filters.sortBy} onChange={e => change('sortBy', e.target.value)}><option value="issuedAtDesc">Ngày xuất mới nhất</option><option value="issuedAtAsc">Ngày xuất cũ nhất</option><option value="idDesc">Phiếu tạo mới nhất</option><option value="idAsc">Phiếu tạo cũ nhất</option></select></label></>}
      chips={[...(query.search ? [{label: `Tìm: ${query.search}`, remove: () => { change('search', ''); setQuery(old => ({ ...old, search: undefined, page: 1 })) }}] : []), ...(query.sortBy !== 'issuedAtDesc' ? [{label: `Sắp xếp: ${ {issuedAtAsc: 'Ngày xuất cũ nhất', idDesc: 'Phiếu tạo mới nhất', idAsc: 'Phiếu tạo cũ nhất'}[query.sortBy] || query.sortBy }`, remove: () => { change('sortBy', 'issuedAtDesc'); setQuery(old => ({ ...old, sortBy: 'issuedAtDesc', page: 1 })) }}] : []), ...(query.warehouseLocationId ? [{label: locations.find(item => item.id === query.warehouseLocationId)?.name || 'Vị trí kho', remove: () => { change('warehouseLocationId', ''); setQuery(old => ({ ...old, warehouseLocationId: undefined, page: 1 })) }}] : []), ...(['fromDate','toDate'] as const).flatMap(key => query[key] ? [{label: `${key === 'fromDate' ? 'Từ' : 'Đến'} ${query[key]}`, remove: () => { change(key, ''); setQuery(old => ({ ...old, [key]: undefined, page: 1 })) }}] : [])]}
      onApply={() => { if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) return false; setQuery(old => ({ ...old, fromDate: filters.fromDate || undefined, toDate: filters.toDate || undefined, sortBy: filters.sortBy, page: 1 })); return true }} />
    {error && <div role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">{error}<button className="ml-3 underline" onClick={() => setReload(x => x + 1)}>Thử lại</button></div>}
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><h2 className="border-b border-slate-100 p-4 font-semibold">Danh sách phiếu xuất {data && <span className="text-sm font-normal text-slate-500">({data.totalCount})</span>}</h2>
      {loading && !data ? <p role="status" className="p-8 text-center">Đang tải...</p> : !error && (!data?.items.length ? <p className="p-8 text-center text-slate-500">Chưa có phiếu xuất phù hợp.</p> : <><div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Phiếu / đơn hàng', 'Nhà phân phối', 'Khối lượng', 'Ngày xuất', 'Người lập', 'Trạng thái', 'Thao tác'].map(s => <th key={s} className={`p-4 ${s === 'Thao tác' ? 'text-center' : ''}`}>{s}</th>)}</tr></thead><tbody>{data.items.map(g => <tr className="border-t border-slate-100 align-middle hover:bg-slate-50" key={g.id}><td className="max-w-64 break-words p-4"><p className="break-all font-mono font-semibold text-emerald-700">{g.issueCode}</p><p>{g.orderCode}</p></td><td className="p-4">{g.distributorName}</td><td className="p-4">{pickingKg(g.weightInKg)}</td><td className="p-4">{pickingDate(g.issuedDate)}</td><td className="p-4">{g.operationStaffName}</td><td className="p-4"><GoodsIssueStatus status={g.issueStatus} /></td><td className="p-4 text-center"><WarehouseDetailLink label={`${g.issueStatus === 'DRAFT' ? 'Mở phiếu nháp' : 'Xem chi tiết'} ${g.issueCode}`} to={ROUTES.OPERATION_GOODS_ISSUE_DETAIL.replace(':id', String(g.id))} /></td></tr>)}</tbody></table></div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-sm"><label>Số dòng <select aria-label="Số dòng mỗi trang" className="ml-2 rounded border border-slate-200 p-1" value={query.pageSize} onChange={e => setQuery(old => ({ ...old, page: 1, pageSize: Number(e.target.value) }))}><option>20</option><option>50</option><option>100</option></select></label><div className="flex items-center gap-3"><button disabled={query.page <= 1} className="rounded border px-3 py-1 disabled:opacity-40" onClick={() => setQuery(old => ({ ...old, page: old.page - 1 }))}>Trước</button><span>{query.page}/{Math.max(1, Math.ceil(data.totalCount / query.pageSize))}</span><button disabled={query.page * query.pageSize >= data.totalCount} className="rounded border px-3 py-1 disabled:opacity-40" onClick={() => setQuery(old => ({ ...old, page: old.page + 1 }))}>Sau</button></div></div></>)}
    </section>
  </div>
}
