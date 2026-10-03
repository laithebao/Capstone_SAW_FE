import { useState } from 'react'
import axios from 'axios'
import { getGoodsReceipt, getGoodsReceiptOptions, updateGoodsReceiptDraft } from '@/services/goodsReceiptService'
import { getAuthErrorMessage } from '@/services/authService'
import { useGoodsReceiptResource } from '@/features/operation/hooks/useGoodsReceiptResource'
import GoodsReceiptDraftFields from './GoodsReceiptDraftFields'
import type { GoodsReceipt } from '@/types/goodsReceipt'

export default function EditGoodsReceiptDraftForm({ receipt, committed, onSaved, onCancel }: {
  receipt: GoodsReceipt; committed: boolean; onSaved: () => void; onCancel: () => void
}) {
  const [original, setOriginal] = useState(receipt)
  const [values, setValues] = useState({ location: String(receipt.warehouseLocationId), date: receipt.receivedDate, note: receipt.note ?? '' })
  const [saving, setSaving] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const options = useGoodsReceiptResource(getGoodsReceiptOptions)
  // The editing snapshot is intentionally independent of focus/background refreshes.
  async function reload() {
    if (!window.confirm('Tải lại sẽ bỏ nội dung đang nhập và lấy dữ liệu mới nhất. Tiếp tục?')) return
    setSaving(true)
    try {
      const latest = await getGoodsReceipt(receipt.id)
      if (latest.receiptStatus !== 'DRAFT') { onCancel(); return }
      setOriginal(latest)
      setValues({ location: String(latest.warehouseLocationId), date: latest.receivedDate, note: latest.note ?? '' })
      setConflict(false); setError(null); options.reload()
    } catch (cause) { setError(getAuthErrorMessage(cause, 'Không thể tải lại phiếu.')) }
    finally { setSaving(false) }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (saving || conflict || committed) return
    setSaving(true); setError(null)
    try {
      await updateGoodsReceiptDraft(receipt.id, { warehouseLocationId: Number(values.location), receivedDate: values.date, note: values.note.trim() || null, expectedSnapshot: original.snapshot })
      onSaved()
    } catch (cause) {
      setError(getAuthErrorMessage(cause, 'Không thể lưu thay đổi. Hãy kiểm tra lại phiếu.'))
      if (axios.isAxiosError(cause) && cause.response?.status === 409) setConflict(true)
    } finally { setSaving(false) }
  }
  return <form onSubmit={save} className="space-y-4">
    <h2 className="text-lg font-semibold">Chỉnh sửa phiếu nháp</h2>
    {committed && <p role="alert" className="text-rose-700">Phiếu đã được xác nhận nhập kho. Nội dung đang nhập được giữ lại để đối chiếu, không thể lưu.</p>}
    <p className="text-sm text-slate-500">Chỉ thay đổi vị trí, ngày nhận và ghi chú. Số lượng, khối lượng và lô hàng giữ nguyên.</p>
    {(error || options.error) && <div role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">{error || options.error}{error && <button type="button" disabled={saving} onClick={() => void reload()} className="ml-2 underline">Tải lại dữ liệu mới nhất</button>}{options.error && <button type="button" onClick={options.reload} className="ml-2 underline">Thử lại vị trí kho</button>}</div>}
    {options.loading && <p className="text-sm text-slate-500">Đang tải vị trí kho...</p>}
    <GoodsReceiptDraftFields values={values} onChange={setValues} locations={options.data?.locations ?? []} disabled={saving || committed} />
    <div className="flex justify-end gap-3"><button type="button" disabled={saving} onClick={onCancel} className="rounded-lg border border-slate-200 px-4 py-2">Hủy chỉnh sửa</button><button disabled={saving || conflict || committed || options.loading || !!options.error} className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button></div>
  </form>
}
