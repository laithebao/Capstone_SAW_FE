import { useEffect, useMemo, useState, type ReactNode } from 'react'
import AppIcon from '@/components/common/AppIcon'
import { getAdminDashboard, type AdminDashboardData } from '@/services/adminDashboardService'

type Tone = 'green' | 'orange' | 'blue' | 'red'
const tones: Record<Tone, string> = { green: 'bg-emerald-50 text-emerald-700', orange: 'bg-orange-50 text-orange-600', blue: 'bg-sky-50 text-sky-700', red: 'bg-red-50 text-red-600' }
const badgeTones: Record<Tone, string> = { green: 'bg-emerald-50 text-emerald-700', orange: 'bg-orange-50 text-orange-600', blue: 'bg-slate-100 text-slate-600', red: 'bg-red-50 text-red-600' }
const colors = ['#087f5b', '#6366f1', '#14b8a6', '#f59e0b', '#ec4899']
const weekday = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white shadow-sm"><header className="flex items-center justify-between px-5 pt-5"><h2 className="text-sm font-bold">{title}</h2>{action}</header>{children}</section>
}

function ActivityChart({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(...values, 1), divisor = Math.max(values.length - 1, 1)
  const points = values.map((value, index) => `${index * (100 / divisor)},${100 - Math.max(4, value / max * 90)}`).join(' ')
  return <div className="px-5 pb-5 pt-6"><div className="relative h-52 sm:h-64"><div className="absolute inset-0 flex flex-col justify-between">{[100, 75, 50, 25, 0].map(value => <div key={value} className="border-t border-dashed border-slate-200"><span className="-translate-y-2.5 bg-white pr-2 text-[10px] text-slate-400">{Math.round(max * value / 100)}</span></div>)}</div><svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Biểu đồ hoạt động 7 ngày"><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#10b981" stopOpacity=".22" /><stop offset="1" stopColor="#10b981" stopOpacity="0" /></linearGradient></defs><polygon points={`0,100 ${points} 100,100`} fill="url(#chartFill)" /><polyline points={points} fill="none" stroke="#059669" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg></div><div className="mt-3 grid grid-cols-7 text-center text-[11px] font-medium text-slate-500">{labels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</div></div>
}

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const loadDashboard = async () => {
    setLoading(true); setError('')
    try { setDashboard(await getAdminDashboard()) }
    catch { setError('Không thể tải dữ liệu Dashboard. Hãy kiểm tra Backend và quyền Quản trị viên.') }
    finally { setLoading(false) }
  }
  useEffect(() => {
    void getAdminDashboard()
      .then(setDashboard)
      .catch(() => setError('Không thể tải dữ liệu Dashboard. Hãy kiểm tra Backend và quyền Quản trị viên.'))
      .finally(() => setLoading(false))
  }, [])

  const view = useMemo(() => {
    if (!dashboard) return null
    const values = dashboard.weeklyActivity.map(item => item.accountCount + item.batchCount)
    const labels = dashboard.weeklyActivity.map(item => weekday[new Date(item.date).getDay()] ?? '')
    const total = dashboard.roleDistribution.reduce((sum, item) => sum + item.value, 0)
    const distribution = dashboard.roleDistribution.map((item, index, items) => {
      const percent = total ? Math.round(item.value / total * 100) : 0
      const start = items.slice(0, index).reduce((sum, previous) => sum + (total ? Math.round(previous.value / total * 100) : 0), 0)
      return { ...item, percent, start, end: start + percent, color: colors[index % colors.length] }
    })
    return { values, labels, distribution, gradient: distribution.length ? `conic-gradient(${distribution.map(item => `${item.color} ${item.start}% ${item.end}%`).join(',')})` : '#e2e8f0' }
  }, [dashboard])

  const stats = dashboard ? [
    { label: 'Tổng tài khoản', value: dashboard.totalAccounts, note: `${dashboard.activeAccounts} đang hoạt động`, icon: 'users' as const, tone: 'green' as Tone },
    { label: 'Tài khoản chờ duyệt', value: dashboard.pendingAccounts, note: 'Cần xử lý', icon: 'pending' as const, tone: 'orange' as Tone },
    { label: 'Loại nông sản', value: dashboard.totalCropTypes, note: `${dashboard.activeCropTypes} đang hoạt động`, icon: 'database' as const, tone: 'blue' as Tone },
    { label: 'Lô hàng chờ xử lý', value: dashboard.pendingBatches, note: `${dashboard.totalBatches} tổng lô`, icon: 'alert' as const, tone: 'red' as Tone },
  ] : []
  const tasks = dashboard ? [
    { title: 'Duyệt tài khoản chờ kích hoạt', description: `${dashboard.pendingAccounts} tài khoản đang ở trạng thái chờ duyệt.`, badge: 'Cần xử lý', tone: 'orange' as Tone, icon: 'users' as const },
    { title: 'Kiểm tra lô hàng chờ xử lý', description: `${dashboard.pendingBatches} lô hàng đang chờ xử lý trong kho.`, badge: 'Theo dõi', tone: 'red' as Tone, icon: 'clipboard' as const },
    { title: 'Cập nhật đối tác hệ thống', description: `${dashboard.totalSuppliers} nhà cung cấp, ${dashboard.totalDistributors} nhà phân phối.`, badge: 'Thông tin', tone: 'blue' as Tone, icon: 'shield' as const },
  ] : []

  return <div className="mx-auto max-w-[1600px] space-y-5">
    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end"><div><p className="text-sm font-medium text-emerald-700">Tổng quan hệ thống</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Bảng điều khiển</h1><p className="mt-1 text-sm text-slate-500">Theo dõi dữ liệu vận hành được tổng hợp trực tiếp từ hệ thống.</p></div><button onClick={() => void loadDashboard()} className="inline-flex h-10 items-center gap-2 self-start rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 xl:self-auto"><AppIcon name="pending" className="size-4" />Làm mới</button></div>
    {error && <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button onClick={() => void loadDashboard()} className="font-semibold underline">Thử lại</button></div>}
    {loading && !dashboard && <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Đang tải dữ liệu Dashboard…</div>}
    {dashboard && view && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(stat => <article key={stat.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><span className={`grid size-10 place-items-center rounded-lg ${tones[stat.tone]}`}><AppIcon name={stat.icon} className="size-5" /></span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${badgeTones[stat.tone]}`}>{stat.note}</span></div><p className="mt-4 text-[11px] font-bold uppercase text-slate-500">{stat.label}</p><p className={`mt-1 text-3xl font-bold ${stat.tone === 'red' ? 'text-red-600' : 'text-slate-950'}`}>{stat.value.toLocaleString('vi-VN')}</p></article>)}</div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]"><Panel title="Hoạt động phát sinh (7 ngày)" action={<span className="text-xs text-slate-500">Tài khoản & lô hàng mới</span>}><ActivityChart values={view.values} labels={view.labels} /></Panel><Panel title="Phân bổ người dùng"><div className="flex min-h-72 flex-col items-center justify-center p-5"><div className="relative size-36 rounded-full" style={{ background: view.gradient }}><div className="absolute inset-4 grid place-items-center rounded-full bg-white text-center"><span><b className="block text-2xl">{dashboard.totalAccounts}</b><small className="text-slate-500">Tài khoản</small></span></div></div><div className="mt-6 w-full space-y-3">{view.distribution.length ? view.distribution.map(item => <div key={item.label} className="flex items-center text-xs"><span className="mr-2 size-2.5 rounded-full" style={{ background: item.color }} /><span className="text-slate-600">{item.label}</span><b className="ml-auto">{item.percent}%</b></div>) : <p className="text-center text-xs text-slate-500">Chưa có dữ liệu vai trò.</p>}</div></div></Panel></div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)]"><Panel title="Công việc cần xử lý"><div className="divide-y divide-slate-100 px-5 py-2">{tasks.map(task => <div key={task.title} className="flex items-center gap-3 py-4"><span className={`grid size-10 shrink-0 place-items-center rounded-lg ${tones[task.tone]}`}><AppIcon name={task.icon} className="size-5" /></span><div className="min-w-0"><h3 className="truncate text-sm font-semibold">{task.title}</h3><p className="truncate text-xs text-slate-500">{task.description}</p></div><span className={`ml-auto hidden rounded-full px-2.5 py-1 text-[10px] font-bold sm:block ${badgeTones[task.tone]}`}>{task.badge}</span></div>)}</div></Panel><Panel title="Tình trạng hệ thống"><div className="space-y-4 px-5 py-5 text-sm"><div className="flex justify-between"><span className="text-slate-500">Tài khoản hoạt động</span><b>{dashboard.activeAccounts}/{dashboard.totalAccounts}</b></div><div className="flex justify-between"><span className="text-slate-500">Loại nông sản hoạt động</span><b>{dashboard.activeCropTypes}/{dashboard.totalCropTypes}</b></div><div className="flex justify-between"><span className="text-slate-500">Nhà cung cấp</span><b>{dashboard.totalSuppliers}</b></div><div className="flex justify-between"><span className="text-slate-500">Nhà phân phối</span><b>{dashboard.totalDistributors}</b></div></div></Panel></div>
    </>}
  </div>
}
