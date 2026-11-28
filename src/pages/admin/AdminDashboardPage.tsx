import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight, ClipboardCheck, FileClock, FileX, History, Layers3, Sprout, UserCheck, Users, Warehouse } from 'lucide-react'
import { AnimatedNumber } from '@/components/common/AnimatedNumber'
import FormNotification from '@/components/common/FormNotification'
import RefreshButton from '@/components/common/RefreshButton'
import { ROUTES } from '@/constants/routes'
import { getAdminDashboard, type AdminDashboardData, type DailyAuditActivity } from '@/services/adminDashboardService'
import { getInspectionStandards } from '@/services/inspectionStandardService'
import { getSupplyContracts } from '@/services/supplyContractService'
import { getAccounts } from '@/services/userAccessService'
import { getAuditLogs } from '@/services/auditService'
import { apiClient } from '@/services/apiClient'
import type { ApiResponse } from '@/types/api'
import type { AuditLogItem } from '@/types/audit'
import './admin-dashboard.css'

type Data = { dashboard: AdminDashboardData | null; contracts: number | null; cancellations: number | null; standards: number | null; inactive: number | null; locked: number | null; locations: number | null; audit: AuditLogItem[] | null }
const initial: Data = { dashboard: null, contracts: null, cancellations: null, standards: null, inactive: null, locked: null, locations: null, audit: null }
const palette = ['#087f59', '#4e83b5', '#c18b36', '#8d84b8', '#8ab8a5', '#64748b', '#c5a366']
const number = (value: number | null | undefined) => value == null ? <span className="ad-unavailable">Chưa có dữ liệu</span> : <AnimatedNumber value={value} />
const roleName: Record<string, string> = { ADMINISTRATOR: 'Quản trị viên', 'Administrator': 'Quản trị viên', WAREHOUSE_MANAGER: 'Quản lý kho', 'Warehouse Manager': 'Quản lý kho', QC_STAFF: 'Nhân viên kiểm định', 'QC Staff': 'Nhân viên kiểm định', OPERATION_STAFF: 'Nhân viên vận hành', 'Operation Staff': 'Nhân viên vận hành', SUPPLIER: 'Nhà cung cấp', Supplier: 'Nhà cung cấp', DISTRIBUTOR: 'Nhà phân phối', Distributor: 'Nhà phân phối' }
function Panel({ title, extra, children }: { title: string; extra?: ReactNode; children: ReactNode }) { return <section className="ad-panel"><header className="ad-panel-head"><h2>{title}</h2>{extra}</header>{children}</section> }
function showTime(value: string) { const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`; const date = new Date(normalized); return Number.isNaN(date.getTime()) ? 'Chưa ghi nhận' : new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh',  dateStyle: 'short', timeStyle: 'short' }).format(date) }

function ActivityChart({ days }: { days: DailyAuditActivity[] }) {
  if (!days.length) return <div className="ad-chart-empty"><History /><strong>Chưa có dữ liệu thống kê</strong></div>
  const peak = Math.max(1, ...days.flatMap(day => [day.loginSuccessCount + day.loginFailedCount, day.operationCount]))
  const step = Math.max(1, Math.ceil(peak / 4))
  const top = step * 4
  const x = (index: number) => 52 + index * (620 / Math.max(1, days.length - 1))
  const y = (value: number) => 176 - value / top * 146
  const login = days.map((day, i) => `${x(i)},${y(day.loginSuccessCount + day.loginFailedCount)}`).join(' ')
  const actions = days.map((day, i) => `${x(i)},${y(day.operationCount)}`).join(' ')
  return <div className="ad-activity-chart">
    <div className="ad-chart-legend"><span><i className="ad-chart-dot--login" />Đăng nhập</span><span><i className="ad-chart-dot--actions" />Thao tác</span><small>Giờ Việt Nam · tính theo bản ghi</small></div>
    <svg viewBox="0 0 700 215" role="img" aria-label="Hoạt động đăng nhập và thao tác trong bảy ngày theo giờ Việt Nam">
      {[0, 1, 2, 3, 4].map(tick => <g key={tick}><line x1="52" y1={y(tick * step)} x2="672" y2={y(tick * step)} className="ad-chart-grid" /><text x="42" y={y(tick * step) + 4} textAnchor="end">{tick * step}</text></g>)}
      <polyline points={actions} className="ad-chart-line ad-chart-line--actions" /><polyline points={login} className="ad-chart-line ad-chart-line--login" />
      {days.map((day, i) => <g key={day.date}><circle cx={x(i)} cy={y(day.operationCount)} r="4" className="ad-chart-point ad-chart-point--actions"><title>{day.date}: {day.operationCount} bản ghi thao tác</title></circle><circle cx={x(i)} cy={y(day.loginSuccessCount + day.loginFailedCount)} r="4" className="ad-chart-point ad-chart-point--login"><title>{day.date}: {day.loginSuccessCount} đăng nhập thành công, {day.loginFailedCount} thất bại</title></circle><text x={x(i)} y="201" textAnchor="middle">{day.date.slice(8, 10)}/{day.date.slice(5, 7)}</text></g>)}
    </svg>
    <div className="ad-chart-data">{days.map(day => <span key={day.date}>{day.date.slice(8,10)}/{day.date.slice(5,7)}: {day.loginSuccessCount + day.loginFailedCount} đăng nhập ({day.loginFailedCount} thất bại), {day.operationCount} thao tác</span>)}</div>
  </div>
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<Data>(initial)
  const [failed, setFailed] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [notice, setNotice] = useState('')
  const busy = useRef(false)
  const mounted = useRef(false)
  const load = useCallback(async (manual = false) => {
    if (busy.current) return
    busy.current = true; setLoading(true); if (manual) setNotice('')
    const requests = [
      getAdminDashboard(),
      getSupplyContracts('', 'PENDING_ADMIN', 1, 'createdAt', 'desc'),
      getSupplyContracts('', 'PENDING_ADMIN_CANCELLATION', 1, 'createdAt', 'desc'),
      getInspectionStandards(), getAccounts('', undefined, 'INACTIVE'), getAccounts('', undefined, 'LOCKED'),
      apiClient.get<ApiResponse<Array<{ id: number }>>>('/warehouse-locations'),
      getAuditLogs({ page: 1, pageSize: 6 }),
    ] as const
    const result = await Promise.allSettled(requests)
    busy.current = false
    if (!mounted.current) return
    const labels = ['tổng quan tài khoản', 'hợp đồng chờ duyệt', 'yêu cầu hủy', 'tiêu chuẩn', 'tài khoản ngừng hoạt động', 'tài khoản bị khóa', 'vị trí kho', 'nhật ký']
    setFailed(result.flatMap((item, i) => item.status === 'rejected' ? [labels[i]] : []))
    if (manual && result.some(item => item.status === 'rejected')) setNotice('Không thể làm mới một số dữ liệu. Vui lòng thử lại.')
    setData(previous => ({
      dashboard: result[0].status === 'fulfilled' ? result[0].value : previous.dashboard,
      contracts: result[1].status === 'fulfilled' ? result[1].value.totalCount : previous.contracts,
      cancellations: result[2].status === 'fulfilled' ? result[2].value.totalCount : previous.cancellations,
      standards: result[3].status === 'fulfilled' ? result[3].value.length : previous.standards,
      inactive: result[4].status === 'fulfilled' ? result[4].value.totalCount : previous.inactive,
      locked: result[5].status === 'fulfilled' ? result[5].value.totalCount : previous.locked,
      locations: result[6].status === 'fulfilled' ? result[6].value.data.data.length : previous.locations,
      audit: result[7].status === 'fulfilled' ? result[7].value.items : previous.audit,
    }))
    if (result.some(item => item.status === 'fulfilled')) setUpdatedAt(new Date())
    setLoading(false)
  }, [])
  useEffect(() => { mounted.current = true; const timer = window.setTimeout(() => void load(), 0); return () => { mounted.current = false; window.clearTimeout(timer) } }, [load])

  const d = data.dashboard
  const roles = d?.roleDistribution ?? []
  const roleTotal = roles.reduce((sum, item) => sum + item.value, 0)
  const stops = roles.map((item, index) => { const start = roleTotal ? roles.slice(0, index).reduce((sum, role) => sum + role.value, 0) / roleTotal * 100 : 0; const end = start + (roleTotal ? item.value / roleTotal * 100 : 0); return `${palette[index % palette.length]} ${start}% ${end}%` }).join(',')
  const states = [{ label: 'Đang hoạt động', value: d?.activeAccounts, color: '#087f59' }, { label: 'Chờ xác minh email', value: d?.pendingAccounts, color: '#c18b36' }, { label: 'Ngừng hoạt động', value: data.inactive, color: '#8591a2' }, { label: 'Đang bị khóa', value: data.locked, color: '#b91c1c' }]
  const stats = [
    { label: 'Tổng tài khoản', value: d?.totalAccounts, note: d ? `${d.activeAccounts.toLocaleString('vi-VN')} đang hoạt động` : 'Chưa có dữ liệu', icon: Users, tone: 'green', to: ROUTES.ADMIN_USER_ACCESS },
    { label: 'Tài khoản chờ duyệt', value: null, note: 'Chưa có thống kê xét duyệt riêng', icon: UserCheck, tone: 'blue', to: ROUTES.ADMIN_USER_ACCESS },
    { label: 'Hợp đồng chờ duyệt', value: data.contracts, note: 'Nhà cung cấp đã xác nhận', icon: FileClock, tone: 'amber', to: ROUTES.ADMIN_CONTRACTS },
    { label: 'Bộ tiêu chuẩn kiểm định', value: data.standards, note: 'Quản lý bộ tiêu chuẩn', icon: ClipboardCheck, tone: 'purple', to: ROUTES.ADMIN_INSPECTION_STANDARDS },
  ]
  const tasks = [
    { label: 'Tài khoản chờ duyệt', description: 'Kiểm tra tài khoản người dùng', value: null, icon: UserCheck, tone: 'blue', to: ROUTES.ADMIN_USER_ACCESS },
    { label: 'Hợp đồng chờ phê duyệt', description: 'Nhà cung cấp đã xác nhận hợp đồng', value: data.contracts, icon: FileClock, tone: 'amber', to: ROUTES.ADMIN_CONTRACTS },
    { label: 'Yêu cầu hủy chờ hoàn tất', description: 'Quản lý kho đã duyệt yêu cầu hủy', value: data.cancellations, icon: FileX, tone: 'red', to: ROUTES.ADMIN_CONTRACTS },
  ]
  return <div className="admin-dashboard">
    <FormNotification warehouse message={notice} onDismiss={() => setNotice('')} />
    <header className="ad-heading"><div><p className="ad-eyebrow">Tổng quan hệ thống</p><h1>Bảng điều khiển</h1><p>Theo dõi tài khoản, hoạt động hệ thống, danh mục và các hợp đồng cần xử lý.</p></div><div className="ad-heading-actions">{updatedAt && <span>Cập nhật {showTime(updatedAt.toISOString())}</span>}<RefreshButton loading={loading} onClick={() => void load(true)} /></div></header>
    {failed.length > 0 && <div role="alert" className="ad-error">Không thể tải: {failed.join(', ')}. Dữ liệu đã tải trước đó được giữ lại nếu có. <button type="button" onClick={() => void load(true)} disabled={loading}>Thử lại</button></div>}
    <div className="ad-stats">{stats.map(({ label, value, note, icon: Icon, tone, to }) => <Link className="ad-stat" key={label} to={to}><div className="ad-stat-head"><span>{label}</span><i className={`ad-icon ad-icon--${tone}`}><Icon /></i></div><strong>{number(value)}</strong><small>{note}</small></Link>)}</div>
    <div className="ad-panels">
      <Panel title="Hoạt động hệ thống (7 ngày)" extra={<span>Số bản ghi nhật ký theo ngày</span>}>{d?.auditActivity ? <ActivityChart days={d.auditActivity} /> : <div className="ad-chart-empty"><History /><strong>{loading ? "Đang tải thống kê…" : "Chưa có dữ liệu thống kê theo ngày"}</strong><span>{!loading && "Kiểm tra kết nối hoặc cập nhật API backend."}</span></div>}</Panel>
      <Panel title="Phân bổ người dùng" extra={<span>{roles.length} vai trò</span>}><div className="ad-distribution">{!d ? <p className="ad-empty">{loading ? 'Đang tải dữ liệu…' : 'Chưa có dữ liệu.'}</p> : roleTotal === 0 ? <p className="ad-empty">Chưa có tài khoản để phân bổ.</p> : <><div className="ad-donut" data-saw-donut style={{ background: `conic-gradient(${stops})` }}><div><strong>{number(roleTotal)}</strong><span>Tài khoản</span></div></div><div className="ad-legend">{roles.map((role, i) => <div key={role.label}><i style={{ background: palette[i % palette.length] }} /><span>{roleName[role.label] ?? role.label}</span><b>{role.value.toLocaleString('vi-VN')}</b><small>{(role.value / roleTotal * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%</small></div>)}</div></>}</div></Panel>
      <Panel title="Công việc cần xử lý" extra={<span>Phạm vi Admin</span>}><div className="ad-rows">{tasks.map(({ label, description, value, icon: Icon, tone, to }) => <Link to={to} key={label} className="ad-task"><i className={`ad-icon ad-icon--${tone}`}><Icon /></i><div><strong>{label}</strong><small>{value === 0 ? 'Không có yêu cầu chờ xử lý' : description}</small></div><b className="ad-task-count">{number(value)}</b><ArrowRight className="ad-arrow" /></Link>)}</div></Panel>
      <Panel title="Trạng thái tài khoản" extra={<span>{d ? `${d.totalAccounts.toLocaleString('vi-VN')} tài khoản` : 'Chưa có dữ liệu'}</span>}><div className="ad-states">{d && d.totalAccounts > 0 && states.every(s => s.value != null) && states.reduce((sum, s) => sum + (s.value ?? 0), 0) === d.totalAccounts && <div className="ad-state-bar" aria-label="Phân bố trạng thái tài khoản">{states.map(s => <span key={s.label} style={{ width: `${Math.max(0, s.value! / d.totalAccounts * 100)}%`, background: s.color }} />)}</div>}{states.map(s => <div className="ad-state" key={s.label}><i style={{ background: s.color }} /><span>{s.label}</span><b>{number(s.value)}</b><small>{d && d.totalAccounts > 0 && s.value != null ? `${(s.value / d.totalAccounts * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%` : '—'}</small></div>)}</div></Panel>
      <Panel title="Hoạt động gần đây" extra={<Link to={ROUTES.ADMIN_AUDIT_LOGS}>Xem tất cả <ArrowRight /></Link>}><div className="ad-audit">{data.audit === null ? <p className="ad-empty">{loading ? 'Đang tải nhật ký…' : 'Chưa tải được nhật ký.'}</p> : data.audit.length === 0 ? <p className="ad-empty">Chưa có hoạt động được ghi nhận.</p> : data.audit.map(item => <Link to={ROUTES.ADMIN_AUDIT_DETAIL.replace(':id', String(item.id))} className="ad-audit-row" key={item.id}><History /><div><strong>{item.description || item.actionType}</strong><small>{item.actorName || 'Chưa ghi nhận'} · {item.entityName}{item.entityId ? ` · ${item.entityId}` : ''} · {item.status === 'FAILED' ? 'Thất bại' : item.status === 'WARNING' ? 'Cảnh báo' : 'Thành công'}</small></div><time>{item.createdAt ? showTime(item.createdAt) : 'Chưa ghi nhận'}</time></Link>)}</div></Panel>
      <Panel title="Danh mục và cấu hình" extra={<span>Dữ liệu quản trị</span>}><div className="ad-rows">{[{ label: 'Loại nông sản', detail: d ? `${d.activeCropTypes} / ${d.totalCropTypes} đang hoạt động` : 'Chưa có dữ liệu', icon: Sprout, tone: 'green', to: ROUTES.ADMIN_CROP_TYPES }, { label: 'Bộ tiêu chuẩn kiểm định', detail: data.standards == null ? 'Chưa có dữ liệu' : `${data.standards} bộ tiêu chuẩn`, icon: Layers3, tone: 'purple', to: ROUTES.ADMIN_INSPECTION_STANDARDS }, { label: 'Vị trí kho', detail: data.locations == null ? 'Chưa có dữ liệu' : `${data.locations} vị trí`, icon: Warehouse, tone: 'blue', to: ROUTES.ADMIN_WAREHOUSE_CAPACITY }].map(({ label, detail, icon: Icon, tone, to }) => <Link to={to} key={label} className="ad-task ad-catalog"><i className={`ad-icon ad-icon--${tone}`}><Icon /></i><div><strong>{label}</strong><small>{detail}</small></div><ArrowRight className="ad-arrow" /></Link>)}</div></Panel>
    </div>
  </div>
}
