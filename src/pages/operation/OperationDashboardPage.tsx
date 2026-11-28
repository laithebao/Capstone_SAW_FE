import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { getGoodsReceipts } from '@/services/goodsReceiptService'
import { getGoodsIssues } from '@/services/goodsIssueService'
import { getPickingOrders } from '@/services/pickingService'
import { getAdjustments } from '@/services/stockAdjustmentService'
import { getAuthErrorMessage } from '@/services/authService'
import { PickingStatus } from '@/features/operation/components/PickingPresentation'
import AppIcon from '@/components/common/AppIcon'
import { AnimatedNumber } from '@/components/common/AnimatedNumber'
import { ArrowRight, RefreshCw } from 'lucide-react'
import './operation-portal.css'

async function loadDashboard(signal: AbortSignal) {
  // Counts use filtered server totals; only the previews are limited to three rows.
  const [receipts, issues, adjustments, picking] = await Promise.all([
    getGoodsReceipts({ status: 'DRAFT', sortBy: 'receivedAtAsc', page: 1, pageSize: 3 }, signal),
    getGoodsIssues({ status: 'DRAFT', sortBy: 'issuedAtAsc', page: 1, pageSize: 3 }, signal),
    getAdjustments({ status: 'PENDING', sortBy: 'createdAsc', page: 1, pageSize: 3 }, signal),
    Promise.all(['APPROVED', 'RESERVED', 'PARTIALLY_PICKED', 'PARTIALLY_ISSUED'].map(status =>
      getPickingOrders({ status, sort: 'approved_asc', page: 1, pageSize: 3 }, signal))),
  ])
  return { receipts, issues, adjustments, pickingCount: picking.reduce((sum, page) => sum + page.totalCount, 0),
    picking: picking.flatMap(page => page.items).sort((a, b) => (a.approvedAt ?? '').localeCompare(b.approvedAt ?? '') || a.id - b.id).slice(0, 3) }
}
type Dashboard = Awaited<ReturnType<typeof loadDashboard>>
const detail = (route: string, id: number) => route.replace(':id', String(id))
const kg = (value: number) => `${value.toLocaleString('vi-VN')} kg`

export default function OperationDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  const [tab, setTab] = useState<'receipts' | 'picking' | 'issues' | 'adjustments'>('receipts')
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true); setError('')
      try {
        const result = await loadDashboard(controller.signal)
        if (!controller.signal.aborted) setData(result)
      } catch (cause) {
        if (!controller.signal.aborted) {
          setData(null)
          setError(getAuthErrorMessage(cause, 'Không thể tải công việc vận hành.'))
        }
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }, 0)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [version])
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') setVersion(v => v + 1) }
    const timer = window.setInterval(refresh, 60_000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [])
  const cards = data ? [
    { key: 'receipts', label: 'Phiếu nhập chờ xác nhận', count: data.receipts.totalCount, route: ROUTES.OPERATION_GOODS_RECEIPTS, icon: 'package' as const },
    { key: 'picking', label: 'Đơn hàng còn cần soạn', count: data.pickingCount, route: ROUTES.OPERATION_PICKING_ORDERS, icon: 'clipboard' as const },
    { key: 'issues', label: 'Phiếu xuất chờ xác nhận', count: data.issues.totalCount, route: ROUTES.OPERATION_GOODS_ISSUES, icon: 'logout' as const },
    { key: 'adjustments', label: 'Điều chỉnh tồn chờ duyệt', count: data.adjustments.totalCount, route: ROUTES.OPERATION_STOCK_ADJUSTMENTS, icon: 'pending' as const },
  ] : []
  const chartMax = Math.max(1, ...cards.map(card => card.count))
  const tabItems = [
    { key: 'receipts', label: 'Nhập kho', count: data?.receipts.totalCount, route: ROUTES.OPERATION_GOODS_RECEIPTS },
    { key: 'picking', label: 'Soạn hàng', count: data?.pickingCount, route: ROUTES.OPERATION_PICKING_ORDERS },
    { key: 'issues', label: 'Xuất kho', count: data?.issues.totalCount, route: ROUTES.OPERATION_GOODS_ISSUES },
    { key: 'adjustments', label: 'Điều chỉnh tồn', count: data?.adjustments.totalCount, route: ROUTES.OPERATION_STOCK_ADJUSTMENTS },
  ] as const
  return <div className="op-dashboard">
    <header className="op-dashboard-header"><span className="op-heading-icon"><AppIcon name="dashboard" /></span><div><p>Vận hành kho / Tổng quan</p><h1>Công việc vận hành</h1><span>Theo dõi các công việc nhập, xuất, soạn hàng và điều chỉnh tồn kho.</span></div><button type="button" onClick={() => setVersion(v => v + 1)} disabled={loading} aria-label="Làm mới dữ liệu" title="Làm mới dữ liệu"><RefreshCw className={loading ? 'op-spin' : ''} /></button></header>
    {error && <p role="alert" className="op-dashboard-error">{error} Hệ thống sẽ tự tải lại.</p>}
    {loading && !data && <p role="status" className="op-dashboard-empty">Đang tải số liệu và công việc...</p>}
    {data && <div aria-busy={loading}>
      <section className="op-dashboard-summary" aria-label="Tổng quan công việc">{cards.map(card => <Link key={card.key} to={card.route} className="op-dashboard-kpi"><span className="op-kpi-icon"><AppIcon name={card.icon} /></span><span><span className="op-kpi-label">{card.label}</span><strong><AnimatedNumber value={card.count} /></strong></span></Link>)}</section>
      <div className="op-dashboard-charts"><section className="op-chart-panel"><h2>Công việc đang chờ</h2><p>Số lượng phiếu và đơn hàng theo nghiệp vụ</p><div className="op-bar-chart" aria-label="Biểu đồ công việc đang chờ">{cards.map(card => <Link key={card.key} className="op-chart-column" to={card.route} title={`${card.label}: ${card.count}`} aria-label={`${card.label}: ${card.count}`}><span className="op-chart-count">{card.count}</span><span className="op-chart-track"><span className={card.key === 'adjustments' ? 'op-chart-fill is-warning' : 'op-chart-fill'} style={{ height: `${card.count / chartMax * 100}%` }} /></span><span className="op-chart-label">{tabItems.find(item => item.key === card.key)?.label}</span></Link>)}</div><div className="op-chart-legend"><span><i />Cần xử lý</span><span><i />Chờ quản lý kho duyệt</span></div></section>
      <section className="op-chart-panel"><h2>Tiến độ soạn hàng</h2><p>Khối lượng đã soạn / khối lượng được duyệt</p>{data.picking.length === 0 ? <Empty /> : data.picking.map(row => { const percent = row.approvedWeightKg > 0 ? row.pickedWeightKg / row.approvedWeightKg * 100 : 0; return <Link className="op-picking-row" key={row.id} to={detail(ROUTES.OPERATION_PICKING_ORDER_DETAIL, row.id)}><span><b>{row.orderCode}</b><span>{kg(row.pickedWeightKg)} / {kg(row.approvedWeightKg)} · {percent.toLocaleString('vi-VN', {maximumFractionDigits:1})}%</span></span><span className="op-picking-progress"><span style={{width:`${Math.min(100, Math.max(0, percent))}%`}} /></span>{row.pickingLockReason && <small>{row.pickingLockReason}</small>}</Link> })}</section></div>
      <section className="op-task-panel"><div className="op-task-heading"><div><h2>Công việc cần theo dõi</h2><p>Ưu tiên các công việc đang chờ xử lý.</p></div><Link to={tabItems.find(item => item.key === tab)?.route ?? ROUTES.OPERATION}>Xem tất cả <ArrowRight /></Link></div><div className="op-task-tabs" role="tablist" aria-label="Nhóm công việc">{tabItems.map(item => <button type="button" role="tab" aria-selected={tab === item.key} key={item.key} onClick={() => setTab(item.key)}>{item.label}<span>{item.count ?? '—'}</span></button>)}</div><div className="op-tasks">
        {tab === 'receipts' && (data.receipts.items.length === 0 ? <Empty /> : data.receipts.items.map(row => <Task key={row.id} to={detail(ROUTES.OPERATION_GOODS_RECEIPT_DETAIL, row.id)} title={row.receiptCode} description={`${row.batchCode} · ${row.locationName} · ${kg(row.weightInKg)}`} status="Phiếu nháp" />))}
        {tab === 'picking' && (data.picking.length === 0 ? <Empty /> : data.picking.map(row => <Task key={row.id} to={detail(ROUTES.OPERATION_PICKING_ORDER_DETAIL, row.id)} title={row.orderCode} description={`${row.distributorName} · Đã soạn ${kg(row.pickedWeightKg)} / ${kg(row.approvedWeightKg)}${row.pickingLockReason ? ` · ${row.pickingLockReason}` : ''}`} status={<PickingStatus status={row.status} />} />))}
        {tab === 'issues' && (data.issues.items.length === 0 ? <Empty /> : data.issues.items.map(row => <Task key={row.id} to={detail(ROUTES.OPERATION_GOODS_ISSUE_DETAIL, row.id)} title={row.issueCode} description={`${row.orderCode} · ${row.distributorName} · ${kg(row.weightInKg)}`} status="Phiếu nháp" />))}
        {tab === 'adjustments' && (data.adjustments.items.length === 0 ? <Empty /> : data.adjustments.items.map(row => <Task key={row.id} to={detail(ROUTES.OPERATION_STOCK_ADJUSTMENT_DETAIL, row.id)} title={row.adjustmentCode} description={`${row.batchCode} · ${row.productName}`} status="Quản lý kho đang xử lý" />))}
      </div></section>
    </div>}
  </div>
}
function Empty() { return <p className="op-dashboard-empty">Không có công việc đang chờ.</p> }
function Task({ to, title, description, status }: { to: string; title: string; description: string; status: React.ReactNode }) {
  return <Link to={to} className="op-task-row"><span><strong>{title}</strong><small>{description}</small></span><span>{status}</span><ArrowRight /></Link>
}
