import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import DistributorFade from '@/features/distributor-orders/DistributorFade'
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
      <DistributorFade changeKey={advancedOpen ? 'advanced' : null}><form id="dist-order-advanced" className="dist-order-advanced" onSubmit={event => { event.preventDefault(); applyFilters() }}>
        <label>Ngày đặt từ<input className={field} type="date" max={draft.toDate} value={draft.fromDate ?? ''} onChange={event => setDraft({ ...draft, fromDate: event.target.value || undefined })} /></label>
        <label>Ngày đặt đến<input className={field} type="date" min={draft.fromDate} value={draft.toDate ?? ''} onChange={event => setDraft({ ...draft, toDate: event.target.value || undefined })} /></label>
        <button className={primary}>Áp dụng bộ lọc</button><button type="button" onClick={resetFilters} className="dist-reset-button">Đặt lại</button>
      </form></DistributorFade>
    </section>
    {result.error && <div role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">{result.error} <button type="button" onClick={result.reload} className="underline">Thử lại</button></div>}
    <section className={panel + ' dist-order-list-panel'}>
      <div className="dist-order-list-heading"><div><h2>Danh sách đơn hàng</h2><p>Theo dõi số lô, lịch giao dự kiến và trạng thái xử lý.</p></div><span>{result.data?.totalCount ?? 0} đơn</span></div>
      <DistributorFade changeKey={result.loading ? 'loading' : JSON.stringify(result.data?.items.map(order => order.id) ?? [])} className="dist-order-cards" aria-busy={result.loading}>
        {result.loading && <p role="status" className="dist-order-card-empty">Đang tải đơn hàng...</p>}
        {!result.loading && result.data?.items.map(order =>
          <article key={order.id} className="dist-purchase-order-card">
            <div className="dist-purchase-order-head"><div><span>MÃ ĐƠN</span><b>{order.orderCode}</b></div><StatusBadge status={order.status} /></div>
            <div className="dist-purchase-order-facts">
              <div><small>Ngày đặt</small><b>{timestamp(order.createdAt)}</b></div>
              <div><small>Số lô</small><b>{order.lotCount} lô nguyên</b></div>
              <div><small>Ngày mong muốn nhận</small><b>{order.expectedDeliveryDate ? date(order.expectedDeliveryDate) : 'Chưa yêu cầu'}</b></div>
            </div>
            {order.workState && <p className="dist-purchase-order-note">{order.workState === 'PENDING_CUSTOMER' ? 'Cần phản hồi đề xuất thay đổi' : order.workState === 'CUSTOMER_ACCEPTED' ? 'Đã phản hồi · chờ quản lý xử lý' : order.workState === 'CUSTOMER_DECLINED' ? 'Đã từ chối đề xuất · kho xử lý tồn' : 'Kho đang kiểm tra lô hàng'}</p>}
            <div className="dist-purchase-order-foot"><span>Tổng giá trị <b>{money(order.totalAmount)}</b></span><Link to={ROUTES.DISTRIBUTOR_ORDER_DETAIL.replace(':id', String(order.id))}>Xem chi tiết đơn <span aria-hidden="true">→</span></Link></div>
          </article>)}
        {!result.loading && !result.error && !result.data?.items.length && <p className="dist-order-card-empty">Không có đơn hàng phù hợp.</p>}
      </DistributorFade>
      <Pagination page={query.page} pageSize={query.pageSize} total={result.data?.totalCount ?? 0} busy={result.loading} onPage={page => setQuery(current => ({ ...current, page }))} onSize={pageSize => { setQuery(current => ({ ...current, pageSize, page: 1 })); setDraft(current => ({ ...current, pageSize, page: 1 })) }} />
    </section>
  </div>
}
