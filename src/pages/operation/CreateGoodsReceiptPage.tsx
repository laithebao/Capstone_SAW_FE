import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { createGoodsReceipt, getGoodsReceiptOptions } from '@/services/goodsReceiptService'
import { getAuthErrorMessage } from '@/services/authService'
import { useGoodsReceiptResource } from '@/features/operation/hooks/useGoodsReceiptResource'
import GoodsReceiptBatchPicker from '@/features/operation/components/GoodsReceiptBatchPicker'
import GoodsReceiptDraftFields from '@/features/operation/components/GoodsReceiptDraftFields'
import type { GoodsReceiptBatch } from '@/types/goodsReceipt'

const input = 'mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm'
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

export default function CreateGoodsReceiptPage() {
  const navigate = useNavigate()
  const options = useGoodsReceiptResource(getGoodsReceiptOptions)
  const [supplier, setSupplier] = useState('')
  const [batch, setBatch] = useState<GoodsReceiptBatch | null>(null)
  const [location, setLocation] = useState('')
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (saving || !batch || batch.supplierId !== Number(supplier)) return
    setSaving(true); setError(null)
    try {
      const receipt = await createGoodsReceipt({ productBatchId: batch.id, warehouseLocationId: Number(location), receivedDate: date, note: note.trim() || null })
      navigate(ROUTES.OPERATION_GOODS_RECEIPT_DETAIL.replace(':id', String(receipt.id)), { replace: true, state: { savedDraft: true } })
    } catch (cause) { setError(getAuthErrorMessage(cause, 'Không thể lưu phiếu nhập nháp. Vui lòng kiểm tra lại.')) }
    finally { setSaving(false) }
  }
  return <div className="mx-auto max-w-5xl space-y-5">
    <header className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-bold text-emerald-700">VẬN HÀNH · NHẬP KHO</p><h1 className="mt-1 text-2xl font-bold">TẠO PHIẾU NHẬP</h1><p className="mt-2 text-sm text-slate-500">Nhập toàn bộ số liệu đã kiểm nhận vào một vị trí kho.</p></div><Link className="text-sm text-emerald-700" to={ROUTES.OPERATION_GOODS_RECEIPTS}>← Quay lại danh sách</Link></header>
    {(error || options.error) && <div role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700">{error || options.error}{options.error && <button className="ml-2 underline" onClick={options.reload}>Thử lại</button>}{error && <Link className="ml-2 underline" to={ROUTES.OPERATION_GOODS_RECEIPTS}>Mở danh sách phiếu nhập</Link>}</div>}
    {options.loading ? <p>Đang tải nhà cung cấp và vị trí kho...</p> : options.data && <form onSubmit={submit} className="space-y-5">
      <fieldset disabled={saving} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block text-sm font-medium">Nhà cung cấp<select required className={input} value={supplier} onChange={e => { setSupplier(e.target.value); setBatch(null); setError(null) }}><option value="">Chọn nhà cung cấp</option>{options.data.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        {supplier && <GoodsReceiptBatchPicker key={supplier} supplierId={Number(supplier)} selected={batch} onSelect={setBatch} disabled={saving} />}
      </fieldset>
      {batch && <>
        <section className="rounded-xl border border-emerald-100 bg-emerald-50 p-5"><h2 className="font-semibold">Số liệu kiểm nhận dùng cho phiếu</h2><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">{[
          ['Lô / sản phẩm', `${batch.batchCode} · ${batch.productName}`], ['Nhà cung cấp', batch.supplierName], ['Kết quả QC', `Đạt · Hạng ${batch.qualityGrade}`],
          ['Số lượng nhập', `${batch.quantity.toLocaleString('vi-VN')} ${batch.unit}`], ['Khối lượng nhập', `${batch.weightInKg.toLocaleString('vi-VN')} kg`],
        ].map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl><p className="mt-4 text-xs text-slate-600">Số liệu chỉ đọc, lấy từ kiểm nhận trước QC. Lưu nháp chưa làm tăng tồn kho.</p></section>
        <GoodsReceiptDraftFields values={{ location, date, note }} onChange={v => { setLocation(v.location); setDate(v.date); setNote(v.note) }} locations={options.data.locations} disabled={saving} />
        <div className="flex justify-end gap-3"><Link className="rounded-lg border border-slate-200 px-5 py-2.5" to={ROUTES.OPERATION_GOODS_RECEIPTS}>Quay lại</Link><button disabled={saving} className="rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu nháp'}</button></div>
      </>}
    </form>}
  </div>
}
