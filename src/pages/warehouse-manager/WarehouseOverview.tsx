import { parseApiTimestamp } from '@/utils/vietnamTime'
import { AnimatedNumber } from '@/components/common/AnimatedNumber'
import AppIcon from '@/components/common/AppIcon'
import { DashboardLink } from '@/components/common/DashboardLink'
import { ROUTES } from '@/constants/routes'
import { WarehouseSpoilageForecast } from '@/features/operation/components/spoilage-forecast/WarehouseSpoilageForecast'
import type { ProductQualityDistributionChart, WarehouseCapacityChart, WarehouseInventoryLevelChart } from '@/types/inventory'
import './warehouse-overview.css'
import './warehouse-dashboard.css'

const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })
const dateTime = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh',  dateStyle: 'short', timeStyle: 'short' })
const gradeColors = ['#059669', '#3976bb', '#d89b4c', '#e56565', '#7658a6', '#94a3b8']
const kg = (value: number | null | undefined) => value == null ? '—' : `${number.format(value)} kg`
const percent = (value: number) => `${number.format(value)}%`
const clamp = (value: number) => Math.max(0, Math.min(100, value))

type Props = { inventory: WarehouseInventoryLevelChart | null; capacity: WarehouseCapacityChart | null; quality: ProductQualityDistributionChart | null; loading: boolean; error: string; onRefresh: () => void }

export default function WarehouseOverview({ inventory, capacity, quality, loading, error, onRefresh }: Props) {
  const alerts = capacity ? capacity.nearCapacityCount + capacity.overcrowdedCount : null
  const updated = inventory?.generatedAt ?? capacity?.generatedAt ?? quality?.generatedAt
  const inventorySum = inventory ? inventory.totalAvailableKg + inventory.totalReservedKg : 0
  const availablePercent = inventorySum > 0 && inventory ? (inventory.totalAvailableKg / inventorySum) * 100 : 0

  const gradeStops = quality?.grades.map((grade, index) => {
    const start = quality.grades.slice(0, index).reduce((sum, item) => sum + Math.max(0, item.percentage), 0)
    const end = start + Math.max(0, grade.percentage)
    return `${gradeColors[index % gradeColors.length]} ${start}% ${end}%`
  }).join(', ')
  const metrics = [
    { label: 'Tổng tồn kho', value: kg(inventory?.totalOnHandKg), detail: inventory ? `${inventory.activeLocationCount} vị trí đang hoạt động` : 'Chưa có dữ liệu', icon: 'database', to: ROUTES.WAREHOUSE_INVENTORY, tone: 'primary' },
    { label: 'Tồn kho khả dụng', value: kg(inventory?.totalAvailableKg), detail: inventory ? `${kg(inventory.totalReservedKg)} đã giữ cho đơn hàng` : 'Chưa có dữ liệu', icon: 'package', to: ROUTES.WAREHOUSE_INVENTORY, tone: 'available' },
    { label: 'Sức chứa đã dùng', value: capacity ? percent(capacity.utilizationPercent) : '—', detail: capacity ? `Còn trống ${kg(capacity.availableWeightKg)}` : 'Chưa có dữ liệu', icon: 'dashboard', to: ROUTES.WAREHOUSE_CAPACITY, tone: 'capacity' },
    { label: 'Lô đang lưu kho', value: quality ? number.format(quality.totalBatchCount) : '—', detail: quality ? `Hạng chủ đạo: ${quality.leadingGrade ?? 'Chưa phân hạng'}` : 'Chưa có dữ liệu', icon: 'clipboard', to: ROUTES.WAREHOUSE_QUALITY, tone: 'quality' },
  ] as const
  return <div className="saw-wm-dashboard mx-auto max-w-[1600px] pb-8">
    <header className="wm-header"><div><p className="wm-eyebrow">Quản lý kho / Tổng quan</p><h1>Điều hành kho hàng</h1><p>Theo dõi tồn kho, sức chứa và chất lượng tại một nơi.</p></div><div className="wm-header-actions"><span>{updated ? `Cập nhật ${dateTime.format(parseApiTimestamp(updated))}` : 'Đang chờ dữ liệu'}</span><button type="button" onClick={onRefresh} disabled={loading} className="wm-refresh"><AppIcon name="refresh" className={loading ? 'wm-spin' : ''} /> Làm mới</button></div></header>
    {error && <div role="alert" className="wm-error">{error} <button onClick={onRefresh} type="button">Thử lại</button></div>}
    {loading && !inventory && !capacity && !quality && <p role="status" className="wm-loading">Đang tải dữ liệu kho…</p>}
    <section className="wm-metrics" aria-label="Chỉ số kho">{metrics.map(metric => <DashboardLink key={metric.label} to={metric.to} className={`wm-card wm-card--${metric.tone}`}><div className="wm-card-top"><span>{metric.label}</span><span className="wm-card-icon"><AppIcon name={metric.icon} /></span></div><strong className="wm-value"><AnimatedNumber value={metric.value} /></strong><span className="wm-card-detail">{metric.detail}</span></DashboardLink>)}</section>
    <div className="wm-overview-title"><div><p className="wm-eyebrow">THEO DÕI VẬN HÀNH</p><h2>Tổng quan kho hàng</h2></div><span className={`wm-alert ${alerts ? 'wm-alert--warning' : ''}`}>{alerts == null ? 'Chưa có dữ liệu sức chứa' : alerts ? `${alerts} vị trí cần chú ý` : 'Không có cảnh báo sức chứa'}</span></div>
    <div className="wm-main-grid"><section className="wm-panel"><div className="wm-panel-heading"><div><h3>Sức chứa theo kho</h3><p>Theo dõi mức sử dụng các vị trí lưu trữ.</p></div><DashboardLink to={ROUTES.WAREHOUSE_CAPACITY}>Xem tất cả →</DashboardLink></div>
      {capacity ? <><div className="wm-capacity-summary"><div><span>Đang lưu trữ / sức chứa đã thiết lập</span><strong>{kg(capacity.usedWeightKg)} <small>/ {kg(capacity.configuredCapacityKg)}</small></strong></div><div><span>Còn trống</span><strong>{kg(capacity.availableWeightKg)}</strong></div><div><span>Mức sử dụng</span><strong><AnimatedNumber value={percent(capacity.utilizationPercent)} delay={300} /></strong></div></div><div className="wm-bar" role="progressbar" aria-label="Sức chứa đã sử dụng" aria-valuemin={0} aria-valuemax={100} aria-valuenow={clamp(capacity.utilizationPercent)} aria-valuetext={percent(capacity.utilizationPercent)}><span style={{width: `${clamp(capacity.utilizationPercent)}%`}} /></div><div className="wm-zones"><div className="wm-zone-head"><span>Vị trí lưu trữ</span><span>Khối lượng / Sức chứa</span><span>Mức sử dụng</span></div>{capacity.locations.length ? [...capacity.locations].sort((a,b) => (b.utilizationPercent ?? -1) - (a.utilizationPercent ?? -1)).slice(0,4).map(item => <div className="wm-zone" key={item.locationId}><div><strong>{item.locationCode}</strong><small>{item.zoneName}</small></div><span>{kg(item.usedWeightKg)} / {kg(item.maxWeightKg)}</span><div><strong>{item.utilizationPercent == null ? 'Chưa thiết lập' : percent(item.utilizationPercent)}</strong><div className="wm-bar wm-bar--small" aria-hidden="true"><span className={item.status === 'OVERCROWDED' ? 'wm-bar--red' : item.status === 'NEAR_CAPACITY' ? 'wm-bar--orange' : ''} style={{width: `${clamp(item.utilizationPercent ?? 0)}%`}} /></div></div></div>) : <p className="wm-empty">Chưa có kho đang hoạt động.</p>}</div></> : <p className="wm-empty">{loading ? 'Đang tải sức chứa…' : 'Chưa tải được dữ liệu sức chứa.'}</p>}
    </section><section className="wm-panel"><div className="wm-panel-heading"><div><h3>Phân bố chất lượng</h3><p>Tỷ trọng theo khối lượng tồn.</p></div><DashboardLink to={ROUTES.WAREHOUSE_QUALITY}>Chi tiết →</DashboardLink></div>
      {quality ? <>{quality.grades.length && gradeStops ? <div className="wm-quality-layout"><div data-saw-donut className="wm-donut" style={{background: `conic-gradient(${gradeStops})`}} aria-hidden="true"><div><strong><AnimatedNumber value={quality.totalBatchCount} delay={300} /></strong><span>lô hàng</span></div></div><div className="wm-grade-list">{quality.grades.map((grade,index) => <div key={grade.grade}><span className="wm-grade-dot" style={{backgroundColor:gradeColors[index % gradeColors.length]}} /><div><strong>{grade.grade === 'UNGRADED' ? 'Chưa phân hạng' : `Hạng ${grade.grade}`}</strong><small>{grade.batchCount} lô · {kg(grade.quantityOnHandKg)}</small></div><b><AnimatedNumber value={percent(grade.percentage)} delay={300} /></b></div>)}</div></div> : <p className="wm-empty">Chưa có tồn kho để phân tích chất lượng.</p>}<div className="wm-quality-footer"><span>Tổng tồn: <strong>{kg(quality.totalQuantityOnHandKg)}</strong></span><span>Hạng chủ đạo: <strong>{quality.leadingGrade ?? 'Chưa phân hạng'}</strong></span></div></> : <p className="wm-empty">{loading ? 'Đang tải chất lượng…' : 'Chưa tải được dữ liệu chất lượng.'}</p>}
    </section></div>
    <section className="wm-panel wm-stock"><div className="wm-panel-heading"><div><h3>Trạng thái tồn kho</h3><p>Khối lượng khả dụng và đã giữ cho đơn hàng.</p></div><DashboardLink to={ROUTES.WAREHOUSE_INVENTORY}>Chi tiết →</DashboardLink></div>{inventory ? <><div className="wm-stock-values"><div><span>Khả dụng</span><strong>{kg(inventory.totalAvailableKg)}</strong></div><div><span>Đã giữ cho đơn hàng</span><strong>{kg(inventory.totalReservedKg)}</strong></div></div><div className="wm-stockbar" aria-label={`Khả dụng ${kg(inventory.totalAvailableKg)}, đã giữ ${kg(inventory.totalReservedKg)}`}><span style={{width:`${clamp(availablePercent)}%`}} /><span style={{width:`${inventorySum > 0 ? clamp(100-availablePercent) : 0}%`}} /></div></> : <p className="wm-empty">{loading ? 'Đang tải tồn kho…' : 'Chưa tải được dữ liệu tồn kho.'}</p>}</section>
    <WarehouseSpoilageForecast />
  </div>
}
