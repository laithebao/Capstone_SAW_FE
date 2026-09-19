import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router'
import AppIcon from '@/components/common/AppIcon'
import { ROUTES } from '@/constants/routes'
import { exportAuditLogs, getAuditLogs } from '@/services/auditService'
import { getAuthErrorMessage } from '@/services/authService'
import type { AuditLogFilters, AuditLogItem, AuditStatus } from '@/types/audit'

const statusText = { SUCCESS: 'Thành công', FAILED: 'Thất bại', WARNING: 'Cảnh báo' }
const statusTone = { SUCCESS: 'bg-emerald-100 text-emerald-700', FAILED: 'bg-rose-100 text-rose-700', WARNING: 'bg-amber-100 text-amber-700' }
const dateTime = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value))
const code = (id: number) => `ALOG-${String(id).padStart(6, '0')}`

export default function AuditLogPage() {
  const changesMode = useLocation().pathname.endsWith('/changes')
  const [items, setItems] = useState<AuditLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [actionType, setActionType] = useState('')
  const [entityName, setEntityName] = useState('')
  const [actor, setActor] = useState('')
  const [status, setStatus] = useState<AuditStatus | ''>('')
  const [applied, setApplied] = useState<AuditLogFilters>({})
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pageSize = 10
  const filters = useMemo<AuditLogFilters>(() => ({ ...applied, changesOnly: changesMode, page, pageSize }), [applied, changesMode, page])

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { const data = await getAuditLogs(filters); setItems(data.items); setTotal(data.totalCount) }
    catch (requestError) { setError(getAuthErrorMessage(requestError, 'Không thể tải nhật ký hệ thống.')) }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer) }, [load])
  const pages = Math.max(1, Math.ceil(total / pageSize))
  function applyFilters() {
    setPage(1)
    setApplied({ search: search.trim(), from, to, actor: actor.trim(), actionType: actionType.trim(), entityName: entityName.trim(), status })
  }
  function reset() { setSearch(''); setFrom(''); setTo(''); setActionType(''); setEntityName(''); setActor(''); setStatus(''); setApplied({}); setPage(1) }
  async function download() {
    setExporting(true); setError(null)
    try { await exportAuditLogs(filters) }
    catch (requestError) { setError(getAuthErrorMessage(requestError, 'Không thể xuất nhật ký.')) }
    finally { setExporting(false) }
  }

  return <div className="mx-auto max-w-[1600px] space-y-5">
    <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Quản trị · Nhật ký hệ thống</p><h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">{changesMode ? 'Xem thay đổi dữ liệu' : 'Lịch sử hoạt động'}</h1><p className="mt-1 text-sm text-slate-500">{changesMode ? 'Đối chiếu dữ liệu trước và sau mỗi thay đổi.' : 'Theo dõi các hoạt động quan trọng đã diễn ra trong hệ thống.'}</p></div>
      <div className="flex gap-2"><button onClick={() => void load()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold"><AppIcon name="pending" className="size-4" />Làm mới</button><button onClick={() => void download()} disabled={exporting} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-800 px-4 text-sm font-semibold text-white disabled:opacity-60"><AppIcon name="download" className="size-4" />{exporting ? 'Đang xuất...' : 'Xuất nhật ký'}</button></div>
    </header>
    <nav className="flex gap-2 border-b border-slate-200"><Link onClick={() => setPage(1)} className={`px-4 py-3 text-sm font-semibold ${!changesMode ? 'border-b-2 border-emerald-700 text-emerald-700' : 'text-slate-500'}`} to={ROUTES.ADMIN_AUDIT_LOGS}>Lịch sử hoạt động</Link><Link onClick={() => setPage(1)} className={`px-4 py-3 text-sm font-semibold ${changesMode ? 'border-b-2 border-emerald-700 text-emerald-700' : 'text-slate-500'}`} to={ROUTES.ADMIN_AUDIT_CHANGES}>Thay đổi dữ liệu</Link></nav>
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-bold">Bộ lọc dữ liệu</h2><button onClick={reset} className="text-xs font-semibold text-slate-500 hover:text-emerald-700">Đặt lại</button></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') applyFilters() }} placeholder="Mã, nội dung mô tả..." className="h-10 rounded-lg border border-slate-200 px-3 text-sm" /><input aria-label="Từ ngày" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm" /><input aria-label="Đến ngày" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm" /><input value={actor} onChange={(e) => setActor(e.target.value)} placeholder="Người thực hiện" className="h-10 rounded-lg border border-slate-200 px-3 text-sm" /><input value={actionType} onChange={(e) => setActionType(e.target.value)} placeholder="Loại hành động" className="h-10 rounded-lg border border-slate-200 px-3 text-sm" /><select aria-label="Module" value={entityName} onChange={(e) => setEntityName(e.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm"><option value="">Tất cả module</option><optgroup label="Tiêu chuẩn kiểm định"><option value="INSPECTION_STANDARD_SET">Bộ tiêu chuẩn (UC12)</option><option value="INSPECTION_STANDARD_VERSION">Phiên bản tiêu chuẩn (UC13)</option><option value="INSPECTION_STANDARD_VERSIONS">INSPECTION_STANDARD_VERSIONS</option><option value="INSPECTION_CRITERIA">Tiêu chí kiểm định</option><option value="CRITERION_GRADE_RULES">Quy tắc đánh giá</option></optgroup><optgroup label="Module khác"><option value="ACCOUNTS">Tài khoản</option><option value="PRODUCT_BATCHES">Lô hàng</option><option value="PURCHASE_ORDERS">Đơn hàng</option><option value="GOODS_RECEIPTS">Nhập kho</option><option value="GOODS_ISSUES">Xuất kho</option></optgroup></select><select aria-label="Trạng thái" value={status} onChange={(e) => setStatus(e.target.value as AuditStatus | '')} className="h-10 rounded-lg border border-slate-200 px-3 text-sm"><option value="">Tất cả trạng thái</option><option value="SUCCESS">Thành công</option><option value="FAILED">Thất bại</option><option value="WARNING">Cảnh báo</option></select><button onClick={applyFilters} className="h-10 rounded-lg bg-slate-800 px-4 text-sm font-semibold text-white hover:bg-slate-700">Áp dụng bộ lọc</button></div>
    </section>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 className="font-bold">{changesMode ? 'Danh sách bản ghi thay đổi' : 'Bản xem trước dữ liệu'} <span className="text-slate-400">({total})</span></h2><span className="text-xs text-slate-500">Trang {page}/{pages}</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Mã nhật ký</th><th className="px-5 py-3">Thời gian</th><th className="px-5 py-3">Người thực hiện</th><th className="px-5 py-3">Hành động</th><th className="px-5 py-3">Module</th><th className="px-5 py-3">Trạng thái</th><th className="px-5 py-3 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">Đang tải dữ liệu...</td></tr> : items.length === 0 ? <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">Chưa có nhật ký phù hợp.</td></tr> : items.map((item) => <tr key={item.id} className="hover:bg-slate-50"><td className="px-5 py-4 font-mono text-xs text-emerald-700">{code(item.id)}</td><td className="px-5 py-4 text-xs text-slate-500">{dateTime(item.createdAt)}</td><td className="px-5 py-4"><p className="font-semibold">{item.actorName}</p><p className="text-xs text-slate-500">{item.actorRole ?? 'Hệ thống'}</p></td><td className="px-5 py-4"><p>{item.actionType}</p>{item.description && <p className="max-w-xs truncate text-xs text-slate-500">{item.description}</p>}</td><td className="px-5 py-4"><span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium">{item.entityName}</span>{item.entityId && <p className="mt-1 text-xs text-slate-500">{item.entityId}</p>}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusTone[item.status]}`}>{statusText[item.status]}</span></td><td className="px-5 py-4 text-right"><Link to={ROUTES.ADMIN_AUDIT_DETAIL.replace(':id', String(item.id))} className="text-xs font-semibold text-emerald-700">Xem chi tiết</Link></td></tr>)}</tbody></table></div>
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4"><span className="text-xs text-slate-500">Hiển thị {items.length} trong {total} kết quả</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded border px-3 py-1.5 text-xs disabled:opacity-40">Trước</button><button disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="rounded border px-3 py-1.5 text-xs disabled:opacity-40">Sau</button></div></div>
    </section>
  </div>
}
