import { useCallback, useState } from 'react'
import { getGoodsReceiptBatches } from '@/services/goodsReceiptService'
import { useGoodsReceiptResource } from '@/features/operation/hooks/useGoodsReceiptResource'
import type { GoodsReceiptBatch } from '@/types/goodsReceipt'

export default function GoodsReceiptBatchPicker({ supplierId, selected, onSelect, disabled }: {
  supplierId: number; selected: GoodsReceiptBatch | null; onSelect: (batch: GoodsReceiptBatch | null) => void; disabled: boolean
}) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const result = useGoodsReceiptResource(useCallback((signal: AbortSignal) => getGoodsReceiptBatches(supplierId, search, page, signal), [supplierId, search, page]))
  return <fieldset disabled={disabled} className="space-y-3">
    <legend className="mb-2 font-semibold">Lô đủ điều kiện nhập kho</legend>
    <input aria-label="Tìm lô đủ điều kiện" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="Tìm mã lô / sản phẩm" maxLength={100} value={search} onChange={e => { setSearch(e.target.value); setPage(1); onSelect(null) }} />
    {result.loading ? <p className="text-sm text-slate-500">Đang tải lô...</p> : result.error ? <p role="alert" className="text-rose-700">{result.error} <button type="button" onClick={result.reload} className="underline">Thử lại</button></p> : !result.data?.items.length ? <p className="text-sm text-slate-500">Không có lô đủ điều kiện. Lô phải được QC duyệt, có số liệu kiểm nhận và chưa có phiếu nhập.</p> : <>
      <select aria-label="Lô nhập kho" required value={selected?.id ?? ''} onChange={e => onSelect(result.data!.items.find(b => b.id === Number(e.target.value)) ?? null)} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"><option value="">Chọn lô</option>{result.data.items.map(b => <option key={b.id} value={b.id}>{b.batchCode} · {b.productName}</option>)}</select>
      <div className="flex items-center gap-3 text-xs text-slate-500"><button type="button" disabled={page <= 1} onClick={() => { setPage(page - 1); onSelect(null) }}>Trước</button><span>Trang {page}/{Math.max(1, Math.ceil(result.data.totalCount / 10))} · {result.data.totalCount} lô</span><button type="button" disabled={page * 10 >= result.data.totalCount} onClick={() => { setPage(page + 1); onSelect(null) }}>Sau</button></div>
    </>}
  </fieldset>
}
