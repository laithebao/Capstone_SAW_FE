import { useEffect, useState } from 'react'
import { ROUTES } from '@/constants/routes'
import { getPickingOrders } from '@/services/pickingService'
import { getAuthErrorMessage } from '@/services/authService'
import { PickingStatus } from '@/features/operation/components/PickingPresentation'
import { WarehouseDetailLink, WarehouseListFilters, warehouseFilterInput as input } from '@/features/operation/components/WarehouseListControls'
import { pickingDate, pickingKg, pickingTime } from '@/features/operation/pickingFormat'
import type { PickingOrderSummary, PickingQuery } from '@/types/picking'
import type { PagedResponse } from '@/types/api'

const initial: PickingQuery = { search: '', status: '', sort: 'approved_desc', page: 1, pageSize: 20, fromDate: '', toDate: '' }
export default function ApprovedOrderListPage() {
  const [filters, setFilters] = useState(initial)
  const [query, setQuery] = useState(initial)
  const [data, setData] = useState<PagedResponse<PickingOrderSummary> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true); setError('')
      try {
        const response = await getPickingOrders({ ...query, search: query.search?.trim() || undefined,
          status: query.status || undefined, fromDate: query.fromDate || undefined, toDate: query.toDate || undefined }, controller.signal)
        if (!controller.signal.aborted) setData(response)
      } catch (e) {
        if (!controller.signal.aborted) { setData(null); setError(getAuthErrorMessage(e, 'Không thể tải danh sách đơn chờ soạn.')) }
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }, 0)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [query, reload])
  const field = (key: keyof PickingQuery, value: string | number) => setFilters(old => ({ ...old, [key]: value }))
  return <div className="mx-auto max-w-[1600px] space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-4"><div>
      <p className="text-xs font-bold text-emerald-700">VẬN HÀNH · SOẠN HÀNG</p>
      <h1 className="mt-1 text-xl font-bold text-slate-950">ĐƠN HÀNG CHỜ SOẠN</h1>
      <p className="mt-1 text-sm text-slate-500">Theo dõi đơn đã giữ hàng và xác nhận soạn đủ nguyên lô.</p>
    </div></header>
    <WarehouseListFilters onReset={() => { const defaults = { ...initial, pageSize: query.pageSize }; setFilters(defaults); setQuery(defaults); setReload(x => x + 1) }}
      onSubmit={e => { e.preventDefault(); setQuery({ ...filters, page: 1 }) }}>
      <label className="grid gap-1 text-xs text-slate-500">Tìm kiếm<input aria-label="Tìm đơn chờ soạn" maxLength={100} className={input} value={filters.search} placeholder="Mã đơn, nhà phân phối, sản phẩm, lô..." onChange={e => field('search', e.target.value)} /></label>
      <label className="grid gap-1 text-xs text-slate-500">Trạng thái<select className={input} value={filters.status} onChange={e => field('status', e.target.value)}>
        <option value="">Tất cả đơn chờ soạn</option><option value="APPROVED">Đã duyệt · chờ phân bổ</option><option value="RESERVED">Đã giữ hàng</option><option value="PARTIALLY_PICKED">Đang soạn một phần</option><option value="PARTIALLY_ISSUED">Đã xuất một phần · còn cần soạn</option>
      </select></label>
      <label className="grid gap-1 text-xs text-slate-500">Sắp xếp<select className={input} value={filters.sort} onChange={e => field('sort', e.target.value)}>
        <option value="approved_desc">Duyệt mới nhất</option><option value="approved_asc">Duyệt cũ nhất</option><option value="delivery_asc">Ngày giao tăng dần</option><option value="delivery_desc">Ngày giao giảm dần</option>
      </select></label>
      <label className="grid gap-1 text-xs text-slate-500">Duyệt từ ngày<input type="date" className={input} value={filters.fromDate} max={filters.toDate || undefined} onChange={e => field('fromDate', e.target.value)} /></label>
      <label className="grid gap-1 text-xs text-slate-500">Đến ngày<input type="date" className={input} value={filters.toDate} min={filters.fromDate || undefined} onChange={e => field('toDate', e.target.value)} /></label>
    </WarehouseListFilters>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}<button onClick={() => setReload(x => x + 1)} className="ml-3 font-semibold underline">Thử lại</button></div>}
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-label="Danh sách đơn chờ soạn">
      <h2 className="border-b border-slate-100 p-4 font-semibold">Danh sách đơn chờ soạn {data && <span className="ml-1 text-slate-500">({data.totalCount})</span>}</h2>
      {loading ? <p role="status" className="p-8 text-center text-slate-500">Đang tải đơn hàng...</p> : !error && (!data?.items.length ? <p className="p-8 text-center text-slate-500">Không có đơn hàng chờ soạn.</p> : <>
        <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>
          {['Mã đơn / nhà phân phối', 'Thời gian duyệt / giao dự kiến', 'Đã duyệt', 'Đã giữ', 'Đã soạn', 'Trạng thái', 'Thao tác'].map(x => <th className={`px-4 py-4 ${x === 'Thao tác' ? 'text-center' : ''}`} key={x}>{x}</th>)}
        </tr></thead><tbody>{data.items.map(order => <tr key={order.id} className="border-t border-slate-100 align-middle hover:bg-slate-50">
          <td className="max-w-64 break-words p-4"><p className="break-all font-mono font-semibold text-emerald-700">{order.orderCode}</p><p className="mt-1 text-slate-600">{order.distributorName}</p></td>
          <td className="p-4">{pickingTime(order.approvedAt)}<p className="mt-1 text-xs text-slate-500">Giao: {pickingDate(order.expectedDeliveryDate)}</p></td>
          <td className="whitespace-nowrap p-4">{pickingKg(order.approvedWeightKg)}</td><td className="whitespace-nowrap p-4">{pickingKg(order.reservedWeightKg)}</td><td className="whitespace-nowrap p-4">{pickingKg(order.pickedWeightKg)}</td>
          <td className="max-w-64 p-4"><PickingStatus status={order.status} />{order.pickingLockReason && <p className="mt-2 text-xs text-amber-800">{order.pickingLockReason}</p>}</td>
          <td className="p-4 text-center"><WarehouseDetailLink label={`Xem chi tiết đơn ${order.orderCode}`} to={ROUTES.OPERATION_PICKING_ORDER_DETAIL.replace(':id', String(order.id))} /></td>
        </tr>)}</tbody></table></div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-sm"><label>Số dòng <select aria-label="Số dòng mỗi trang" className="ml-2 rounded border border-slate-200 p-1" value={query.pageSize} onChange={e => { const pageSize = Number(e.target.value); setFilters(old => ({ ...old, pageSize })); setQuery(old => ({ ...old, page: 1, pageSize })) }}><option>20</option><option>50</option><option>100</option></select></label>
          <div className="flex items-center gap-3"><button disabled={query.page <= 1} className="rounded border px-3 py-1 disabled:opacity-40" onClick={() => setQuery(old => ({ ...old, page: old.page - 1 }))}>Trang trước</button><span>{query.page}/{Math.max(1, Math.ceil(data.totalCount / query.pageSize))}</span><button disabled={query.page * query.pageSize >= data.totalCount} className="rounded border px-3 py-1 disabled:opacity-40" onClick={() => setQuery(old => ({ ...old, page: old.page + 1 }))}>Trang sau</button></div>
        </div>
      </>)}
    </section>
  </div>
}
