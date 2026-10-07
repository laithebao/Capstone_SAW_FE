import { useCallback, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { getDistributorCatalog } from '@/services/orderService'
import type { CatalogLot, DistributorQuery } from '@/types/order'
import { DistributorHeader, Pagination } from '@/features/distributor-orders/shared'
import { date, field, money, panel, primary, weight } from '@/features/distributor-orders/format'
import { useDistributorResource } from '@/features/distributor-orders/useDistributorResource'

export default function DistributorCatalogPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState<DistributorQuery>({ page: 1, pageSize: 10 })
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<CatalogLot[]>(() => (location.state as { selectedLots?: CatalogLot[] } | null)?.selectedLots ?? [])
  const result = useDistributorResource(useCallback((signal: AbortSignal) => getDistributorCatalog(query, signal), [query]))
  function toggle(lot: CatalogLot) {
    setSelected(current => current.some(l => l.batchId === lot.batchId) ? current.filter(l => l.batchId !== lot.batchId) : current.length < 20 ? [...current, lot] : current)
  }
  return <div className="mx-auto max-w-[1400px] space-y-5">
    <DistributorHeader title="Lô hàng đang bán" description="Chọn mua nguyên lô đã đạt QC và nhập kho. Giá hiển thị là giá cả lô." />
    <form className={`${panel} flex flex-wrap gap-3`} onSubmit={e => { e.preventDefault(); setQuery({ ...query, search: search.trim() || undefined, page: 1 }); result.reload() }}>
      <input className={`${field} max-w-lg`} aria-label="Tìm lô hàng" placeholder="Mã lô, tên sản phẩm hoặc loại nông sản" maxLength={100} value={search} onChange={e => setSearch(e.target.value)} />
      <button className={primary}>Tìm kiếm</button><button type="button" onClick={result.reload} className="text-sm text-emerald-700">Làm mới</button>
    </form>
    {result.error && <div role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">{result.error} <button onClick={result.reload} className="underline">Thử lại</button></div>}
    {result.loading ? <p role="status">Đang tải lô hàng...</p> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{result.data?.items.map(lot => {
      const checked = selected.some(l => l.batchId === lot.batchId)
      return <article key={lot.batchId} className={`${panel} ${checked ? 'ring-2 ring-emerald-600' : ''}`}>
        <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs text-emerald-700">{lot.batchCode}</p><h2 className="mt-2 text-lg font-bold">{lot.productName}</h2></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">Hạng {lot.qualityGrade}</span></div>
        <dl className="mt-4 space-y-2 text-sm"><div><dt className="text-slate-500">Nhà cung cấp / vùng trồng</dt><dd>{lot.supplierName} · {lot.origin}</dd></div><div><dt className="text-slate-500">Khối lượng cả lô</dt><dd className="font-semibold">{weight(lot.weightKg)} kg</dd></div><div><dt className="text-slate-500">Thu hoạch / hết hạn</dt><dd>{date(lot.harvestDate)} / {date(lot.expiryDate)}</dd></div></dl>
        <p className="mt-4 text-xl font-bold text-emerald-700">{money(lot.wholeLotPrice)} <small className="text-xs font-normal text-slate-500">/ cả lô</small></p>
        <Link to={ROUTES.DISTRIBUTOR_LOT_DETAIL.replace(':id', String(lot.batchId))} state={{ selectedLots: selected }} className="mt-4 block text-center text-sm font-semibold text-emerald-700 underline">Xem chi tiết lô</Link>
        <button type="button" aria-pressed={checked} disabled={!checked && selected.length >= 20} onClick={() => toggle(lot)} className={`${primary} mt-4 w-full`}>{checked ? 'Bỏ chọn lô' : 'Chọn mua nguyên lô'}</button>
      </article>
    })}</div>}
    {!result.loading && !result.error && !result.data?.items.length && <div className={panel}>Chưa có lô nguyên đủ điều kiện và được công bố giá bán.</div>}
    <Pagination page={query.page} pageSize={query.pageSize} total={result.data?.totalCount ?? 0} busy={result.loading} onPage={page => setQuery({ ...query, page })} onSize={pageSize => setQuery({ ...query, pageSize, page: 1 })} />
    {selected.length > 0 && <section className={`${panel} sticky bottom-3 space-y-3 border-emerald-300`} aria-label="Các lô đã chọn">
      <div className="flex flex-wrap gap-2">{selected.map(l => <button key={l.batchId} onClick={() => toggle(l)} className="rounded bg-emerald-50 px-3 py-1 text-sm text-emerald-800" aria-label={`Bỏ chọn ${l.batchCode}`}>{l.batchCode} ×</button>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-3"><p><b>{selected.length}/20 lô</b> · {money(selected.reduce((sum, l) => sum + l.wholeLotPrice, 0))}</p><button className={primary} onClick={() => navigate(ROUTES.DISTRIBUTOR_ORDER_CREATE, { state: { lots: selected } })}>Tạo Đơn Hàng</button></div>
      <p className="text-xs text-slate-500">Sau khi gửi đơn, lô tạm ẩn khỏi catalog trong lúc chờ xử lý. Nếu đơn bị từ chối hoặc hủy, lô sẽ hiện lại khi vẫn đủ điều kiện bán.</p>
    </section>}
  </div>
}
