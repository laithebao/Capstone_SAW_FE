import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/services/apiClient'
import { getAuthErrorMessage } from '@/services/authService'
import type { ApiResponse } from '@/types/api'

export type Capacity = { maxCapacityKg: number | null; currentStoredWeightKg: number }
const formatKg = (value: number) => `${value.toLocaleString('vi-VN', { maximumFractionDigits: 3 })} kg`

export default function WarehouseCapacitySettings({ onChange }: { onChange?: (capacity: Capacity) => void }) {
  const [data, setData] = useState<Capacity | null>(null)
  const [value, setValue] = useState('')
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const load = useCallback(async () => {
    try {
      const result = (await apiClient.get<ApiResponse<Capacity>>('/warehouse-settings/capacity')).data.data
      setData(result); setValue(result.maxCapacityKg == null ? '' : String(result.maxCapacityKg)); setError(''); onChange?.(result)
    } catch (cause) { setError(getAuthErrorMessage(cause, 'Không thể tải sức chứa kho.')) }
  }, [onChange])
  useEffect(() => { void load() }, [load])
  async function save(event: React.FormEvent) {
    event.preventDefault()
    const amount = Number(value)
    if (!value || !Number.isFinite(amount) || amount <= 0 || !/^\d+(\.\d{1,3})?$/.test(value)) { setError('Nhập số dương với tối đa 3 chữ số thập phân.'); return }
    if (data && amount < data.currentStoredWeightKg) { setError('Sức chứa mới không thể nhỏ hơn khối lượng tồn kho hiện tại.'); return }
    setBusy(true); setError(''); setSuccess('')
    try {
      const result = (await apiClient.put<ApiResponse<Capacity>>('/warehouse-settings/capacity', { maxCapacityKg: amount })).data.data
      setData(result); setValue(String(result.maxCapacityKg)); setEditing(false); setSuccess('Đã cập nhật sức chứa kho.'); onChange?.(result)
    } catch (cause) { setError(getAuthErrorMessage(cause, 'Không thể cập nhật sức chứa kho. Vui lòng thử lại.')) }
    finally { setBusy(false) }
  }
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-bold text-slate-900">Giới hạn sức chứa toàn kho</h2><p className="mt-1 text-sm text-slate-500">Giới hạn khối lượng lưu trữ của toàn kho, tách biệt với giới hạn từng vị trí.</p></div>
      {data && !editing && <button type="button" onClick={() => { setEditing(true); setSuccess(''); setError('') }} className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700">Chỉnh sửa</button>}
    </div>
    {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {success && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}
    {!data && !error && <p className="mt-4 text-sm text-slate-500">Đang tải sức chứa…</p>}
    {data && <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
      <div><p className="text-slate-500">Đang lưu kho</p><p className="mt-1 font-semibold">{formatKg(data.currentStoredWeightKg)}</p></div>
      <div><p className="text-slate-500">Sức chứa tối đa</p><p className="mt-1 font-semibold">{data.maxCapacityKg == null ? 'Chưa thiết lập' : formatKg(data.maxCapacityKg)}</p></div>
      <div><p className="text-slate-500">Còn trống</p><p className="mt-1 font-semibold">{data.maxCapacityKg == null ? 'Chưa xác định' : formatKg(Math.max(0, data.maxCapacityKg - data.currentStoredWeightKg))}</p></div>
    </div>}
    {editing && <form onSubmit={save} className="mt-5 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
      <label className="block flex-1 text-sm font-medium">Sức chứa tối đa (kg)<input required type="number" min="0.001" step="0.001" value={value} onChange={e => setValue(e.target.value)} disabled={busy} className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
      <button type="button" disabled={busy} onClick={() => { setEditing(false); setError(''); setValue(data?.maxCapacityKg == null ? '' : String(data.maxCapacityKg)) }} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm">Hủy</button>
      <button disabled={busy} className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
    </form>}
    {!data && error && <button type="button" className="mt-3 text-sm font-semibold text-emerald-700 underline" onClick={() => void load()}>Thử lại</button>}
  </section>
}
