import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, CheckCircle2, Clock, FileCheck2, FlaskConical, LayoutDashboard, Package, Plus, XCircle } from 'lucide-react'
import { AnimatedNumber } from '@/components/common/AnimatedNumber'
import { ROUTES } from '@/constants/routes'
import { supplierBatchService } from '@/services/suppliers/supplierBatchService'
import { getSupplyContracts } from '@/services/supplyContractService'
import type { SupplierBatchItemResponse, SupplierBatchListResponse } from '@/types/supplierBatch'
import type { SupplyContractSummary } from '@/types/supplyContract'

export default function SupplierDashboardPage() {
  const [data, setData] = useState<SupplierBatchListResponse | null>(null)
  const [watching, setWatching] = useState<SupplierBatchItemResponse[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [contracts, setContracts] = useState<SupplyContractSummary[] | null>(null)
  const [error, setError] = useState('')
  const [contractError, setContractError] = useState(false)
  useEffect(() => {
    let active = true
    void supplierBatchService.getDeclaredBatches({ pageIndex: 1, pageSize: 5 }).then(result => { if (active) setData(result) }).catch(() => { if (active) setError('Không thể tải tổng quan lô hàng.') })
    const statuses = ['SUBMITTED', 'PENDING_QC', 'APPROVED_FOR_STORAGE', 'IN_STOCK']
    void Promise.allSettled(statuses.map(status => supplierBatchService.getDeclaredBatches({ status, pageIndex: 1, pageSize: 3 }))).then(results => { if (active) { setCounts(Object.fromEntries(results.flatMap((result, index) => result.status === 'fulfilled' ? [[statuses[index], result.value.batches.totalCount]] : []))); setWatching(results.slice(0, 2).flatMap(result => result.status === 'fulfilled' ? result.value.batches.items : [])) } })
    void getSupplyContracts('', 'PENDING_SUPPLIER', 1, 'createdAt', 'desc').then(result => { if (active) setContracts(result.items) }).catch(() => { if (active) setContractError(true) })
    return () => { active = false }
  }, [])
  const summary = data?.summary
  const stats = [
    { label: 'Tổng lô đã khai báo', value: summary?.totalDeclaredBatches, Icon: Package },
    { label: 'Chờ tiếp nhận', value: counts.SUBMITTED, Icon: Clock },
    { label: 'Chờ kiểm định QC', value: summary?.pendingQCBatches, Icon: FlaskConical },
    { label: 'Đã duyệt nhập kho', value: counts.APPROVED_FOR_STORAGE, Icon: CheckCircle2 },
    { label: 'Đã nhập kho', value: counts.IN_STOCK, Icon: FileCheck2 },
    { label: 'Bị từ chối', value: summary?.rejectedBatches, Icon: XCircle },
  ]
  return <div className="sp-dashboard">
    <header className="sp-heading"><span className="sp-heading-icon"><LayoutDashboard /></span><div><p>Tổng quan / Nhà cung cấp</p><h1>Tổng quan lô hàng</h1><span>Theo dõi tiến độ khai báo, kiểm định và nhập kho.</span></div><Link className="sp-primary" to={ROUTES.SUPPLIER_BATCH_NEW}><Plus /> Khai báo lô mới</Link></header>
    {error && <p className="sp-error" role="alert">{error}</p>}
    <section className="sp-stats" aria-label="Thống kê lô hàng">{stats.map(({label,value,Icon}) => <div className="sp-stat" key={label}><span className="sp-stat-icon"><Icon /></span><div><span>{label}</span><strong>{value == null ? '—' : <AnimatedNumber value={value} />}</strong></div></div>)}</section>
    <div className="sp-dashboard-grid"><section className="sp-panel"><h2><span className="sp-section-icon"><Clock /></span>Công việc cần xử lý</h2>{contractError ? <p className="sp-muted">Không thể tải hợp đồng chờ xác nhận.</p> : contracts == null ? <p className="sp-muted">Đang tải hợp đồng...</p> : contracts.length ? contracts.slice(0,3).map(contract => <Link className="sp-task" key={contract.id} to={ROUTES.SUPPLIER_CONTRACTS}><span><b>Hợp đồng chờ bạn xác nhận</b><small>{contract.contractCode} · {contract.cropTypeName}</small></span><ArrowRight /></Link>) : <p className="sp-muted">Không có hợp đồng chờ xác nhận.</p>}{watching.slice(0,6).map(batch => <Link className="sp-task" key={batch.batchId} to={`/supplier/batches/${batch.batchId}`}><span><b>{batch.status === 'PENDING_QC' ? 'Đang theo dõi kiểm định QC' : 'Đang chờ tiếp nhận'}</b><small>{batch.batchCode} · {batch.productName}</small></span><ArrowRight /></Link>)}</section>
    <section className="sp-panel"><h2><span className="sp-section-icon"><FileCheck2 /></span>Tiến độ lô hàng</h2>{summary ? stats.slice(1).map(({label,value}) => <div className="sp-progress-item" key={label}><div><span>{label}</span><b>{value}</b></div><div className="sp-progress"><span style={{width:`${summary.totalDeclaredBatches ? Math.min(100, (value ?? 0) / summary.totalDeclaredBatches * 100) : 0}%`}} /></div></div>) : <p className="sp-muted">{error || 'Đang tải dữ liệu...'}</p>}</section></div>
    <section className="sp-panel sp-recent"><h2><span className="sp-section-icon"><Package /></span>Lô hàng gần đây <Link to={ROUTES.SUPPLIER_BATCHES}>Xem tất cả <ArrowRight /></Link></h2>{data ? data.batches.items.length ? <div className="sp-table-scroll"><table><thead><tr><th>Mã lô / Nông sản</th><th>Ngày khai báo</th><th>Hoàn tất</th><th>Tiêu thụ</th><th>Trạng thái</th><th /></tr></thead><tbody>{data.batches.items.map(batch => <tr key={batch.batchId}><td><b>{batch.batchCode}</b><small>{batch.productName}</small></td><td>{batch.submittedDate ? new Date(batch.submittedDate).toLocaleDateString('vi-VN') : '—'}</td><td>{batch.completedDate ? new Date(batch.completedDate).toLocaleDateString('vi-VN') : '—'}</td><td>{batch.consumptionStatusDisplayName || '—'}</td><td>{batch.statusDisplayName || batch.status}</td><td><Link aria-label={`Xem lô ${batch.batchCode}`} to={`/supplier/batches/${batch.batchId}`}><ArrowRight /></Link></td></tr>)}</tbody></table></div> : <p className="sp-muted">Chưa có lô hàng khai báo.</p> : <p className="sp-muted">{error || 'Đang tải dữ liệu...'}</p>}</section>
  </div>
}
