import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { Eye, Plus, RotateCw } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { getGoodsReceiptOptions, getGoodsReceipts } from '@/services/goodsReceiptService'
import { useGoodsReceiptResource } from '@/features/operation/hooks/useGoodsReceiptResource'
import GoodsReceiptStatusBadge from '@/features/operation/components/GoodsReceiptStatusBadge'
import type { GoodsReceiptFilters } from '@/types/goodsReceipt'

const defaults: GoodsReceiptFilters = { page: 1, pageSize: 10, sortBy: 'receivedAtDesc' }
const input = 'h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm'
const number = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 3 })

export default function GoodsReceiptManagementPage() {
  const [draft, setDraft] = useState(defaults)
  const [filters, setFilters] = useState(defaults)
  const options = useGoodsReceiptResource(getGoodsReceiptOptions)
  const result = useGoodsReceiptResource(useCallback((signal: AbortSignal) => getGoodsReceipts(filters, signal), [filters]), true)
  const hasFilters = !!(filters.search || filters.supplierId || filters.warehouseLocationId || filters.status || filters.fromDate || filters.toDate)
  const total = result.data?.totalCount ?? 0
  const pages = Math.max(1, Math.ceil(total / filters.pageSize))
  return <div className="mx-auto max-w-[1600px] space-y-4">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold text-emerald-700">VẬN HÀNH</p><h1 className="mt-1 text-xl font-bold">QUẢN LÝ PHIẾU NHẬP</h1><p className="mt-1 text-sm text-slate-500">Lưu nháp và xác nhận nhập kho các lô đã được QC duyệt.</p></div><Link to={ROUTES.OPERATION_GOODS_RECEIPT_CREATE} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="size-4" />Tạo phiếu nhập</Link></header>
    <form onSubmit={e => { e.preventDefault(); setFilters({ ...draft, page: 1 }); result.reload() }} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex justify-between"><h2 className="font-semibold">Tìm kiếm và bộ lọc</h2><button type="button" aria-label="Làm mới" onClick={() => { result.reload(); options.reload() }}><RotateCw className="size-4" /></button></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <input className={input} aria-label="Mã phiếu hoặc mã lô" placeholder="Tìm mã phiếu / mã lô" maxLength={100} value={draft.search ?? ''} onChange={e => setDraft({ ...draft, search: e.target.value || undefined })} />
        <select className={input} aria-label="Nhà cung cấp" value={draft.supplierId ?? ''} onChange={e => setDraft({ ...draft, supplierId: Number(e.target.value) || undefined })}><option value="">Tất cả nhà cung cấp</option>{options.data?.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <select className={input} aria-label="Vị trí kho" value={draft.warehouseLocationId ?? ''} onChange={e => setDraft({ ...draft, warehouseLocationId: Number(e.target.value) || undefined })}><option value="">Tất cả vị trí</option>{options.data?.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
        <select className={input} aria-label="Trạng thái" value={draft.status ?? ''} onChange={e => setDraft({ ...draft, status: e.target.value || undefined })}><option value="">Tất cả trạng thái</option><option value="DRAFT">Nháp</option><option value="COMMITTED">Đã xác nhận nhập kho</option></select>
        <label className="text-xs text-slate-500">Ngày nhận từ<input type="date" className={`${input} mt-1 w-full`} value={draft.fromDate ?? ''} max={draft.toDate} onChange={e => setDraft({ ...draft, fromDate: e.target.value || undefined })} /></label>
        <label className="text-xs text-slate-500">Ngày nhận đến<input type="date" className={`${input} mt-1 w-full`} value={draft.toDate ?? ''} min={draft.fromDate} onChange={e => setDraft({ ...draft, toDate: e.target.value || undefined })} /></label>
        <select className={`${input} self-end`} aria-label="Sắp xếp" value={draft.sortBy} onChange={e => setDraft({ ...draft, sortBy: e.target.value })}><option value="receivedAtDesc">Ngày nhận mới nhất</option><option value="receivedAtAsc">Ngày nhận cũ nhất</option><option value="idDesc">Thứ tự lập mới nhất</option><option value="idAsc">Thứ tự lập cũ nhất</option></select>
        <button className="h-10 self-end rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white">Áp dụng bộ lọc</button>
      </div>
      {options.error && <p role="alert" className="mt-3 text-sm text-rose-700">{options.error} <button type="button" className="underline" onClick={options.reload}>Thử lại bộ lọc</button></p>}
    </form>
    {result.error && <div role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700">{result.error} <button onClick={result.reload} className="underline">Thử lại</button></div>}
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <h2 className="border-b border-slate-100 p-4 font-semibold">Danh sách phiếu nhập <span className="text-slate-500">({total})</span></h2>
      <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Mã phiếu / lô', 'Sản phẩm / nhà cung cấp', 'Số lượng', 'Khối lượng', 'Vị trí', 'Ngày nhận', 'Trạng thái', 'Thao tác'].map(h => <th className="px-3 py-4" key={h}>{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">
        {result.loading ? <tr><td colSpan={8} className="p-10 text-center text-slate-500">Đang tải phiếu nhập...</td></tr> : result.error ? null : !result.data?.items.length ? <tr><td colSpan={8} className="p-10 text-center text-slate-500">{hasFilters ? 'Không có phiếu nhập phù hợp bộ lọc.' : 'Chưa có phiếu nhập kho.'}</td></tr> : result.data.items.map(r => <tr key={r.id} className="hover:bg-slate-50">
          <td className="max-w-48 break-all px-3 py-4"><p className="font-mono font-semibold text-emerald-700">{r.receiptCode}</p><p className="mt-1 text-xs text-slate-500">{r.batchCode}</p></td><td className="px-3 py-4"><p className="font-medium">{r.productName}</p><p className="text-xs text-slate-500">{r.supplierName}</p></td><td className="whitespace-nowrap px-3 py-4">{number(r.receivedQuantity)} {r.unit}</td><td className="whitespace-nowrap px-3 py-4">{number(r.weightInKg)} kg</td><td className="px-3 py-4">{r.locationName}</td><td className="whitespace-nowrap px-3 py-4">{r.receivedDate.split('-').reverse().join('/')}</td><td className="px-3 py-4"><GoodsReceiptStatusBadge status={r.receiptStatus} /></td><td className="px-3 py-4"><Link className="inline-flex items-center gap-1 text-emerald-700" title="Xem phiếu" aria-label={`Xem phiếu ${r.receiptCode}`} to={ROUTES.OPERATION_GOODS_RECEIPT_DETAIL.replace(':id', String(r.id))}><Eye className="size-4 shrink-0" />{r.receiptStatus === 'DRAFT' && <span className="text-xs">Tiếp tục xác nhận</span>}</Link></td>
        </tr>)}
      </tbody></table></div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-sm"><label>Số dòng <select aria-label="Số dòng mỗi trang" className="ml-2 rounded border p-1" value={filters.pageSize} onChange={e => { const pageSize = Number(e.target.value); setFilters({ ...filters, page: 1, pageSize }); setDraft({ ...draft, pageSize }) }}>{[10, 20, 50, 100].map(size => <option key={size}>{size}</option>)}</select></label><div className="flex items-center gap-3"><button disabled={result.loading || filters.page <= 1} className="disabled:opacity-40" onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Trước</button><span>{filters.page}/{pages}</span><button disabled={result.loading || filters.page >= pages} className="disabled:opacity-40" onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Sau</button></div></footer>
    </section>
  </div>
}
