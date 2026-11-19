import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/services/apiClient'
import { getAuthErrorMessage } from '@/services/authService'
import type { ApiResponse } from '@/types/api'

type Warehouse = { id: number; code: string; name: string; maxWeightKg: number | null; usedWeightKg: number }
type FormValues = { code: string; name: string; maxWeightKg: string }
const empty: FormValues = { code: '', name: '', maxWeightKg: '' }
const format = (v: number) => `${v.toLocaleString('vi-VN', { maximumFractionDigits: 3 })} kg`
const field = 'mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-emerald-600 focus:outline-none'

export default function WarehouseManagement({ onChange }: { onChange?: () => void }) {
  const [items, setItems] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Warehouse | 'new' | null>(null)
  const [values, setValues] = useState<FormValues>(empty)
  const [deleting, setDeleting] = useState<Warehouse | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const load = useCallback(async () => {
    try { setItems((await apiClient.get<ApiResponse<Warehouse[]>>('/warehouse-locations')).data.data); setError('') }
    catch (cause) { setError(getAuthErrorMessage(cause, 'Không thể tải danh sách kho.')) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  function edit(item: Warehouse | 'new') {
    setEditing(item); setDeleting(null); setError(''); setSuccess('')
    setValues(item === 'new' ? empty : { code: item.code, name: item.name, maxWeightKg: item.maxWeightKg == null ? '' : String(item.maxWeightKg) })
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSuccess('')
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
      setSuccess(editing === 'new' ? 'Đã tạo kho.' : 'Đã cập nhật kho.'); setEditing(null); await load(); onChange?.()
    } catch (cause) { setError(getAuthErrorMessage(cause, 'Không thể lưu kho.')) }
    finally { setBusy(false) }
  }
  async function remove() {
    if (!deleting) return
    setBusy(true); setError(''); setSuccess('')
    try { await apiClient.delete(`/warehouse-locations/${deleting.id}`); setDeleting(null); setSuccess('Đã xóa kho khỏi danh sách sử dụng.'); await load(); onChange?.() }
    catch (cause) { setError(getAuthErrorMessage(cause, 'Không thể xóa kho.')) }
    finally { setBusy(false) }
  }
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-bold text-slate-900">Quản lý kho</h2><p className="mt-1 text-sm text-slate-500">Mỗi kho có sức chứa riêng và có thể chọn khi lập phiếu nhập.</p></div>
      <button type="button" onClick={() => edit('new')} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">+ Tạo kho</button>
    </div>
    {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {success && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}
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
