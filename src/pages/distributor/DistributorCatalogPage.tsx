import { useCallback, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import DistributorFade from '@/features/distributor-orders/DistributorFade'
import { Link, useLocation, useOutletContext } from 'react-router'
import AppIcon from '@/components/common/AppIcon'
import DistributorFloatingCartBar from '@/pages/distributor/DistributorFloatingCartBar'
import { ROUTES } from '@/constants/routes'
import { getDistributorCatalog } from '@/services/orderService'
import type { CatalogLot, DistributorQuery } from '@/types/order'
import { Pagination } from '@/features/distributor-orders/shared'
import { date, money, weight } from '@/features/distributor-orders/format'
import { useDistributorResource } from '@/features/distributor-orders/useDistributorResource'
import type { DistributorOutletContext } from '@/layouts/DistributorLayout'
import produceImage from '@/assets/images/home-produce.png'

export default function DistributorCatalogPage() {
  const location = useLocation()
  const listRef = useRef<HTMLElement>(null)
  const { selectedLots: selected, setSelectedLots: setSelected } = useOutletContext<DistributorOutletContext>()
  const initialSearch = (location.state as { search?: string } | null)?.search ?? ''
  const [query, setQuery] = useState<DistributorQuery>(() => ({ page: 1, pageSize: 10, search: initialSearch || undefined }))
  const [search, setSearch] = useState(initialSearch)
  const [gradeFilter, setGradeFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [cropFilter, setCropFilter] = useState('')
  const [sort, setSort] = useState('')
  const result = useDistributorResource(useCallback((signal: AbortSignal) => getDistributorCatalog(query, signal), [query]))
  const pageLots = result.data?.items ?? []
  const suppliers = [...new Set(pageLots.map(lot => lot.supplierName))].sort((a, b) => a.localeCompare(b, 'vi'))
  const grades = [...new Set(pageLots.map(lot => lot.qualityGrade).filter((grade): grade is string => Boolean(grade)))].sort()
  const crops = [...new Set(pageLots.map(lot => lot.cropName).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'))
  const visibleLots = pageLots
    .filter(lot => (!gradeFilter || lot.qualityGrade === gradeFilter) && (!supplierFilter || lot.supplierName === supplierFilter) && (!cropFilter || lot.cropName === cropFilter))
    .sort((a, b) => sort === 'price-asc' ? a.wholeLotPrice - b.wholeLotPrice : sort === 'price-desc' ? b.wholeLotPrice - a.wholeLotPrice : sort === 'weight-desc' ? b.weightKg - a.weightKg : 0)

  function toggle(lot: CatalogLot) {
    setSelected(current => current.some(item => item.batchId === lot.batchId) ? current.filter(item => item.batchId !== lot.batchId) : current.length < 20 ? [...current, lot] : current)
  }
  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setQuery(current => ({ ...current, search: search.trim() || undefined, page: 1 }))
  }
  function resetFilters() {
    setSearch(''); setGradeFilter(''); setSupplierFilter(''); setCropFilter(''); setSort('')
    setQuery(current => ({ page: 1, pageSize: current.pageSize }))
  }
  return <div className="dist-catalog">
    <form className="market-search" role="search" onSubmit={applySearch}>
      <label className="sr-only" htmlFor="dist-market-search">Tìm kiếm nông sản</label>
      <AppIcon name="search" aria-hidden="true" />
      <input id="dist-market-search" maxLength={100} placeholder="Tìm kiếm nông sản, mã lô, nhà cung cấp…" value={search} onChange={event => setSearch(event.target.value)} />
      {search && <button type="button" className="market-search-clear" aria-label="Xóa nội dung tìm kiếm" onClick={() => setSearch('')}>×</button>}
      <button type="submit" className="market-search-submit">Tìm kiếm</button>
    </form>

    <section className="dist-market-hero">
      <div className="dist-market-hero-copy"><span className="dist-market-eyebrow">SAW MARKETPLACE · B2B</span><h1>Nông sản chất lượng.<br />Nguồn cung tin cậy.</h1><p>Khám phá các lô hàng đã kiểm định, mua nguyên lô trực tiếp từ kho.</p><button type="button" onClick={() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Khám phá lô hàng <span aria-hidden="true">→</span></button></div>
      <div className="dist-market-hero-art"><img src={produceImage} alt="Minh họa nông sản tại kho" /><span>Hình ảnh minh họa</span></div>
    </section>

    {crops.length > 0 && <div className="dist-market-categories" aria-label="Danh mục nông sản">
      <button type="button" className={!cropFilter ? 'active' : ''} onClick={() => setCropFilter('')}><AppIcon name="dashboard" />Tất cả</button>
      {crops.map(crop => <button key={crop} type="button" className={cropFilter === crop ? 'active' : ''} onClick={() => setCropFilter(cropFilter === crop ? '' : crop)}><AppIcon name="package" />{crop}</button>)}
    </div>}

    <section ref={listRef} className="dist-catalog-results" id="dist-catalog-results">
      <div className="dist-catalog-heading"><div><h2>Lô hàng đang bán</h2><p>{result.loading ? 'Đang tải dữ liệu lô hàng…' : `${result.data?.totalCount ?? 0} lô hàng được công bố`}</p></div><span>{visibleLots.length} kết quả trên trang hiện tại</span></div>
      <div className="dist-catalog-filters">
        <span className="dist-filter-label">Lọc theo</span>
        <label>Hạng chất lượng<select value={gradeFilter} onChange={event => setGradeFilter(event.target.value)}><option value="">Tất cả hạng</option>{grades.map(grade => <option key={grade} value={grade}>Hạng {grade}</option>)}</select></label>
        <label>Nhà cung cấp<select value={supplierFilter} onChange={event => setSupplierFilter(event.target.value)}><option value="">Tất cả nhà cung cấp</option>{suppliers.map(supplier => <option key={supplier} value={supplier}>{supplier}</option>)}</select></label>
        <label>Sắp xếp<select value={sort} onChange={event => setSort(event.target.value)}><option value="">Mặc định</option><option value="price-asc">Giá thấp đến cao</option><option value="price-desc">Giá cao đến thấp</option><option value="weight-desc">Khối lượng lớn nhất</option></select></label>
        <button type="button" onClick={resetFilters} className="dist-filter-reset">Xóa bộ lọc</button>
      </div>
      {result.error && <div role="alert" className="dist-catalog-error">{result.error} <button type="button" onClick={result.reload}>Thử lại</button></div>}
      {(gradeFilter || supplierFilter || cropFilter) && <div className="dist-filter-chips" aria-label="Bộ lọc đang áp dụng">
        {cropFilter && <button type="button" onClick={() => setCropFilter('')}>Nông sản: {cropFilter} ×</button>}
        {gradeFilter && <button type="button" onClick={() => setGradeFilter('')}>Hạng {gradeFilter} ×</button>}
        {supplierFilter && <button type="button" onClick={() => setSupplierFilter('')}>Nhà cung cấp: {supplierFilter} ×</button>}
      </div>}
      <DistributorFade changeKey={result.loading ? 'loading' : JSON.stringify([gradeFilter, supplierFilter, cropFilter, sort, visibleLots.map(lot => lot.batchId)])}>
      {result.loading ? <div role="status" className="dist-market-skeleton-grid">{Array.from({ length: 8 }, (_, index) => <div className="dist-market-skeleton" key={index}><span /><i /><i /><b /></div>)}</div> : <div className="dist-market-grid">
        {visibleLots.map(lot => {
          const checked = selected.some(item => item.batchId === lot.batchId)
          const perKgPrice = lot.weightKg > 0 ? lot.wholeLotPrice / lot.weightKg : null
          return <article key={lot.batchId} className={'dist-market-card' + (checked ? ' is-selected' : '')}>
            <div className="dist-market-image"><img src={produceImage} alt="" loading="lazy" /><span>Ảnh minh họa</span><span className="dist-grade-badge">Hạng {lot.qualityGrade ?? 'Chưa phân hạng'}</span></div>
            <div className="dist-market-card-body">
              <div className="dist-market-top"><span>{lot.batchCode}</span></div>
              <div className="dist-market-name"><h3>{lot.productName}</h3></div>
              <div className="dist-market-origin"><strong>{lot.supplierName}</strong><span>{lot.origin || 'Chưa có vùng trồng'}</span></div>
              <div className="dist-market-values"><div><span>Giá nguyên lô</span><b className="dist-market-price">{money(lot.wholeLotPrice)}</b></div><div><span>{perKgPrice === null ? 'Khối lượng lô' : `${money(perKgPrice)}/kg`}</span><b>{weight(lot.weightKg)} kg</b></div></div>
              <div className="dist-market-dates"><div><small>Thu hoạch</small><b>{date(lot.harvestDate)}</b></div><div><small>Hạn sử dụng</small><b>{date(lot.expiryDate)}</b></div></div>
              <div className="dist-market-actions"><Link to={ROUTES.DISTRIBUTOR_LOT_DETAIL.replace(':id', String(lot.batchId))} state={{ selectedLots: selected }}>Chi tiết</Link><button type="button" aria-pressed={checked} disabled={!checked && selected.length >= 20} onClick={() => toggle(lot)} className={checked ? 'is-chosen' : ''}>{checked ? '✓ Đã chọn' : 'Chọn mua lô'}</button></div>
            </div>
          </article>
        })}
      </div>}
      {!result.loading && !result.error && !visibleLots.length && <div className="dist-market-empty"><AppIcon name="search" /><h3>{pageLots.length ? 'Không có lô phù hợp' : 'Chưa có lô hàng đang bán'}</h3><p>{pageLots.length ? 'Thử thay đổi bộ lọc để xem thêm kết quả.' : 'Các lô hàng đủ điều kiện sẽ xuất hiện tại đây.'}</p></div>}
      </DistributorFade>
      <Pagination page={query.page} pageSize={query.pageSize} total={result.data?.totalCount ?? 0} busy={result.loading} onPage={page => setQuery(current => ({ ...current, page }))} onSize={pageSize => setQuery(current => ({ ...current, pageSize, page: 1 }))} />
    </section>

    <DistributorFloatingCartBar selectedLots={selected} />
  </div>
}
