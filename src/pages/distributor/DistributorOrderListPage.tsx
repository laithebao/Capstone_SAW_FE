import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { getDistributorOrders } from '@/services/orderService'
import type { DistributorQuery } from '@/types/order'
import { DistributorHeader, Pagination, StatusBadge } from '@/features/distributor-orders/shared'
import { date, field, money, orderStatuses, panel, primary, timestamp } from '@/features/distributor-orders/format'
import { useDistributorResource } from '@/features/distributor-orders/useDistributorResource'

const quickStatuses = [['', 'Tất cả'], ['PENDING', 'Chờ duyệt'], ['DELIVERED', 'Đã nhận hàng'], ['CANCELLED', 'Đã hủy']]

export default function DistributorOrderListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [query, setQuery] = useState<DistributorQuery>(() => {
    const status = searchParams.get('status') ?? ''
    return { page: 1, pageSize: 10, status: Object.hasOwn(orderStatuses, status) ? status : undefined }
  })
  const [draft, setDraft] = useState(query)
  const result = useDistributorResource(useCallback((signal: AbortSignal) => getDistributorOrders(query, signal), [query]))

  function applyFilters() {
    setQuery({ ...draft, page: 1 })
    setSearchParams(draft.status ? { status: draft.status } : {})
  }
  function setAppliedStatus(status: string) {
    const next = { ...query, status: status || undefined, page: 1 }
    setDraft(current => ({ ...current, status: status || undefined, page: 1 }))
    setQuery(next)
    setSearchParams(status ? { status } : {})
  }
  function resetFilters() {
    const next: DistributorQuery = { page: 1, pageSize: query.pageSize }
    setDraft(next); setQuery(next); setSearchParams({}); setAdvancedOpen(false)
  }

  return <div className="mx-auto max-w-[1400px] space-y-5 dist-order-list">
    <DistributorHeader title="Đơn hàng của tôi" description="Theo dõi trạng thái, lịch giao và các thao tác cần xử lý." icon="clipboard" action={<button type="button" onClick={result.reload} disabled={result.loading} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Làm mới</button>} />
    <section className={panel + ' dist-order-filter-panel'}>
      <div className="dist-order-tabs" role="tablist" aria-label="Lọc nhanh đơn hàng">{quickStatuses.map(([status, label]) =>
        <button type="button" role="tab" aria-selected={(query.status ?? '') === status} aria-pressed={(query.status ?? '') === status} key={status} onClick={() => setAppliedStatus(status)}>{label}</button>)}</div>
      <form className="dist-order-filter-form" onSubmit={event => { event.preventDefault(); applyFilters() }}>
        <label className="dist-order-search">Tìm đơn hàng<input className={field} placeholder="Mã đơn, mã lô hoặc sản phẩm..." maxLength={100} value={draft.search ?? ''} onChange={event => setDraft({ ...draft, search: event.target.value || undefined })} /></label>
        <label className="dist-order-status">Trạng thái<select className={field} value={draft.status ?? ''} onChange={event => setDraft({ ...draft, status: event.target.value || undefined })}><option value="">Tất cả trạng thái</option>{Object.entries(orderStatuses).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
        <button type="button" className="dist-advanced-toggle" aria-expanded={advancedOpen} aria-controls="dist-order-advanced" onClick={() => setAdvancedOpen(open => !open)}>Bộ lọc nâng cao {advancedOpen ? '−' : '+'}</button>
      </form>
      <form id="dist-order-advanced" className="dist-order-advanced" hidden={!advancedOpen} onSubmit={event => { event.preventDefault(); applyFilters() }}>
        <label>Ngày đặt từ<input className={field} type="date" max={draft.toDate} value={draft.fromDate ?? ''} onChange={event => setDraft({ ...draft, fromDate: event.target.value || undefined })} /></label>
        <label>Ngày đặt đến<input className={field} type="date" min={draft.fromDate} value={draft.toDate ?? ''} onChange={event => setDraft({ ...draft, toDate: event.target.value || undefined })} /></label>
        <button className={primary}>Áp dụng bộ lọc</button><button type="button" onClick={resetFilters} className="dist-reset-button">Đặt lại</button>
      </form>
    </section>
    {result.error && <div role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">{result.error} <button type="button" onClick={result.reload} className="underline">Thử lại</button></div>}
    <section className={panel + ' dist-order-list-panel'}>
      <div className="dist-order-list-heading"><div><h2>Danh sách đơn hàng</h2><p>Theo dõi số lô, lịch giao dự kiến và trạng thái xử lý.</p></div><span>{result.data?.totalCount ?? 0} đơn</span></div>
      <div className="overflow-x-auto"><table className="min-w-[850px] text-left"><thead><tr>{['Mã đơn', 'Ngày đặt', 'Số lô', 'Tổng giá trị', 'Ngày mong muốn nhận hàng', 'Trạng thái', 'Thao tác'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>
        {result.loading ? <tr><td colSpan={7} className="p-8 text-center text-slate-500">Đang tải đơn hàng...</td></tr> : result.data?.items.map(order =>
          <tr key={order.id}><td className="max-w-60 break-all font-semibold text-emerald-700">{order.orderCode}</td><td>{timestamp(order.createdAt)}</td><td>{order.lotCount}</td><td className="font-semibold">{money(order.totalAmount)}</td><td>{order.expectedDeliveryDate ? date(order.expectedDeliveryDate) : 'Không yêu cầu ngày cụ thể'}</td><td><StatusBadge status={order.status} />{order.workState && <p className="mt-2 text-xs text-amber-800">{order.workState === 'PENDING_CUSTOMER' ? 'Cần phản hồi đề xuất' : order.workState === 'CUSTOMER_ACCEPTED' ? 'Đã đồng ý · chờ quản lý' : order.workState === 'CUSTOMER_DECLINED' ? 'Đơn đã hủy · kho xử lý tồn' : 'Kho đang kiểm tra lô'}</p>}</td><td><Link className="font-semibold text-emerald-700" to={ROUTES.DISTRIBUTOR_ORDER_DETAIL.replace(':id', String(order.id))}>Xem chi tiết</Link></td></tr>)}
        {!result.loading && !result.error && !result.data?.items.length && <tr><td colSpan={7} className="p-8 text-center text-slate-500">Không có đơn hàng phù hợp.</td></tr>}
      </tbody></table></div>
      <Pagination page={query.page} pageSize={query.pageSize} total={result.data?.totalCount ?? 0} busy={result.loading} onPage={page => setQuery(current => ({ ...current, page }))} onSize={pageSize => { setQuery(current => ({ ...current, pageSize, page: 1 })); setDraft(current => ({ ...current, pageSize, page: 1 })) }} />
    </section>
  </div>
}
