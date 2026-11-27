import { parseApiTimestamp } from '@/utils/vietnamTime'
import type { GoodsReceiptOptions } from '@/types/goodsReceipt'
import { receiptCapacityLabel } from '../receiptCapacity'

export interface GoodsReceiptDraftValues { location: string; date: string; note: string }
const input = 'mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm'
export default function GoodsReceiptDraftFields({ values, onChange, locations, disabled, incomingKg, onRefreshCapacity }: {
  values: GoodsReceiptDraftValues; onChange: (values: GoodsReceiptDraftValues) => void
  locations: GoodsReceiptOptions['locations']; disabled: boolean
  incomingKg: number; onRefreshCapacity: () => void
}) {
  const selected = locations.find(l => String(l.id) === values.location)
  // Keep an existing draft's location visible when reopening it.
  const selectableLocations = locations.filter(location =>
    location === selected || (location.isActive && !location.name.startsWith('DEMO-DIST-ZONE · ')),
  )
  const remainingKg = selected?.hasNonKgInventory ? null : selected?.remainingWeightKg
  const insufficient = remainingKg != null && remainingKg < incomingKg
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(parseApiTimestamp(new Date()))
  return <fieldset disabled={disabled} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
    <div className="min-w-0 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2"><label htmlFor="receipt-location" className="font-medium">Vị trí kho</label><button type="button" onClick={onRefreshCapacity} className="text-xs text-emerald-700 underline">Làm mới sức chứa</button></div>
      <select
        id="receipt-location"
        required
        aria-describedby={selected ? 'receipt-location-capacity' : undefined}
        className={input}
        value={values.location}
        onChange={e => onChange({ ...values, location: e.target.value })}
      >
        <option value="">Chọn vị trí đang hoạt động</option>
        {selectableLocations.map(location => {
          const label = location.isActive ? receiptCapacityLabel(location, incomingKg) : 'Đã khóa'
          return (
            <option key={location.id} value={location.id} disabled={!location.isActive}>
              {location.name}{label && ` · ${label}`}
            </option>
          )
        })}
      </select>
      {selected && (
        <div id="receipt-location-capacity" role="status" className={`mt-2 text-xs ${insufficient ? 'text-amber-800' : 'text-slate-600'}`}>
          {remainingKg != null ? (
            <p>Còn trống <strong>{remainingKg.toLocaleString('vi-VN')} kg</strong></p>
          ) : (
            <p>{receiptCapacityLabel(selected, incomingKg)}</p>
          )}
          {insufficient && <p className="mt-1">Vị trí hiện không đủ chỗ cho lô này.</p>}
        </div>
      )}
    </div>
    <label className="text-sm font-medium">Ngày nhận thực tế<input required type="date" max={today} value={values.date} onChange={e => onChange({ ...values, date: e.target.value })} className={input} /></label>
    <label className="text-sm font-medium sm:col-span-2">Ghi chú<textarea maxLength={1000} value={values.note} onChange={e => onChange({ ...values, note: e.target.value })} className="mt-1 min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm" /></label>
  </fieldset>
}
