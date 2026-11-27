import { parseApiTimestamp } from '@/utils/vietnamTime'
import { AnimatedNumber } from '@/components/common/AnimatedNumber'
import { useState } from 'react'
import AppIcon from '@/components/common/AppIcon'
import type { InventoryLocationLevel, WarehouseInventoryLevelChart } from '@/types/inventory'
import './warehouse-inventory.css'

const amount = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })
const dateTime = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh',  dateStyle: 'short', timeStyle: 'short' })
const kg = (value: number | null | undefined) => value == null ? '—' : `${amount.format(value)} kg`
const percent = (value: number) => `${amount.format(value)}%`
const clamp = (value: number) => Math.min(100, Math.max(0, value))

function getStatus(item: InventoryLocationLevel) {
  if (item.locationStatus === 'INACTIVE') return { id: 'inactive', label: 'Ngừng hoạt động' }
  if (item.lowStockItemCount > 0) return { id: 'low', label: 'Cần bổ sung' }
  if (item.utilizationPercent == null) return { id: 'unknown', label: 'Chưa thiết lập' }
  if (item.utilizationPercent >= 90) return { id: 'near', label: 'Gần đầy' }
  return { id: 'normal', label: 'Bình thường' }
}

type Props = { inventory: WarehouseInventoryLevelChart | null; loading: boolean; error: string; onRefresh: () => void }

export default function WarehouseInventoryOverview({ inventory, loading, error, onRefresh }: Props) {
  const [query, setQuery] = useState('')
  const [zone, setZone] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const locations = inventory?.locations ?? []
  const zones = [...new Set(locations.map(item => item.zoneName).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'))
  const search = query.trim().toLocaleLowerCase('vi-VN')
  const visible = locations.filter(item => [item.locationCode, item.zoneName, item.rackName, item.binName].filter(Boolean).join(' ').toLocaleLowerCase('vi-VN').includes(search) && (zone === 'ALL' || item.zoneName === zone) && (status === 'ALL' || getStatus(item).id === status))
  const stockSum = inventory ? inventory.totalAvailableKg + inventory.totalReservedKg : 0
  const availablePercent = stockSum > 0 && inventory ? clamp(inventory.totalAvailableKg / stockSum * 100) : 0
  const reservedPercent = stockSum > 0 && inventory ? clamp(inventory.totalReservedKg / stockSum * 100) : 0
  const metrics = [
    { label: 'Tổng tồn kho', value: kg(inventory?.totalOnHandKg), note: inventory ? `${kg(inventory.totalAvailableKg)} khả dụng` : 'Chưa có dữ liệu', icon: 'database', tone: 'primary' },
    { label: 'Tồn kho khả dụng', value: kg(inventory?.totalAvailableKg), note: 'Có thể sử dụng', icon: 'package', tone: 'green' },
    { label: 'Đã giữ cho đơn hàng', value: kg(inventory?.totalReservedKg), note: 'Chờ xử lý đơn hàng', icon: 'clipboard', tone: 'orange' },
    { label: 'Vị trí hoạt động', value: inventory ? amount.format(inventory.activeLocationCount) : '—', note: inventory ? `${inventory.locations.length} vị trí trong danh sách` : 'Chưa có dữ liệu', icon: 'dashboard', tone: 'blue' },
  ] as const

  return <div className="saw-wm-inventory">
    <header className="inv-header"><div><p className="inv-eyebrow">Quản lý kho / Tồn kho</p><h1>Tồn kho</h1><p>Theo dõi lượng tồn, khả dụng và mức sử dụng theo từng vị trí lưu trữ.</p></div><div className="inv-header-actions"><span>{inventory ? `Cập nhật ${dateTime.format(parseApiTimestamp(inventory.generatedAt))}` : 'Đang chờ dữ liệu'}</span><button type="button" className="inv-button" onClick={onRefresh} disabled={loading}><AppIcon name="refresh" className={loading ? 'inv-spin' : ''} /> Làm mới</button></div></header>
    {error && <div role="alert" className="inv-error">{error} <button type="button" onClick={onRefresh}>Thử lại</button></div>}
    {loading && !inventory && <p role="status" className="inv-empty">Đang tải dữ liệu tồn kho…</p>}
    <section className="inv-metrics" aria-label="Thống kê tồn kho">{metrics.map(metric => <article className={`inv-card inv-card--${metric.tone}`} key={metric.label}><div className="inv-card-top"><span>{metric.label}</span><i><AppIcon name={metric.icon} /></i></div><strong><AnimatedNumber value={metric.value} /></strong><small>{metric.note}</small></article>)}</section>
    <section className="inv-panel inv-composition"><div><p className="inv-eyebrow">Cơ cấu tồn kho</p><h2>Khả dụng &amp; giữ chỗ</h2><p>Khối lượng hiện tại</p></div>{inventory ? <div className="inv-chart"><div className="inv-chart-values"><div><span>Khả dụng</span><strong><AnimatedNumber value={kg(inventory.totalAvailableKg)} delay={300} /></strong></div><div><span>Đã giữ cho đơn hàng</span><strong><AnimatedNumber value={kg(inventory.totalReservedKg)} delay={300} /></strong></div></div><div className="inv-chart-bar" role="img" aria-label={`Khả dụng ${kg(inventory.totalAvailableKg)}, ${percent(availablePercent)}; đã giữ ${kg(inventory.totalReservedKg)}, ${percent(reservedPercent)}`}><span style={{width:`${availablePercent}%`}} /><span style={{width:`${reservedPercent}%`}} /></div><div className="inv-chart-caption"><span><AnimatedNumber value={percent(availablePercent)} delay={300} /> khả dụng</span><span><AnimatedNumber value={percent(reservedPercent)} delay={300} /> đã giữ</span></div></div> : <p className="inv-empty">{loading ? 'Đang tải cơ cấu tồn kho…' : 'Chưa tải được dữ liệu tồn kho.'}</p>}</section>
    <section className="inv-panel"><div className="inv-panel-heading"><div><h2>Tồn kho theo vị trí</h2><p>Chi tiết lượng tồn và sức chứa từng vị trí lưu trữ.</p></div><span className="inv-update">Tự làm mới mỗi 30 giây</span></div>
      <div className="inv-filters"><label className="inv-search"><span className="sr-only">Tìm vị trí lưu trữ</span><AppIcon name="search" /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm mã vị trí, khu vực..." /></label><label><span className="sr-only">Khu vực</span><select value={zone} onChange={event => setZone(event.target.value)}><option value="ALL">Tất cả khu vực</option>{zones.map(item => <option key={item} value={item}>{item}</option>)}</select></label><label><span className="sr-only">Trạng thái</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="ALL">Tất cả trạng thái</option><option value="normal">Bình thường</option><option value="near">Gần đầy</option><option value="low">Cần bổ sung</option><option value="unknown">Chưa thiết lập</option><option value="inactive">Ngừng hoạt động</option></select></label><button type="button" className="inv-button" onClick={() => { setQuery(''); setZone('ALL'); setStatus('ALL') }}>Đặt lại</button></div>
      {!inventory ? <p className="inv-empty">{loading ? 'Đang tải danh sách vị trí…' : 'Chưa tải được danh sách vị trí.'}</p> : visible.length === 0 ? <p className="inv-empty">{locations.length ? 'Không tìm thấy vị trí phù hợp.' : 'Chưa có vị trí lưu trữ.'}</p> : <table className="inv-table"><thead><tr><th>Vị trí lưu trữ</th><th>Tồn thực tế</th><th>Khả dụng</th><th>Đã giữ</th><th>Mức sử dụng</th><th>Trạng thái</th></tr></thead><tbody>{visible.map(item => { const state = getStatus(item); const use = item.utilizationPercent; const place = [item.zoneName, item.rackName, item.binName].filter(Boolean).join(' · '); return <tr key={item.locationId}><td data-label="Vị trí lưu trữ"><div className="inv-location"><i><AppIcon name="dashboard" /></i><div><strong>{item.locationCode}</strong><small>{place} · {item.batchCount} lô</small></div></div></td><td data-label="Tồn thực tế"><strong>{kg(item.quantityOnHandKg)}</strong><small>/ {item.maxWeightKg == null ? 'Chưa thiết lập' : kg(item.maxWeightKg)}</small></td><td data-label="Khả dụng" className="inv-green">{kg(item.availableQuantityKg)}</td><td data-label="Đã giữ" className="inv-orange">{kg(item.reservedQuantityKg)}</td><td data-label="Mức sử dụng"><div className="inv-usage"><strong>{use == null ? '—' : percent(use)}</strong><div className="inv-bar" role="progressbar" aria-label={`Mức sử dụng ${item.locationCode}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={use == null ? undefined : clamp(use)} aria-valuetext={use == null ? 'Chưa thiết lập' : percent(use)}><span className={`inv-bar--${state.id}`} style={{width:`${clamp(use ?? 0)}%`}} /></div></div></td><td data-label="Trạng thái"><span className={`inv-badge inv-badge--${state.id}`}>{state.label}</span></td></tr>})}</tbody></table>}
      {inventory && <div className="inv-footer">Hiển thị {visible.length} / {locations.length} vị trí</div>}
    </section>
  </div>
}
