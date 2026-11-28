import FormNotification from '@/components/common/FormNotification'
import { AnimatedNumber } from '@/components/common/AnimatedNumber'
import { useCallback, useEffect, useRef, useState } from 'react'
import { apiClient } from '@/services/apiClient'
import { getAuthErrorMessage } from '@/services/authService'
import type { ApiResponse } from '@/types/api'
import type { WarehouseCapacityChart } from '@/types/inventory'
import AppIcon from '@/components/common/AppIcon'
import './warehouse-capacity.css'

type Warehouse = { id: number; code: string; name: string; maxWeightKg: number | null; usedWeightKg: number }
type FormValues = { code: string; name: string; maxWeightKg: string }
const empty: FormValues = { code: '', name: '', maxWeightKg: '' }
const format = (v: number) => `${v.toLocaleString('vi-VN', { maximumFractionDigits: 3 })} kg`
const field = 'mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-emerald-600 focus:outline-none'

export default function WarehouseManagement({ onChange, variant = 'admin', capacity, capacityLoading, capacityError }: { onChange?: () => void; variant?: 'admin' | 'manager'; capacity?: WarehouseCapacityChart | null; capacityLoading?: boolean; capacityError?: string }) {
  const [items, setItems] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Warehouse | 'new' | null>(null)
  const [values, setValues] = useState<FormValues>(empty)
  const [deleting, setDeleting] = useState<Warehouse | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [adminActionError, setAdminActionError] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [menuId, setMenuId] = useState<number | null>(null)
  const [closing, setClosing] = useState(false)
  const [menuClosing, setMenuClosing] = useState(false)
  const menuTimer = useRef<number | undefined>(undefined)
  const closeTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => { window.clearTimeout(closeTimer.current); window.clearTimeout(menuTimer.current) }, [])
  function closeManagerMenu() {
    window.clearTimeout(menuTimer.current)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setMenuId(null); setMenuClosing(false); return }
    setMenuClosing(true)
    menuTimer.current = window.setTimeout(() => { setMenuId(null); setMenuClosing(false) }, 160)
  }
  function toggleManagerMenu(id: number) {
    if (menuId === id && !menuClosing) { closeManagerMenu(); return }
    window.clearTimeout(menuTimer.current); setMenuClosing(false); setMenuId(id)
  }
  function closeManagerDialog(which: 'edit' | 'delete') {
    window.clearTimeout(closeTimer.current)
    setError('')
    const finish = () => { if (which === 'edit') setEditing(null); else setDeleting(null); setClosing(false) }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return }
    setClosing(true)
    closeTimer.current = window.setTimeout(finish, 170)
  }
  const load = useCallback(async () => {
    try { setItems((await apiClient.get<ApiResponse<Warehouse[]>>('/warehouse-locations')).data.data); setError('') }
    catch (cause) { setError(getAuthErrorMessage(cause, 'Không thể tải danh sách kho.')) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  function edit(item: Warehouse | 'new') {
    setEditing(item); setDeleting(null); if (variant === 'manager' && menuId !== null) closeManagerMenu(); else setMenuId(null); setError(''); setSuccess('')
    setValues(item === 'new' ? empty : { code: item.code, name: item.name, maxWeightKg: item.maxWeightKg == null ? '' : String(item.maxWeightKg) })
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSuccess(''); setAdminActionError('')
    if (!values.code.trim() || !values.name.trim() || !/^\d+(\.\d{1,3})?$/.test(values.maxWeightKg) || Number(values.maxWeightKg) <= 0) {
      setError('Nhập mã kho, tên kho và sức chứa là số dương với tối đa 3 chữ số thập phân.'); return
    }
    if (editing && editing !== 'new' && Number(values.maxWeightKg) < editing.usedWeightKg) {
      setError('Sức chứa không thể nhỏ hơn lượng hàng đang lưu trong kho.'); return
    }
    setBusy(true)
    try {
      const payload = { code: values.code.trim(), name: values.name.trim(), maxWeightKg: Number(values.maxWeightKg) }
      if (editing === 'new') await apiClient.post('/warehouse-locations', payload)
      else if (editing) await apiClient.put(`/warehouse-locations/${editing.id}`, payload)
      setSuccess(editing === 'new' ? 'Đã tạo kho.' : 'Đã cập nhật kho.'); if (variant === 'manager') closeManagerDialog('edit'); else setEditing(null); await load(); onChange?.()
    } catch (cause) { const message = getAuthErrorMessage(cause, 'Không thể lưu kho.'); if (variant === 'admin') setAdminActionError(message); else setError(message) }
    finally { setBusy(false) }
  }
  async function remove() {
    if (!deleting) return
    setBusy(true); setError(''); setSuccess(''); setAdminActionError('')
    try { await apiClient.delete(`/warehouse-locations/${deleting.id}`); if (variant === 'manager') closeManagerDialog('delete'); else setDeleting(null); setSuccess('Đã xóa kho khỏi danh sách sử dụng.'); await load(); onChange?.() }
    catch (cause) { const message = getAuthErrorMessage(cause, 'Không thể xóa kho.'); if (variant === 'admin') setAdminActionError(message); else setError(message) }
    finally { setBusy(false) }
  }
  if (variant === 'manager') {
    const stateOf = (item: Warehouse) => item.maxWeightKg == null || item.maxWeightKg <= 0 ? 'unset' : item.usedWeightKg > item.maxWeightKg ? 'over' : item.usedWeightKg >= item.maxWeightKg ? 'full' : item.usedWeightKg / item.maxWeightKg >= 0.9 ? 'near' : 'available'
    const labels: Record<string, string> = { unset: 'Chưa thiết lập', over: 'Quá tải', full: 'Đã đầy', near: 'Gần đầy', available: 'Còn chỗ' }
    const visible = items.filter(item => `${item.code} ${item.name}`.toLocaleLowerCase('vi-VN').includes(query.trim().toLocaleLowerCase('vi-VN')) && (statusFilter === 'all' || stateOf(item) === statusFilter))
    const metrics = [
      { label: 'Tổng sức chứa', value: capacity ? format(capacity.configuredCapacityKg) : '—', note: 'Sức chứa đã thiết lập', icon: 'dashboard', tone: 'primary' },
      { label: 'Đang lưu kho', value: capacity ? format(capacity.usedWeightKg) : '—', note: 'Khối lượng hiện tại', icon: 'database', tone: 'green' },
      { label: 'Còn trống', value: capacity ? format(capacity.availableWeightKg) : '—', note: 'Sức chứa còn khả dụng', icon: 'package', tone: 'blue' },
      { label: 'Tỷ lệ sử dụng', value: capacity ? `${capacity.utilizationPercent.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%` : '—', note: capacity ? `${capacity.nearCapacityCount + capacity.overcrowdedCount} vị trí cần chú ý` : 'Chưa có dữ liệu', icon: 'clipboard', tone: 'purple' },
    ] as const
    return <section className="saw-capacity">
      <header className="cap-header"><div><p>Quản lý kho / Sức chứa kho</p><h1>Sức chứa kho</h1><span>Theo dõi sức chứa và quản lý các kho lưu trữ.</span></div><button type="button" className="cap-primary" onClick={() => edit('new')}>+ Thêm kho</button></header>
      <div className="cap-stats" aria-label="Thống kê sức chứa">{metrics.map(metric => <article key={metric.label} className={`cap-stat cap-stat--${metric.tone}`}><div className="cap-stat-top"><span>{metric.label}</span><i><AppIcon name={metric.icon} /></i></div><strong><AnimatedNumber value={metric.value} /></strong><small>{metric.note}</small></article>)}</div>
      {capacityError && <div role="alert" className="cap-message cap-message--error">{capacityError} <button type="button" onClick={onChange}>Thử lại</button></div>}
      {capacityLoading && !capacity && <p role="status" className="cap-loading">Đang tải thống kê sức chứa…</p>}
      {!editing && !deleting && error && <p role="alert" className="cap-message cap-message--error">{error}</p>}
      <FormNotification warehouse message={success} tone="success" onDismiss={() => setSuccess('')} />
      <div className="cap-panel"><div className="cap-panel-header"><div><h2>Danh sách kho</h2><p>Theo dõi sức chứa và mức sử dụng của từng kho.</p></div><span>{items.length} kho</span></div>
        <div className="cap-filters"><label><span className="sr-only">Tìm kho</span><AppIcon name="search" /><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm mã kho, tên kho..." /></label><label><span className="sr-only">Lọc trạng thái</span><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">Tất cả trạng thái</option><option value="available">Còn chỗ</option><option value="near">Gần đầy</option><option value="full">Đã đầy</option><option value="over">Quá tải</option><option value="unset">Chưa thiết lập</option></select></label><button type="button" className="cap-secondary" onClick={() => {setQuery(''); setStatusFilter('all')}}>Đặt lại</button></div>
        {loading ? <p className="cap-empty">Đang tải danh sách kho…</p> : visible.length === 0 ? <p className="cap-empty">{items.length ? 'Không tìm thấy kho phù hợp.' : 'Chưa có kho đang hoạt động.'}</p> : <div className="cap-table-wrap"><table className="cap-table"><thead><tr><th>Kho lưu trữ</th><th>Sức chứa</th><th>Đang lưu</th><th>Còn trống</th><th>Mức sử dụng</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{visible.map(item => { const state = stateOf(item); const pct = item.maxWeightKg && item.maxWeightKg > 0 ? item.usedWeightKg / item.maxWeightKg * 100 : null; return <tr key={item.id}><td data-label="Kho"><strong>{item.code}</strong><small>{item.name}</small></td><td data-label="Sức chứa">{item.maxWeightKg == null ? 'Chưa thiết lập' : format(item.maxWeightKg)}</td><td data-label="Đang lưu">{format(item.usedWeightKg)}</td><td data-label="Còn trống">{item.maxWeightKg == null ? '—' : format(Math.max(0, item.maxWeightKg - item.usedWeightKg))}</td><td data-label="Mức sử dụng"><div className="cap-usage"><strong>{pct == null ? '—' : `${pct.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`}</strong><div className="cap-bar" role="progressbar" aria-label={`Mức sử dụng ${item.code}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct == null ? undefined : Math.min(100, pct)} aria-valuetext={pct == null ? 'Chưa thiết lập' : `${pct.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`}><span className={`cap-bar--${state}`} style={{width: `${Math.min(100, Math.max(0, pct ?? 0))}%`}} /></div></div></td><td data-label="Trạng thái"><span className={`cap-badge cap-badge--${state}`}>{labels[state]}</span></td><td className="cap-actions"><button type="button" className="cap-menu-button" aria-label={`Thao tác ${item.code}`} aria-expanded={menuId === item.id} onClick={() => toggleManagerMenu(item.id)}>⋯</button>{menuId === item.id && <div className={`cap-menu${menuClosing ? " is-closing" : ""}`}><button type="button" onClick={() => edit(item)}>Chỉnh sửa</button><button type="button" className="cap-danger-text" onClick={() => {closeManagerMenu(); setDeleting(item); setEditing(null); setError(''); setSuccess('')}}>Xóa</button></div>}</td></tr>})}</tbody></table></div>}
        <div className="cap-footer">Hiển thị {visible.length} / {items.length} kho</div>
      </div>
      {editing && <div className={`cap-overlay${closing ? " is-closing" : ""}`} onMouseDown={e => {if (e.target === e.currentTarget && !busy && !closing) closeManagerDialog('edit')}}><form role="dialog" aria-modal="true" aria-labelledby="cap-form-title" onSubmit={save} className="cap-modal"><div className="cap-modal-heading"><div><h2 id="cap-form-title">{editing === 'new' ? 'Thêm kho mới' : 'Chỉnh sửa kho'}</h2><p>Nhập thông tin và sức chứa của kho.</p></div><button type="button" aria-label="Đóng" disabled={busy} onClick={() => closeManagerDialog('edit')}>×</button></div>{error && <p role="alert" className="cap-message cap-message--error">{error}</p>}<div className="cap-form-fields"><label>Mã kho <span>*</span><input required maxLength={50} value={values.code} onChange={e => setValues({...values,code:e.target.value})} /></label><label>Tên kho <span>*</span><input required maxLength={100} value={values.name} onChange={e => setValues({...values,name:e.target.value})} /></label><label>Sức chứa (kg) <span>*</span><input required type="number" min="0.001" step="0.001" value={values.maxWeightKg} onChange={e => setValues({...values,maxWeightKg:e.target.value})} /></label></div><div className="cap-modal-actions"><button type="button" disabled={busy} className="cap-secondary" onClick={() => closeManagerDialog('edit')}>Hủy</button><button disabled={busy} className="cap-primary">{busy ? 'Đang lưu…' : editing === 'new' ? 'Thêm kho' : 'Lưu thay đổi'}</button></div></form></div>}
      {deleting && <div className={`cap-overlay${closing ? " is-closing" : ""}`} onMouseDown={e => {if (e.target === e.currentTarget && !busy && !closing) closeManagerDialog('delete')}}><div role="alertdialog" aria-modal="true" aria-labelledby="cap-delete-title" className="cap-modal"><div className="cap-modal-heading"><div><h2 id="cap-delete-title">Xóa kho lưu trữ?</h2><p>Bạn muốn xóa <strong>{deleting.code} · {deleting.name}</strong> khỏi danh sách sử dụng?</p></div><button type="button" aria-label="Đóng" disabled={busy} onClick={() => closeManagerDialog('delete')}>×</button></div><p className="cap-delete-note">Lịch sử vẫn được giữ lại. Kho còn hàng hoặc có phiếu nhập nháp không thể xóa.</p>{error && <p role="alert" className="cap-message cap-message--error">{error}</p>}<div className="cap-modal-actions"><button type="button" disabled={busy} className="cap-secondary" onClick={() => closeManagerDialog('delete')}>Hủy</button><button type="button" disabled={busy} className="cap-danger" onClick={() => void remove()}>{busy ? 'Đang xóa…' : 'Xác nhận xóa'}</button></div></div></div>}
    </section>
  }
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-bold text-slate-900">Quản lý kho</h2><p className="mt-1 text-sm text-slate-500">Mỗi kho có sức chứa riêng và có thể chọn khi lập phiếu nhập.</p></div>
      <button type="button" onClick={() => edit('new')} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">+ Tạo kho</button>
    </div>
    {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <FormNotification warehouse message={adminActionError || success} tone={adminActionError ? "error" : "success"} onDismiss={() => { setAdminActionError(""); setSuccess("") }} />
    {editing && <form onSubmit={save} className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
      <h3 className="font-semibold">{editing === 'new' ? 'Tạo kho mới' : `Chỉnh sửa ${editing.code}`}</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label className="text-sm font-medium">Mã kho <input className={field} required maxLength={50} value={values.code} onChange={e => setValues({ ...values, code: e.target.value })} /></label>
        <label className="text-sm font-medium">Tên kho <input className={field} required maxLength={100} value={values.name} onChange={e => setValues({ ...values, name: e.target.value })} /></label>
        <label className="text-sm font-medium">Sức chứa (kg) <input className={field} required type="number" min="0.001" step="0.001" value={values.maxWeightKg} onChange={e => setValues({ ...values, maxWeightKg: e.target.value })} /></label>
      </div>
      <div className="mt-4 flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => { setEditing(null); setError('') }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Hủy</button><button disabled={busy} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Đang lưu…' : 'Lưu kho'}</button></div>
    </form>}
    {deleting && <div role="alertdialog" aria-label="Xác nhận xóa kho" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm"><p>Bạn muốn xóa <strong>{deleting.code} · {deleting.name}</strong> khỏi danh sách sử dụng? Lịch sử vẫn được giữ lại. Kho còn hàng hoặc có phiếu nhập nháp không thể xóa.</p><div className="mt-3 flex gap-2"><button type="button" disabled={busy} onClick={() => setDeleting(null)} className="rounded-lg border border-slate-300 bg-white px-3 py-2">Hủy</button><button type="button" disabled={busy} onClick={() => void remove()} className="rounded-lg bg-rose-700 px-3 py-2 font-semibold text-white">{busy ? 'Đang xóa…' : 'Xác nhận xóa'}</button></div></div>}
    {loading ? <p className="mt-5 text-sm text-slate-500">Đang tải danh sách kho…</p> : items.length === 0 ? <p className="mt-5 text-sm text-slate-500">Chưa có kho đang hoạt động.</p> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr><th className="pb-3">Kho</th><th className="pb-3">Đang lưu</th><th className="pb-3">Sức chứa</th><th className="pb-3">Còn trống</th><th className="pb-3 text-right">Thao tác</th></tr></thead><tbody>{items.map(item => <tr key={item.id} className="border-b border-slate-100 last:border-0"><td className="py-3"><strong>{item.code}</strong><p className="text-xs text-slate-500">{item.name}</p></td><td>{format(item.usedWeightKg)}</td><td>{item.maxWeightKg == null ? 'Chưa thiết lập' : format(item.maxWeightKg)}</td><td>{item.maxWeightKg == null ? '—' : format(Math.max(0, item.maxWeightKg - item.usedWeightKg))}</td><td className="space-x-3 text-right"><button type="button" onClick={() => edit(item)} className="font-semibold text-emerald-700">Sửa</button><button type="button" onClick={() => { setDeleting(item); setEditing(null); setError(''); setSuccess('') }} className="font-semibold text-rose-700">Xóa</button></td></tr>)}</tbody></table></div>}
  </section>
}
