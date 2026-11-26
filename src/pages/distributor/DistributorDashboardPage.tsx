import { useCallback } from 'react'
import { Link } from 'react-router'
import AppIcon from '@/components/common/AppIcon'
import { AnimatedNumber } from '@/components/common/AnimatedNumber'
import { ROUTES } from '@/constants/routes'
import { getDistributorDashboard, getDistributorOrders } from '@/services/orderService'
import { DistributorHeader, StatusBadge } from '@/features/distributor-orders/shared'
import { money, panel, primary, timestamp } from '@/features/distributor-orders/format'
import { orderStatuses } from '@/features/distributor-orders/format'
import { useDistributorResource } from '@/features/distributor-orders/useDistributorResource'

const ordersLink = (status: string) => ROUTES.DISTRIBUTOR_ORDERS + '?status=' + status
const palette: Record<string, string> = {
  PENDING:'#bd8425', APPROVED:'#6883a4', RESERVED:'#587aa0', PARTIALLY_PICKED:'#648a9a',
  PICKED:'#4f81a1', PARTIALLY_ISSUED:'#4b7498', ISSUED:'#456a91', DELIVERED:'#087f59',
  REJECTED:'#bd4050', CANCELLED:'#c14d5b', RETURNED:'#7b8794', DELIVERY_REFUSED:'#aa3f4c',
  PARTIALLY_REFUSED:'#ca7052',
}
const pageSize = 50

async function loadStatusTotals(signal: AbortSignal) {
  const first = await getDistributorOrders({ page: 1, pageSize }, signal)
  const counts: Record<string, number> = {}
  const addCounts = (orders: typeof first.items) => {
    for (const order of orders) counts[order.status] = (counts[order.status] ?? 0) + 1
  }
  addCounts(first.items)
  const pageCount = Math.ceil(first.totalCount / pageSize)
  for (let start = 2; start <= pageCount; start += 5) {
    const count = Math.min(5, pageCount - start + 1)
    const pages = await Promise.all(Array.from({ length: count }, (_, index) =>
      getDistributorOrders({ page: start + index, pageSize }, signal)))
    for (const page of pages) addCounts(page.items)
  }
  return { total: first.totalCount, counts }
}

function StatusDonut({ total, counts }: { total: number; counts: Record<string, number> }) {
  let cursor = 0
  const items = Object.entries(orderStatuses).filter(([status]) => counts[status] > 0).map(([status, label]) => {
    const value = counts[status]
    const start = cursor
    cursor += total ? value / total * 100 : 0
    return { status, label, value, start, end: cursor, percent: total ? value / total * 100 : 0 }
  })
  const background = total
    ? 'conic-gradient(' + items.map(item => (palette[item.status] ?? '#80918a') + ' ' + item.start + '% ' + item.end + '%').join(',') + ')'
    : '#e8efeb'
  return <div className="dist-donut-layout">
    <div className="dist-donut" style={{ background }} role="img" aria-label={'Phân bố trạng thái của ' + total + ' đơn hàng'}>
      <div className="dist-donut-hole"><strong><AnimatedNumber value={total} /></strong><span>đơn hàng</span></div>
    </div>
    <div className="dist-donut-legend">{items.length ? items.map(item =>
      <Link key={item.status} to={ordersLink(item.status)} className="dist-donut-row" title={item.label + ': ' + item.value + ' đơn'}>
        <span className="dist-donut-label"><i style={{ backgroundColor: palette[item.status] ?? '#80918a' }} />{item.label}</span>
        <b>{item.value}</b><span>{item.percent.toFixed(1)}%</span>
      </Link>) : <p className="text-sm text-slate-500">Chưa có đơn hàng.</p>}
    </div>
  </div>
}

export default function DistributorDashboardPage() {
  const result = useDistributorResource(useCallback((signal: AbortSignal) => getDistributorDashboard(signal), []))
  const distribution = useDistributorResource(useCallback((signal: AbortSignal) => loadStatusTotals(signal), []))
  const data = result.data
  const cards = [
    { label:'Đơn hàng chờ duyệt', value:data?.pendingOrders, icon:'pending', note:'Chờ quản lý kho duyệt', tone:'orange', href:ordersLink('PENDING') },
    { label:'Đơn hàng thành công', value:data?.successfulOrders, icon:'shield', note:'Đã xác nhận nhận hàng', tone:'green', href:ordersLink('DELIVERED') },
    { label:'Đơn đã hủy', value:data?.cancelledOrders, icon:'alert', note:'Đã hủy đơn hàng', tone:'rose', href:ordersLink('CANCELLED') },
    { label:'Số tiền đã chi tiêu', value:data?.totalSpent, icon:'clipboard', note:'Giá trị đơn thành công', tone:'blue', href:ordersLink('DELIVERED'), currency:true },
  ]
  const watch = [
    { status:'PENDING', label:'Chờ duyệt', note:'Theo dõi kết quả xét duyệt', icon:'pending' },
    { status:'RESERVED', label:'Đã giữ hàng', note:'Theo dõi tiến độ chuẩn bị hàng', icon:'package' },
    { status:'ISSUED', label:'Đã xuất kho', note:'Kiểm tra và xác nhận khi nhận hàng', icon:'clipboard' },
  ]
  return <div className="mx-auto max-w-[1400px] space-y-5 dist-dashboard">
    <DistributorHeader title="Bảng điều khiển" description="Theo dõi các đơn mua nguyên lô và tình trạng giao nhận." icon="dashboard" action={<Link className={primary} to={ROUTES.DISTRIBUTOR_CATALOG}>Chọn mua lô</Link>} />
    {result.error && <div role="alert" className="p-4 text-rose-700">{result.error} <button type="button" onClick={result.reload} className="underline">Thử lại</button></div>}
    <div className="dist-kpi-grid" aria-busy={result.loading}>{cards.map((card, index) =>
      <Link key={card.label} to={card.href} className={'dist-kpi-card ' + (index === 0 ? 'dist-kpi-primary' : '')} style={{ animationDelay: String(Math.floor(index / 2) * 120) + 'ms' }}>
        <div className="dist-kpi-top"><span className={'dist-kpi-icon dist-tone-' + card.tone}><AppIcon name={card.icon} className="size-5" /></span><span className="dist-kpi-note">{card.note}</span></div>
        <div><p>{card.label}</p><strong>{result.loading ? 'Đang tải...' : card.value == null ? '—' : <><AnimatedNumber value={card.value} />{card.currency ? ' ₫' : ''}</>}</strong></div>
      </Link>)}
    </div>
    <div className="dist-dashboard-grid">
      <section className={panel}>
        <h2 className="dist-section-title">Phân bố trạng thái đơn hàng</h2><p className="dist-section-caption">Thống kê theo toàn bộ đơn mua của bạn.</p>
        {distribution.loading ? <p role="status" className="dist-dashboard-empty">Đang tải thống kê...</p> : distribution.error ? <div role="alert" className="mt-4 p-3 text-sm">{distribution.error}</div> : distribution.data && <StatusDonut total={distribution.data.total} counts={distribution.data.counts} />}
      </section>
      <section className={panel}>
        <h2 className="dist-section-title">Đơn hàng cần theo dõi</h2><p className="dist-section-caption">Truy cập nhanh theo trạng thái xử lý.</p>
        <div className="dist-watch-list">{watch.map(item =>
          <Link key={item.status} to={ordersLink(item.status)} className="dist-watch-item">
            <span className="dist-watch-icon"><AppIcon name={item.icon} className="size-5" /></span><span><b>{item.label}</b><small>{item.note}</small></span><strong>{distribution.loading ? '—' : distribution.data?.counts[item.status] ?? 0}</strong>
          </Link>)}
        </div>
      </section>
    </div>
    <section className={panel}>
      <div className="dist-recent-heading"><div><h2 className="dist-section-title">Đơn hàng gần đây</h2><p className="dist-section-caption">Các Purchase Order mới nhất.</p></div><Link to={ROUTES.DISTRIBUTOR_ORDERS} className="font-semibold text-emerald-700">Xem tất cả →</Link></div>
      {result.loading ? <p role="status" className="dist-dashboard-empty">Đang tải đơn hàng...</p> : data?.recentOrders.length ? <div className="overflow-x-auto"><table className="min-w-[620px] text-left"><thead><tr>{['Mã đơn','Ngày đặt','Tổng giá trị','Trạng thái','Thao tác'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{data.recentOrders.slice(0,5).map(order =>
        <tr key={order.id}><td className="max-w-48 break-all font-semibold text-emerald-700">{order.orderCode}</td><td>{timestamp(order.createdAt)}</td><td className="font-semibold">{money(order.totalAmount)}</td><td><StatusBadge status={order.status} /></td><td><Link to={ROUTES.DISTRIBUTOR_ORDER_DETAIL.replace(':id', String(order.id))} className="font-semibold text-emerald-700">Xem đơn</Link></td></tr>)}</tbody></table></div> : !result.error && <div className="dist-dashboard-empty">Bạn chưa có đơn hàng nào. <Link className="ml-1 text-emerald-700 underline" to={ROUTES.DISTRIBUTOR_CATALOG}>Chọn lô hàng</Link></div>}
    </section>
  </div>
}
