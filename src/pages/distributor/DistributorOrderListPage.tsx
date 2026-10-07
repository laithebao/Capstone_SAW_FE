import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { getDistributorOrders } from '@/services/orderService'
import type { DistributorQuery } from '@/types/order'
import { DistributorHeader, Pagination, StatusBadge } from '@/features/distributor-orders/shared'
import { date, field, money, orderStatuses, panel, primary, timestamp } from '@/features/distributor-orders/format'
import { useDistributorResource } from '@/features/distributor-orders/useDistributorResource'

export default function DistributorOrderListPage() {
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState<DistributorQuery>(() => {
    const status = searchParams.get('status') ?? ''
    return { page: 1, pageSize: 10, status: Object.hasOwn(orderStatuses, status) ? status : undefined }
  })
  const [draft, setDraft] = useState(query)
  const result = useDistributorResource(useCallback((signal: AbortSignal) => getDistributorOrders(query, signal), [query]))
  return <div className="mx-auto max-w-[1400px] space-y-5"><DistributorHeader title="Đơn hàng của tôi" description="Xem Purchase Order, theo dõi xử lý và hủy đơn còn chờ duyệt." />
    <form className={`${panel} grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-5`} onSubmit={e => { e.preventDefault(); setQuery({ ...draft, page: 1 }); result.reload() }}>
      <label className="text-sm">Mã đơn / mã lô / sản phẩm<input className={`${field} mt-1`} maxLength={100} value={draft.search ?? ''} onChange={e => setDraft({ ...draft, search: e.target.value || undefined })} /></label>
      <label className="text-sm">Trạng thái<select className={`${field} mt-1`} value={draft.status ?? ''} onChange={e => setDraft({ ...draft, status: e.target.value || undefined })}><option value="">Tất cả trạng thái</option>{Object.entries(orderStatuses).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
      <label className="text-sm">Ngày đặt từ<input className={`${field} mt-1`} type="date" max={draft.toDate} value={draft.fromDate ?? ''} onChange={e => setDraft({ ...draft, fromDate: e.target.value || undefined })} /></label>
      <label className="text-sm">Ngày đặt đến<input className={`${field} mt-1`} type="date" min={draft.fromDate} value={draft.toDate ?? ''} onChange={e => setDraft({ ...draft, toDate: e.target.value || undefined })} /></label>
      <div className="flex gap-3"><button className={primary}>Lọc</button><button type="button" onClick={result.reload} className="text-sm text-emerald-700">Làm mới</button></div>
    </form>
    {result.error && <div role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">{result.error} <button onClick={result.reload} className="underline">Thử lại</button></div>}
    <section className={panel}><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b text-slate-500"><tr>{['Mã đơn', 'Ngày đặt', 'Số lô', 'Tổng giá trị', 'Ngày mong muốn nhận hàng', 'Trạng thái', 'Chi tiết'].map(h => <th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody className="divide-y">
      {result.loading ? <tr><td colSpan={7} className="p-8 text-center">Đang tải đơn hàng...</td></tr> : result.data?.items.map(order => <tr key={order.id}><td className="max-w-60 break-all p-3 font-mono text-xs">{order.orderCode}</td><td className="p-3">{timestamp(order.createdAt)}</td><td className="p-3">{order.lotCount}</td><td className="p-3 font-semibold">{money(order.totalAmount)}</td><td className="p-3">{order.expectedDeliveryDate ? date(order.expectedDeliveryDate) : 'Không yêu cầu ngày cụ thể'}</td><td className="p-3"><StatusBadge status={order.status} /></td><td className="p-3"><Link className="font-semibold text-emerald-700 underline" to={ROUTES.DISTRIBUTOR_ORDER_DETAIL.replace(':id', String(order.id))}>Xem đơn</Link></td></tr>)}
      {!result.loading && !result.error && !result.data?.items.length && <tr><td colSpan={7} className="p-8 text-center text-slate-500">Không có đơn hàng phù hợp.</td></tr>}
    </tbody></table></div><Pagination page={query.page} pageSize={query.pageSize} total={result.data?.totalCount ?? 0} busy={result.loading} onPage={page => setQuery({ ...query, page })} onSize={pageSize => { setQuery({ ...query, pageSize, page: 1 }); setDraft({ ...draft, pageSize }) }} /></section>
  </div>
}
