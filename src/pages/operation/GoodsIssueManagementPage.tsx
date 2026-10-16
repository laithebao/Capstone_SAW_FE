import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { getGoodsIssueLocations, getGoodsIssues } from '@/services/goodsIssueService'
import { getAuthErrorMessage } from '@/services/authService'
import { GoodsIssueStatus, issueInput } from '@/features/operation/components/GoodsIssueForm'
import { pickingDate, pickingKg } from '@/features/operation/pickingFormat'
import type { GoodsIssueQuery, GoodsIssueSummary } from '@/types/goodsIssue'
import type { PagedResponse } from '@/types/api'

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
  const change = (key: keyof typeof initial, value: string) => setFilters(old => ({ ...old, [key]: value }))
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-semibold text-emerald-700">VẬN HÀNH · XUẤT KHO</p><h1 className="mt-2 text-3xl font-bold">Quản lý phiếu xuất kho</h1><p className="mt-2 text-slate-500">Theo dõi phiếu nháp và các lần xuất kho đã xác nhận.</p></div><Link to={ROUTES.OPERATION_GOODS_ISSUE_CREATE} className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white">Tạo phiếu xuất</Link></header>
    <form className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3" onSubmit={e => { e.preventDefault(); setQuery({ search: filters.search || undefined, status: filters.status || undefined, warehouseLocationId: Number(filters.warehouseLocationId) || undefined, fromDate: filters.fromDate || undefined, toDate: filters.toDate || undefined, sortBy: filters.sortBy, page: 1, pageSize: query.pageSize }); setReload(x => x + 1) }}>
      <label className="space-y-2 text-sm">Tìm kiếm<input className={issueInput} maxLength={100} placeholder="Mã phiếu, mã đơn hoặc mã lô" value={filters.search} onChange={e => change('search', e.target.value)} /></label>
      <label className="space-y-2 text-sm">Trạng thái<select className={issueInput} value={filters.status} onChange={e => change('status', e.target.value)}><option value="">Tất cả</option><option value="DRAFT">Phiếu nháp</option><option value="COMMITTED">Đã xác nhận xuất kho</option></select></label>
      <label className="space-y-2 text-sm">Vị trí kho<select className={issueInput} value={filters.warehouseLocationId} onChange={e => change('warehouseLocationId', e.target.value)}><option value="">Tất cả vị trí</option>{locations.map(l => <option value={l.id} key={l.id}>{l.name}</option>)}</select></label>
      <label className="space-y-2 text-sm">Từ ngày<input type="date" className={issueInput} value={filters.fromDate} max={filters.toDate || undefined} onChange={e => change('fromDate', e.target.value)} /></label><label className="space-y-2 text-sm">Đến ngày<input type="date" className={issueInput} value={filters.toDate} min={filters.fromDate || undefined} onChange={e => change('toDate', e.target.value)} /></label>
      <label className="space-y-2 text-sm">Sắp xếp<select className={issueInput} value={filters.sortBy} onChange={e => change('sortBy', e.target.value)}><option value="issuedAtDesc">Ngày xuất mới nhất</option><option value="issuedAtAsc">Ngày xuất cũ nhất</option><option value="idDesc">Phiếu tạo mới nhất</option><option value="idAsc">Phiếu tạo cũ nhất</option></select></label>
      <div className="flex flex-wrap gap-2 md:col-span-3"><button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Áp dụng bộ lọc</button><button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => { setFilters(initial); setQuery({ page: 1, pageSize: 20, sortBy: 'issuedAtDesc' }); setReload(x => x + 1) }}>Xóa bộ lọc</button></div>
    </form>
    {error && <div role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">{error}<button className="ml-3 underline" onClick={() => setReload(x => x + 1)}>Thử lại</button></div>}
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><h2 className="border-b p-5 text-lg font-bold">Danh sách phiếu xuất {data && <span className="text-sm font-normal text-slate-500">({data.totalCount})</span>}</h2>
      {loading ? <p role="status" className="p-8 text-center">Đang tải...</p> : !error && (!data?.items.length ? <p className="p-8 text-center text-slate-500">Chưa có phiếu xuất phù hợp.</p> : <><div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Phiếu / đơn hàng', 'Nhà phân phối', 'Khối lượng', 'Ngày xuất', 'Người lập', 'Trạng thái', 'Thao tác'].map(s => <th key={s} className="p-4">{s}</th>)}</tr></thead><tbody>{data.items.map(g => <tr className="border-t" key={g.id}><td className="max-w-64 break-words p-4"><p className="font-mono font-semibold text-emerald-700">{g.issueCode}</p><p>{g.orderCode}</p></td><td className="p-4">{g.distributorName}</td><td className="p-4">{pickingKg(g.weightInKg)}</td><td className="p-4">{pickingDate(g.issuedDate)}</td><td className="p-4">{g.operationStaffName}</td><td className="p-4"><GoodsIssueStatus status={g.issueStatus} /></td><td className="p-4"><Link className="font-semibold text-emerald-700 underline" to={ROUTES.OPERATION_GOODS_ISSUE_DETAIL.replace(':id', String(g.id))}>{g.issueStatus === 'DRAFT' ? 'Mở phiếu nháp' : 'Xem chi tiết'}</Link></td></tr>)}</tbody></table></div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm"><label>Số dòng <select aria-label="Số dòng mỗi trang" value={query.pageSize} onChange={e => setQuery(old => ({ ...old, page: 1, pageSize: Number(e.target.value) }))}><option>20</option><option>50</option><option>100</option></select></label><div className="flex items-center gap-3"><button disabled={query.page <= 1} className="rounded border px-3 py-1 disabled:opacity-40" onClick={() => setQuery(old => ({ ...old, page: old.page - 1 }))}>Trước</button><span>{query.page}/{Math.max(1, Math.ceil(data.totalCount / query.pageSize))}</span><button disabled={query.page * query.pageSize >= data.totalCount} className="rounded border px-3 py-1 disabled:opacity-40" onClick={() => setQuery(old => ({ ...old, page: old.page + 1 }))}>Sau</button></div></div></>)}
    </section>
  </div>
}
