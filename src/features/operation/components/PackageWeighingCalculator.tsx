import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { weighPackageGroups, type PackageWeightGroup } from '../receivingDetails'

const inputClass = 'mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'

export default function PackageWeighingCalculator({ count, note, disabled, onApply, onClose }: {
  count: string; note: string; disabled: boolean
  onApply: (weight: string, note: string) => void; onClose: () => void
}) {
  const [groups, setGroups] = useState<PackageWeightGroup[]>([{ count: '', weightInKg: '' }])
  const [error, setError] = useState('')
  const result = weighPackageGroups(groups, count)

  function change(index: number, key: keyof PackageWeightGroup, value: string) {
    setGroups(current => current.map((group, i) => i === index ? { ...group, [key]: value } : group))
    setError('')
  }
  function apply() {
    if (result.error) { setError(result.error); return }
    // Keep the weighing breakdown readable alongside other receiving observations.
    const existing = note.split('\n').filter(line => !line.startsWith('Chi tiết cân kiểm nhận:')).join('\n').trim()
    const combined = [existing, result.note].filter(Boolean).join('\n')
    if (combined.length > 1000) { setError('Ghi chú và chi tiết cân vượt 1.000 ký tự. Hãy gộp các nhóm cùng khối lượng hoặc rút gọn ghi chú.'); return }
    onApply(result.weight!, combined)
    onClose()
  }
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2" onKeyDown={event => { if (event.key === 'Enter') event.preventDefault() }}>
    <div className="flex items-start justify-between gap-3">
      <div><h3 className="text-sm font-bold text-slate-800">Cân theo kiện / nhóm kiện</h3><p className="mt-1 text-xs text-slate-500">Mỗi kiện một dòng, hoặc gộp các kiện cùng khối lượng. Tổng số kiện phải bằng {count || 'số kiện kiểm nhận'}.</p></div>
      <button type="button" onClick={onClose} disabled={disabled} aria-label="Đóng bảng cân" className="rounded-lg p-1 text-slate-500 hover:bg-slate-200"><X className="size-4" /></button>
    </div>
    <div className="mt-4 space-y-3">
      {groups.map((group, index) => <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
        <label className="text-xs font-semibold text-slate-700">Số kiện · nhóm {index + 1}<input aria-label={`Nhóm cân ${index + 1} - Số kiện`} type="number" min="1" step="1" inputMode="numeric" value={group.count} disabled={disabled} onChange={event => change(index, 'count', event.target.value)} className={inputClass} /></label>
        <label className="text-xs font-semibold text-slate-700">Kg mỗi kiện<input aria-label={`Nhóm cân ${index + 1} - Kg mỗi kiện`} type="number" min="0.001" step="0.001" inputMode="decimal" value={group.weightInKg} disabled={disabled} onChange={event => change(index, 'weightInKg', event.target.value)} className={inputClass} /></label>
        <button type="button" aria-label={`Xóa nhóm cân ${index + 1}`} disabled={disabled || groups.length === 1} onClick={() => { setGroups(current => current.filter((_, i) => i !== index)); setError('') }} className="flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-rose-600 disabled:opacity-40"><Trash2 className="size-4" /></button>
      </div>)}
    </div>
    <button type="button" disabled={disabled || groups.length >= 20} onClick={() => setGroups(current => [...current, { count: '', weightInKg: '' }])} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 disabled:opacity-40"><Plus className="size-4" />Thêm nhóm cân</button>
    {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
      <p className="text-sm text-slate-700">Tổng: <strong className="text-emerald-700">{result.weight ? `${Number(result.weight).toLocaleString('vi-VN', { maximumFractionDigits: 3 })} kg` : 'Chưa đủ dữ liệu hợp lệ'}</strong><span className="mt-1 block text-xs text-slate-500">Chi tiết cân được ghi vào ghi chú kiểm nhận khi áp dụng.</span></p>
      <button type="button" disabled={disabled} onClick={apply} className="h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50">Tính toán</button>
    </div>
  </div>
}
