import type { GoodsReceiptOptions } from '@/types/goodsReceipt'

export interface GoodsReceiptDraftValues { location: string; date: string; note: string }
const input = 'mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm'
export default function GoodsReceiptDraftFields({ values, onChange, locations, disabled }: {
  values: GoodsReceiptDraftValues; onChange: (values: GoodsReceiptDraftValues) => void
  locations: GoodsReceiptOptions['locations']; disabled: boolean
}) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  return <fieldset disabled={disabled} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
    <label className="text-sm font-medium">Vị trí kho<select required aria-label="Vị trí kho" className={input} value={values.location} onChange={e => onChange({ ...values, location: e.target.value })}><option value="">Chọn vị trí đang hoạt động</option>{locations.filter(l => l.isActive || String(l.id) === values.location).map(l => <option key={l.id} value={l.id} disabled={!l.isActive}>{l.name}{!l.isActive ? ' · Đã khóa' : l.maxWeightKg != null ? ` · Tối đa ${l.maxWeightKg.toLocaleString('vi-VN')} kg` : ''}</option>)}</select></label>
    <label className="text-sm font-medium">Ngày nhận thực tế<input required type="date" max={today} value={values.date} onChange={e => onChange({ ...values, date: e.target.value })} className={input} /></label>
    <label className="text-sm font-medium sm:col-span-2">Ghi chú<textarea maxLength={1000} value={values.note} onChange={e => onChange({ ...values, note: e.target.value })} className="mt-1 min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm" /></label>
  </fieldset>
}
