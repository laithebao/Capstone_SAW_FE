import type { ReceivingDetailsFormValue } from '@/features/operation/receivingDetails'

const inputClass = 'mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50'
const number = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value)

function Difference({ declared, verified, unit }: { declared: number; verified: string; unit: string }) {
  const parsed = Number(verified)
  const difference = verified.trim() && Number.isFinite(parsed) ? parsed - declared : null
  return <p className="mt-1 text-xs text-slate-500">Chênh lệch: <span className={`font-semibold ${difference === null ? '' : difference < 0 ? 'text-amber-700' : difference > 0 ? 'text-blue-700' : 'text-emerald-700'}`}>{difference === null ? '—' : `${difference > 0 ? '+' : ''}${number(difference)} ${unit}`}</span></p>
}

export default function ReceivingDetailsFields({ value, onChange, unit, declaredQuantity, declaredWeight, disabled }:
  { value: ReceivingDetailsFormValue; onChange: (next: ReceivingDetailsFormValue) => void; unit: string; declaredQuantity: number; declaredWeight: number; disabled: boolean }) {
  function set(key: keyof ReceivingDetailsFormValue, next: string) { onChange({ ...value, [key]: next }) }
  return <div className="grid gap-5 sm:grid-cols-2">
    <label className="text-sm font-semibold text-slate-700">Số lượng kiểm nhận ({unit})
      <input aria-label="Số lượng kiểm nhận" type="number" inputMode="decimal" min="0.001" step="0.001" value={value.verifiedQuantity} disabled={disabled} onChange={(event) => set('verifiedQuantity', event.target.value)} className={inputClass} />
      <Difference declared={declaredQuantity} verified={value.verifiedQuantity} unit={unit} />
    </label>
    <label className="text-sm font-semibold text-slate-700">Khối lượng kiểm nhận (kg)
      <input aria-label="Khối lượng kiểm nhận" type="number" inputMode="decimal" min="0.001" step="0.001" value={value.verifiedWeightInKg} disabled={disabled} onChange={(event) => set('verifiedWeightInKg', event.target.value)} className={inputClass} />
      <Difference declared={declaredWeight} verified={value.verifiedWeightInKg} unit="kg" />
    </label>
    <label className="text-sm font-semibold text-slate-700">Quy cách đóng gói kiểm nhận
      <input aria-label="Quy cách đóng gói kiểm nhận" value={value.verifiedPackagingType} maxLength={100} disabled={disabled} onChange={(event) => set('verifiedPackagingType', event.target.value)} className={inputClass} />
    </label>
    <label className="text-sm font-semibold text-slate-700">Số kiện kiểm nhận
      <input aria-label="Số kiện kiểm nhận" type="number" inputMode="numeric" min="1" step="1" value={value.verifiedPackageCount} disabled={disabled} onChange={(event) => set('verifiedPackageCount', event.target.value)} className={inputClass} />
    </label>
    <label className="text-sm font-semibold text-slate-700">Khối lượng mỗi kiện kiểm nhận (kg)
      <input aria-label="Khối lượng mỗi kiện kiểm nhận" type="number" inputMode="decimal" min="0.001" step="0.001" value={value.verifiedPackageUnitWeightKg} disabled={disabled} onChange={(event) => set('verifiedPackageUnitWeightKg', event.target.value)} className={inputClass} />
    </label>
    <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Ghi chú tiếp nhận của staff
      <textarea aria-label="Ghi chú tiếp nhận của staff" rows={3} value={value.receivingNote} maxLength={1000} disabled={disabled} onChange={(event) => set('receivingNote', event.target.value)} className={`${inputClass} h-auto min-h-24 py-2`} />
    </label>
  </div>
}
