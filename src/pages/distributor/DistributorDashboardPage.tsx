import { AnimatedNumber } from '@/components/common/AnimatedNumber'
import AppIcon from '@/components/common/AppIcon'
import { DistributorHeader } from '@/features/distributor-orders/shared'
import { useDistributorResource } from '@/features/distributor-orders/useDistributorResource'
import { getDistributorDashboard } from '@/services/orderService'

export default function DistributorDashboardPage() {
  const { data, loading, error, reload } = useDistributorResource(getDistributorDashboard, { retainData: true })
  const statuses = [
    { label: 'Chờ duyệt', count: data?.pendingOrders, tone: 'pending' },
    { label: 'Thành công', count: data?.successfulOrders, tone: 'success' },
    { label: 'Đã hủy', count: data?.cancelledOrders, tone: 'cancelled' },
  ]
  const maxCount = Math.max(1, ...statuses.map(status => status.count ?? 0))

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <DistributorHeader
        title="Tổng quan mua hàng"
        description="Số liệu tổng hợp từ các đơn mua của bạn."
        icon="dashboard"
      />

      {error && (
        <div role="alert" className="p-4 text-rose-700">
          {error} <button type="button" onClick={reload} className="underline">Thử lại</button>
        </div>
      )}

      {loading && <p className="sr-only" role="status">Đang tải thống kê mua hàng...</p>}
      <section className="dist-overview-panel" aria-label="Thống kê mua hàng" aria-busy={loading}>
        <div className="dist-overview-spend">
          <AppIcon name="clipboard" className="size-5" aria-hidden="true" />
          <h2>Tổng chi tiêu</h2>
          <strong>{data?.totalSpent == null ? '—' : <><AnimatedNumber value={data.totalSpent} />{' ₫'}</>}</strong>
          <p>Giá trị các đơn thành công</p>
        </div>
        <div className="dist-overview-orders">
          <h2>Số đơn theo trạng thái</h2>
          <dl>
            {statuses.map(({ label, count, tone }) => (
              <div className="dist-overview-row" key={tone}>
                <dt>{label}</dt>
                <dd>
                  <span className="dist-overview-track" aria-hidden="true">
                    <span data-tone={tone} style={{ transform: 'scaleX(' + (count ?? 0) / maxCount + ')' }} />
                  </span>
                  <strong>{count == null ? '—' : <AnimatedNumber value={count} />}</strong>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  )
}
