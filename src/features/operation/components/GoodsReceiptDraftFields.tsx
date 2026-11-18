import type { GoodsReceiptOptions } from '@/types/goodsReceipt'

export interface GoodsReceiptDraftValues { location: string; date: string; note: string }
const input = 'mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm'
const kg = (value: number) => `${value.toLocaleString('vi-VN', { maximumFractionDigits: 3 })} kg`

export default function GoodsReceiptDraftFields({ values, onChange, locations, disabled, incomingWeightKg }: {
  values: GoodsReceiptDraftValues; onChange: (values: GoodsReceiptDraftValues) => void
  locations: GoodsReceiptOptions['locations']; disabled: boolean; incomingWeightKg?: number
}) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const selected = locations.find(l => String(l.id) === values.location)
  const remaining = selected?.maxWeightKg == null || selected.hasNonKgInventory ? null : Math.max(0, selected.maxWeightKg - selected.usedWeightKg)
  const insufficient = remaining != null && incomingWeightKg != null && incomingWeightKg > remaining
  return <fieldset disabled={disabled} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
    <label className="text-sm font-medium">Vị trí kho<select required aria-label="Vị trí kho" className={input} value={values.location} onChange={e => onChange({ ...values, location: e.target.value })}>
      <option value="">Chọn vị trí đang hoạt động</option>
      {locations.filter(l => l.isActive || String(l.id) === values.location).map(l => {
        const free = l.maxWeightKg == null || l.hasNonKgInventory ? null : Math.max(0, l.maxWeightKg - l.usedWeightKg)
        return <option key={l.id} value={l.id} disabled={!l.isActive}>{l.name}{!l.isActive ? ' · Đã khóa' : l.hasNonKgInventory ? ' · Cần kiểm tra đơn vị tồn' : free == null ? ' · Chưa cấu hình sức chứa' : free <= 0 ? ' · Đã đầy' : ` · Còn ${kg(free)}`}</option>
      })}
    </select></label>
    <label className="text-sm font-medium">Ngày nhận thực tế<input required type="date" max={today} value={values.date} onChange={e => onChange({ ...values, date: e.target.value })} className={input} /></label>
    {selected && <div className={`rounded-lg border p-4 text-sm sm:col-span-2 ${insufficient ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-100 bg-emerald-50 text-slate-700'}`} role={insufficient ? 'alert' : undefined}>
      <p className="font-semibold">{selected.hasNonKgInventory ? 'Cần kiểm tra đơn vị tồn kho' : selected.maxWeightKg == null ? 'Vị trí chưa cấu hình sức chứa' : remaining === 0 ? 'Vị trí đã đầy' : insufficient ? 'Vị trí không đủ chỗ cho lô này' : 'Thông tin sức chứa vị trí'}</p>
      <p className="mt-1">{selected.hasNonKgInventory ? 'Không thể tính sức chứa vì có tồn kho không dùng đơn vị kg.' : <>Đang lưu: {kg(selected.usedWeightKg)}{selected.maxWeightKg != null && <> · Tối đa: {kg(selected.maxWeightKg)} · Còn: {kg(remaining ?? 0)}</>}</>}{incomingWeightKg != null && <> · Lô nhập: {kg(incomingWeightKg)}</>}</p>
      <p className="mt-2 text-xs">Số liệu tại thời điểm tải; hệ thống kiểm tra lại sức chứa khi xác nhận nhập kho. Phiếu nháp không giữ chỗ.</p>
    </div>}
    <label className="text-sm font-medium sm:col-span-2">Ghi chú<textarea maxLength={1000} value={values.note} onChange={e => onChange({ ...values, note: e.target.value })} className="mt-1 min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm" /></label>
  </fieldset>
}
