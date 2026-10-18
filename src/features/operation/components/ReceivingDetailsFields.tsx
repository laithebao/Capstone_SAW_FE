import { useState } from 'react'
import { Calculator } from 'lucide-react'
import { calculatedReceivingWeight, changeReceivingDetails, receivingUnit, type ReceivingDetailsFormValue } from '@/features/operation/receivingDetails'
import PackageWeighingCalculator from './PackageWeighingCalculator'

const inputClass = 'mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50'
const number = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value)

function Difference({ declared, verified, unit }: { declared: number; verified: string; unit: string }) {
  const parsed = Number(verified)
  const difference = verified.trim() && Number.isFinite(parsed) ? parsed - declared : null
  return <p className="mt-1 text-xs text-slate-500">Chênh lệch: <span className={`font-semibold ${difference === null ? '' : difference < 0 ? 'text-amber-700' : difference > 0 ? 'text-blue-700' : 'text-emerald-700'}`}>{difference === null ? '—' : `${difference > 0 ? '+' : ''}${number(difference)} ${unit}`}</span></p>
}

export default function ReceivingDetailsFields({ value, onChange, unit, declaredQuantity, declaredWeight, disabled }:
  { value: ReceivingDetailsFormValue; onChange: (next: ReceivingDetailsFormValue) => void; unit: string; declaredQuantity: number; declaredWeight: number; disabled: boolean }) {
  const mode = receivingUnit(unit), packaged = mode === 'Bao' || mode === 'Thùng'
  const [weighingOpen, setWeighingOpen] = useState(false)
  const showPackaging = !mode || packaged || !!(value.verifiedPackagingType || value.verifiedPackageCount || value.verifiedPackageUnitWeightKg)
  const expectedWeight = calculatedReceivingWeight(value, unit)
  const needsReview = mode && !packaged && expectedWeight && Number(value.verifiedWeightInKg) !== Number(expectedWeight)
  function set(key: keyof ReceivingDetailsFormValue, next: string) { onChange(changeReceivingDetails(value, key, next, unit)) }
  return <div className="grid gap-5 sm:grid-cols-2">
    <div className="sm:col-span-2"><p className="text-sm font-semibold text-slate-700">Đơn vị / hình thức đóng gói theo khai báo</p><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{(['Tấn', 'Kg', 'Bao', 'Thùng'] as const).map(item => <div key={item} className={`rounded-lg border px-3 py-2.5 text-center text-sm ${mode === item ? 'border-emerald-500 bg-emerald-50 font-semibold text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>{item === 'Bao' || item === 'Thùng' ? `${item} (kiện)` : item}</div>)}</div><p className="mt-2 text-xs text-slate-500">{mode ? 'Đơn vị cố định theo khai báo; ghi nhận số lượng hàng thực nhận bên dưới.' : `Đơn vị dữ liệu cũ: ${unit}. Đối chiếu số lượng và khối lượng thực tế.`}</p></div>
    {needsReview && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 sm:col-span-2">Số liệu hiện có chưa khớp cách quy đổi. Hãy đối chiếu hàng thực tế và nhập lại số lượng trước khi lưu.</p>}
    <label className="text-sm font-semibold text-slate-700">{packaged ? `Số lượng kiện kiểm nhận (${mode})` : `Số lượng kiểm nhận (${mode ?? unit})`} <span className="text-rose-600">*</span>
      <input aria-label="Số lượng kiểm nhận" type="number" inputMode={packaged ? 'numeric' : 'decimal'} min={packaged ? '1' : '0.001'} step={packaged ? '1' : '0.001'} value={value.verifiedQuantity} disabled={disabled} onChange={(event) => set('verifiedQuantity', event.target.value)} className={inputClass} />
      <Difference declared={declaredQuantity} verified={value.verifiedQuantity} unit={unit} />
    </label>
    <label className="text-sm font-semibold text-slate-700"><span className="block min-h-5">{mode ? 'Tổng khối lượng kiểm nhận (kg)' : 'Khối lượng kiểm nhận (kg)'}</span>
      <input aria-label="Khối lượng kiểm nhận" type="number" inputMode="decimal" min="0.001" step="0.001" value={value.verifiedWeightInKg} readOnly={!!mode && !packaged} disabled={disabled} onChange={(event) => set('verifiedWeightInKg', event.target.value)} className={`${inputClass} ${mode && !packaged ? '!border-emerald-200 !bg-emerald-50/60 text-emerald-900' : ''}`} />
      {mode && <p className="mt-1 text-xs font-normal text-slate-500">{packaged ? 'Khối lượng thực cân của toàn bộ số kiện kiểm nhận.' : mode === 'Tấn' ? 'Tự quy đổi: 1 tấn = 1.000 kg.' : 'Tự tính từ số lượng Kg kiểm nhận.'}</p>}
      <Difference declared={declaredWeight} verified={value.verifiedWeightInKg} unit="kg" />
    </label>
    {packaged && <div className="sm:col-span-2"><button type="button" disabled={disabled} onClick={() => setWeighingOpen(open => !open)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Calculator className="size-4" />{weighingOpen ? 'Ẩn bảng cân' : 'Tính từ từng kiện / nhóm kiện'}</button></div>}
    {packaged && weighingOpen && <PackageWeighingCalculator count={value.verifiedQuantity} note={value.receivingNote} disabled={disabled} onClose={() => setWeighingOpen(false)} onApply={(weight, note) => onChange({ ...value, verifiedWeightInKg: weight, receivingNote: note })} />}
    {showPackaging && !packaged && <>
    <label className="text-sm font-semibold text-slate-700">Quy cách đóng gói kiểm nhận {mode && '· đã ghi nhận'}
      <input aria-label="Quy cách đóng gói kiểm nhận" value={value.verifiedPackagingType} maxLength={100} disabled={disabled} onChange={(event) => set('verifiedPackagingType', event.target.value)} className={inputClass} />
    </label>
    <label className="text-sm font-semibold text-slate-700">Số kiện kiểm nhận
      <input aria-label="Số kiện kiểm nhận" type="number" inputMode="numeric" min="1" step="1" value={value.verifiedPackageCount} disabled={disabled} onChange={(event) => set('verifiedPackageCount', event.target.value)} className={inputClass} />
    </label>
    <label className="text-sm font-semibold text-slate-700">Khối lượng mỗi kiện kiểm nhận (kg)
      <input aria-label="Khối lượng mỗi kiện kiểm nhận" type="number" inputMode="decimal" min="0.001" step="0.001" value={value.verifiedPackageUnitWeightKg} disabled={disabled} onChange={(event) => set('verifiedPackageUnitWeightKg', event.target.value)} className={inputClass} />
    </label>
    </>}
    <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Ghi chú tiếp nhận của staff
      <textarea aria-label="Ghi chú tiếp nhận của staff" rows={3} value={value.receivingNote} maxLength={1000} disabled={disabled} onChange={(event) => set('receivingNote', event.target.value)} className={`${inputClass} h-auto min-h-24 py-2`} />
    </label>
  </div>
}
