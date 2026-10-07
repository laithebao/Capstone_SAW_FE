import { useCallback } from 'react'
import { Link } from 'react-router'
import AppIcon from '@/components/common/AppIcon'
import { ROUTES } from '@/constants/routes'
import { getDistributorDashboard } from '@/services/orderService'
import { DistributorHeader, StatusBadge } from '@/features/distributor-orders/shared'
import { money, panel, primary, timestamp } from '@/features/distributor-orders/format'
import { useDistributorResource } from '@/features/distributor-orders/useDistributorResource'

const ordersLink = (status: string) => `${ROUTES.DISTRIBUTOR_ORDERS}?status=${status}`

export default function DistributorDashboardPage() {
  const result = useDistributorResource(useCallback((signal: AbortSignal) => getDistributorDashboard(signal), []))
  const data = result.data
  const cards = [
    { label: 'Đơn hàng chờ duyệt', value: data?.pendingOrders, icon: 'pending', tone: 'bg-orange-50 text-orange-600', note: 'Chờ quản lý kho duyệt', to: ordersLink('PENDING') },
    { label: 'Đơn đặt hàng thành công', value: data?.successfulOrders, icon: 'shield', tone: 'bg-emerald-50 text-emerald-700', note: 'Đã xác nhận nhận hàng', to: ordersLink('DELIVERED') },
    { label: 'Đơn đã hủy', value: data?.cancelledOrders, icon: 'alert', tone: 'bg-rose-50 text-rose-600', note: 'Đã hủy đơn hàng', to: ordersLink('CANCELLED') },
    { label: 'Số tiền đã chi tiêu', value: data ? money(data.totalSpent) : undefined, icon: 'clipboard', tone: 'bg-sky-50 text-sky-700', note: 'Giá trị các đơn thành công', to: ordersLink('DELIVERED') },
  ]
  return <div className="mx-auto max-w-[1400px] space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <DistributorHeader title="Bảng điều khiển" description="Tổng quan đơn mua nguyên lô và lịch sử mua hàng của bạn." />
      <Link className={`${primary} inline-flex items-center gap-2`} to={ROUTES.DISTRIBUTOR_CATALOG}><AppIcon name="package" className="size-5" /> Chọn mua lô hàng</Link>
    </div>
    {result.error && <div role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">{result.error} <button onClick={result.reload} className="underline">Thử lại</button></div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy={result.loading}>
      {cards.map(card => <Link key={card.label} to={card.to} className={`${panel} transition hover:border-emerald-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-emerald-600`}>
        <div className="flex items-start justify-between gap-2"><span className={`grid size-11 shrink-0 place-items-center rounded-lg ${card.tone}`}><AppIcon name={card.icon} className="size-6" /></span><span className={`rounded-full px-3 py-1 text-xs ${card.tone}`}>{card.note}</span></div>
        <p className="mt-5 text-xs font-semibold uppercase text-slate-500">{card.label}</p>
        <p className="mt-2 break-words text-2xl font-bold text-slate-950">{result.loading ? 'Đang tải...' : card.value ?? '—'}</p>
      </Link>)}
    </div>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section className={`${panel} min-w-0`}>
        <div className="mb-5 flex items-center justify-between gap-3"><h2 className="font-bold">Đơn hàng gần đây</h2><Link to={ROUTES.DISTRIBUTOR_ORDERS} className="text-sm text-emerald-700">Xem chi tiết →</Link></div>
        {result.loading ? <p className="py-16 text-center text-slate-500">Đang tải đơn hàng...</p> : data?.recentOrders.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b text-slate-500"><tr>{['Mã đơn', 'Ngày đặt', 'Tổng giá trị', 'Trạng thái', ''].map((h, i) => <th key={i} className="px-2 py-3">{h}</th>)}</tr></thead><tbody className="divide-y">{data.recentOrders.map(order => <tr key={order.id}><td className="max-w-48 break-all px-2 py-4 font-mono text-xs">{order.orderCode}</td><td className="px-2 py-4">{timestamp(order.createdAt)}</td><td className="px-2 py-4 font-semibold">{money(order.totalAmount)}</td><td className="px-2 py-4"><StatusBadge status={order.status} /></td><td className="px-2 py-4"><Link className="whitespace-nowrap text-emerald-700 underline" to={ROUTES.DISTRIBUTOR_ORDER_DETAIL.replace(':id', String(order.id))}>Xem đơn</Link></td></tr>)}</tbody></table></div> : !result.error && <div className="py-12 text-center"><AppIcon name="clipboard" className="mx-auto mb-4 size-10 text-slate-300" /><p className="mb-5 text-slate-500">Bạn chưa có đơn hàng nào.</p><Link className={`${primary} inline-block`} to={ROUTES.DISTRIBUTOR_CATALOG}>Chọn lô hàng đầu tiên</Link></div>}
      </section>
      <section className={panel}>
        <h2 className="mb-5 font-bold">Mua hàng và theo dõi đơn</h2>
        <div className="divide-y">{[
          { title: 'Lô hàng đang bán', note: 'Xem chi tiết, giá cả lô và đặt mua', icon: 'package', to: ROUTES.DISTRIBUTOR_CATALOG },
          { title: 'Đơn hàng của tôi', note: 'Theo dõi xử lý và xác nhận khi nhận đủ hàng', icon: 'clipboard', to: ROUTES.DISTRIBUTOR_ORDERS },
          { title: 'Đơn đang chờ duyệt', note: 'Kiểm tra hoặc hủy đơn còn chờ duyệt', icon: 'pending', to: ordersLink('PENDING') },
        ].map(action => <Link key={action.title} to={action.to} className="flex gap-3 rounded-lg py-4 hover:bg-emerald-50"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><AppIcon name={action.icon} className="size-5" /></span><span><span className="block font-semibold">{action.title}</span><span className="text-sm text-slate-500">{action.note}</span></span></Link>)}</div>
        <p className="mt-4 text-sm text-slate-500">Đơn thành công là đơn đã xác nhận nhận hàng. Số tiền đã chi tiêu tính theo tổng giá trị các đơn này; thanh toán thực hiện bên ngoài hệ thống.</p>
      </section>
    </div>
  </div>
}
