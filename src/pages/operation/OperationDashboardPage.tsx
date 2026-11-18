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
const panel = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm'
const detail = (route: string, id: number) => route.replace(':id', String(id))
const kg = (value: number) => `${value.toLocaleString('vi-VN')} kg`

export default function OperationDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
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
  const cards = data && [
    { label: 'Phiếu nhập chờ xác nhận', count: data.receipts.totalCount, route: ROUTES.OPERATION_GOODS_RECEIPTS, icon: 'package' as const },
    { label: 'Phiếu xuất chờ xác nhận', count: data.issues.totalCount, route: ROUTES.OPERATION_GOODS_ISSUES, icon: 'logout' as const },
    { label: 'Đơn hàng còn cần soạn', count: data.pickingCount, route: ROUTES.OPERATION_PICKING_ORDERS, icon: 'clipboard' as const },
    { label: 'Điều chỉnh tồn chờ duyệt', count: data.adjustments.totalCount, route: ROUTES.OPERATION_STOCK_ADJUSTMENTS, icon: 'pending' as const },
  ]
  return <div className="mx-auto max-w-[1600px] space-y-5">
    <h1 className="text-2xl font-bold sm:text-3xl">Công việc vận hành</h1>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700">{error} Hệ thống sẽ tự tải lại.</p>}
    {loading && !data && <p role="status" className="p-5 text-slate-500">Đang tải số liệu và công việc...</p>}
    {data && <div aria-busy={loading} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards && cards.map(card => <Link key={card.label} to={card.route} className={`${panel} hover:border-emerald-300`}><AppIcon name={card.icon} className="mb-4 size-6 text-emerald-700" /><h2 className="text-sm text-slate-600">{card.label}</h2><p className="mt-2 text-2xl font-bold">{card.count.toLocaleString('vi-VN')}</p></Link>)}</div>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className={panel}><h2 className="mb-3 font-semibold">Nhập kho chờ xác nhận</h2>{data.receipts.items.length === 0 ? <Empty /> : data.receipts.items.map(row => <Task key={row.id} to={detail(ROUTES.OPERATION_GOODS_RECEIPT_DETAIL, row.id)} title={row.receiptCode} description={`${row.batchCode} · ${row.locationName} · ${kg(row.weightInKg)}`} status="Phiếu nháp" />)}</section>
        <section className={panel}><h2 className="mb-3 font-semibold">Xuất kho chờ xác nhận</h2>{data.issues.items.length === 0 ? <Empty /> : data.issues.items.map(row => <Task key={row.id} to={detail(ROUTES.OPERATION_GOODS_ISSUE_DETAIL, row.id)} title={row.issueCode} description={`${row.orderCode} · ${row.distributorName} · ${kg(row.weightInKg)}`} status="Phiếu nháp" />)}</section>
        <section className={panel}><h2 className="mb-3 font-semibold">Đơn hàng còn cần soạn</h2>{data.picking.length === 0 ? <Empty /> : data.picking.map(row => <Task key={row.id} to={detail(ROUTES.OPERATION_PICKING_ORDER_DETAIL, row.id)} title={row.orderCode} description={`${row.distributorName} · Đã soạn ${kg(row.pickedWeightKg)} / ${kg(row.approvedWeightKg)}${row.pickingLockReason ? ` · ${row.pickingLockReason}` : ''}`} status={<PickingStatus status={row.status} />} />)}</section>
        <section className={panel}><h2 className="mb-3 font-semibold">Điều chỉnh tồn đang chờ duyệt</h2>{data.adjustments.items.length === 0 ? <Empty /> : data.adjustments.items.map(row => <Task key={row.id} to={detail(ROUTES.OPERATION_STOCK_ADJUSTMENT_DETAIL, row.id)} title={row.adjustmentCode} description={`${row.batchCode} · ${row.productName}`} status="Quản lý kho đang xử lý" />)}</section>
      </div>
    </div>}
  </div>
}
function Empty() { return <p className="py-5 text-sm text-slate-500">Không có công việc đang chờ.</p> }
function Task({ to, title, description, status }: { to: string; title: string; description: string; status: React.ReactNode }) {
  return <Link to={to} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 py-4 hover:text-emerald-700"><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-slate-500">{description}</p></div><span className="text-xs text-slate-600">{status}</span></Link>
}
