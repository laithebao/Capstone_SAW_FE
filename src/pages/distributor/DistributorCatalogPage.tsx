import { useCallback, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { getDistributorCatalog } from '@/services/orderService'
import type { CatalogLot, DistributorQuery } from '@/types/order'
import { DistributorHeader, Pagination } from '@/features/distributor-orders/shared'
import { date, money, panel, primary, weight } from '@/features/distributor-orders/format'
import { useDistributorResource } from '@/features/distributor-orders/useDistributorResource'

export default function DistributorCatalogPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState<DistributorQuery>({ page: 1, pageSize: 10 })
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [sort, setSort] = useState('')
  const [selected, setSelected] = useState<CatalogLot[]>(() => (location.state as { selectedLots?: CatalogLot[] } | null)?.selectedLots ?? [])
  const result = useDistributorResource(useCallback((signal: AbortSignal) => getDistributorCatalog(query, signal), [query]))
  const pageLots = result.data?.items ?? []
  const suppliers = [...new Set(pageLots.map(lot => lot.supplierName))].sort((a, b) => a.localeCompare(b, 'vi'))
  const grades = [...new Set(pageLots.map(lot => lot.qualityGrade).filter((grade): grade is string => Boolean(grade)))].sort()
  const visibleLots = pageLots
    .filter(lot => (!gradeFilter || lot.qualityGrade === gradeFilter) && (!supplierFilter || lot.supplierName === supplierFilter))
    .sort((a, b) => sort === 'price-asc' ? a.wholeLotPrice - b.wholeLotPrice : sort === 'price-desc' ? b.wholeLotPrice - a.wholeLotPrice : sort === 'weight-desc' ? b.weightKg - a.weightKg : 0)

  function toggle(lot: CatalogLot) {
    setSelected(current => current.some(item => item.batchId === lot.batchId) ? current.filter(item => item.batchId !== lot.batchId) : current.length < 20 ? [...current, lot] : current)
  }
  function resetFilters() {
    setSearch(''); setGradeFilter(''); setSupplierFilter(''); setSort('')
    setQuery(current => ({ page: 1, pageSize: current.pageSize }))
  }
  return <div className="mx-auto max-w-[1400px] space-y-5 dist-catalog">
    <DistributorHeader title="Lô hàng đang bán" description="Khám phá các lô nông sản đã đạt kiểm định và được công bố bán." icon="package" action={<button type="button" onClick={result.reload} disabled={result.loading} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Làm mới</button>} />
    <form className="dist-catalog-filters" onSubmit={event => { event.preventDefault(); setQuery(current => ({ ...current, search: search.trim() || undefined, page: 1 })) }}>
      <label className="dist-catalog-search"><span className="sr-only">Tìm lô hàng</span><input aria-label="Tìm lô hàng" placeholder="Mã lô, tên sản phẩm hoặc loại nông sản" maxLength={100} value={search} onChange={event => setSearch(event.target.value)} /></label>
      <label>Hạng chất lượng<select value={gradeFilter} onChange={event => setGradeFilter(event.target.value)}><option value="">Tất cả hạng</option>{grades.map(grade => <option key={grade} value={grade}>Hạng {grade}</option>)}</select></label>
      <label>Nhà cung cấp<select value={supplierFilter} onChange={event => setSupplierFilter(event.target.value)}><option value="">Tất cả nhà cung cấp</option>{suppliers.map(supplier => <option key={supplier} value={supplier}>{supplier}</option>)}</select></label>
      <label>Sắp xếp<select value={sort} onChange={event => setSort(event.target.value)}><option value="">Mới cập nhật</option><option value="price-asc">Giá thấp đến cao</option><option value="price-desc">Giá cao đến thấp</option><option value="weight-desc">Khối lượng lớn nhất</option></select></label>
      <button className={primary}>Tìm kiếm</button><button type="button" onClick={resetFilters} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Đặt lại</button>
    </form>
    {result.error && <div role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">{result.error} <button type="button" onClick={result.reload} className="underline">Thử lại</button></div>}
    <div className="dist-catalog-heading"><div><h2>Danh sách lô hàng</h2><p>{result.data?.totalCount ?? 0} lô được công bố · giá niêm yết theo nguyên lô</p></div><span>{visibleLots.length} kết quả trên trang hiện tại</span></div>
    {result.loading ? <div role="status" className={panel + ' py-10 text-center text-slate-500'}>Đang tải lô hàng...</div> : <div className="dist-market-grid">
      {visibleLots.map(lot => {
        const checked = selected.some(item => item.batchId === lot.batchId)
        return <article key={lot.batchId} className={'dist-market-card' + (checked ? ' is-selected' : '')}>
          <div className="dist-market-top"><span>{lot.batchCode}</span><span className="dist-grade-badge">Hạng {lot.qualityGrade ?? 'Chưa phân hạng'}</span></div>
          <div className="dist-market-name"><h2>{lot.productName}</h2><span>Đạt QC</span></div>
          <div className="dist-market-origin"><strong>{lot.supplierName}</strong><span>{lot.origin || 'Chưa có vùng trồng'}</span></div>
          <div className="dist-market-values"><div><span>Khối lượng cả lô</span><b>{weight(lot.weightKg)} kg</b></div><div><span>Giá nguyên lô</span><b className="dist-market-price">{money(lot.wholeLotPrice)}</b></div></div>
          <div className="dist-market-dates"><div><small>Thu hoạch</small><b>{date(lot.harvestDate)}</b></div><div><small>Hạn sử dụng</small><b>{date(lot.expiryDate)}</b></div></div>
          <div className="dist-market-actions"><Link to={ROUTES.DISTRIBUTOR_LOT_DETAIL.replace(':id', String(lot.batchId))} state={{ selectedLots: selected }}>Chi tiết</Link><button type="button" aria-pressed={checked} disabled={!checked && selected.length >= 20} onClick={() => toggle(lot)} className={checked ? 'is-chosen' : ''}>{checked ? '✓ Đã chọn' : 'Chọn mua lô'}</button></div>
        </article>
      })}
    </div>}
    {!result.loading && !result.error && !visibleLots.length && <div className={panel + ' py-8 text-center text-slate-500'}>{pageLots.length ? 'Không có lô phù hợp với bộ lọc trên trang này.' : 'Chưa có lô nguyên đủ điều kiện và được công bố giá bán.'}</div>}
    <Pagination page={query.page} pageSize={query.pageSize} total={result.data?.totalCount ?? 0} busy={result.loading} onPage={page => setQuery(current => ({ ...current, page }))} onSize={pageSize => setQuery(current => ({ ...current, pageSize, page: 1 }))} />
    {selected.length > 0 && <section className={panel + ' dist-selection-bar'} aria-label="Các lô đã chọn">
      <div className="dist-selected-chips">{selected.map(lot => <button type="button" key={lot.batchId} onClick={() => toggle(lot)} aria-label={'Bỏ chọn ' + lot.batchCode}>{lot.batchCode} ×</button>)}</div>
      <div className="dist-selection-summary"><b>Đã chọn {selected.length}/20 lô</b><span>{weight(selected.reduce((sum, lot) => sum + lot.weightKg, 0))} kg · Mua nguyên lô</span></div>
      <div className="dist-selection-total"><small>Tổng giá trị dự kiến</small><b>{money(selected.reduce((sum, lot) => sum + lot.wholeLotPrice, 0))}</b></div>
      <button className={primary} onClick={() => navigate(ROUTES.DISTRIBUTOR_ORDER_CREATE, { state: { lots: selected } })}>Tạo đơn hàng</button>
      <p className="basis-full text-xs text-slate-500">Sau khi gửi đơn, lô tạm ẩn khỏi catalog trong lúc chờ xử lý. Nếu đơn bị từ chối hoặc hủy, lô sẽ hiện lại khi vẫn đủ điều kiện bán.</p>
    </section>}
  </div>
}
