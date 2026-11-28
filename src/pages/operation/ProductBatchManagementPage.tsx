import './warehouse-batches.css'
import { AnimatedNumber } from '@/components/common/AnimatedNumber'
import { parseApiTimestamp } from '@/utils/vietnamTime'
import axios from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { OperationSmartFilters } from '@/features/operation/components/OperationSmartFilters'
import { Link } from 'react-router'
import { CheckCircle2, Eye, RotateCw, Package } from 'lucide-react'
import ProductBatchStatusBadge from '@/features/operation/components/ProductBatchStatusBadge'
import { getProductBatchStatusPresentation } from '@/features/operation/productBatchStatus'
import { ROUTES } from '@/constants/routes'
import { getProductBatchFilterOptions, getProductBatches } from '@/services/batchService'
import { getAuthErrorMessage } from '@/services/authService'
import type {
  ProductBatchFilterOptions,
  ProductBatchFilters,
  ProductBatchListItem,
  ProductBatchSort,
} from '@/types/batch'
import { useAuth } from '@/hooks/useAuth'
import { ROLES } from '@/constants/roles'

const batchCount = async (status: string, signal: AbortSignal) => (await getProductBatches({ page: 1, pageSize: 1, sortBy: 'createdAtDesc', status: status || undefined }, signal)).totalCount
const pageSize = 10
const initialFilters: ProductBatchFilters = { page: 1, pageSize, sortBy: 'createdAtDesc' }
const emptyOptions: ProductBatchFilterOptions = { suppliers: [], cropTypes: [], statuses: [] }
const dateTime = (value: string) => {
  const date = parseApiTimestamp(value)
  const day = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh',  day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh',  hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
  return `${day} · ${time}`
}

function loadError(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 403) return 'You are not allowed to access this page.'
  if (axios.isAxiosError(error) && (error.response?.status ?? 0) >= 500) return 'Failed to retrieve product batch data.'
  return getAuthErrorMessage(error, 'Failed to load product batch list.')
}

export default function ProductBatchManagementPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<ProductBatchListItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [filters, setFilters] = useState<ProductBatchFilters>(initialFilters)
  const [batchCode, setBatchCode] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [cropTypeId, setCropTypeId] = useState('')
  const [status, setStatus] = useState('')
  const [sortBy, setSortBy] = useState<ProductBatchSort>('createdAtDesc')
  const [options, setOptions] = useState<ProductBatchFilterOptions>(emptyOptions)
  const [loading, setLoading] = useState(true)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [optionsReloadKey, setOptionsReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const data = await getProductBatchFilterOptions(controller.signal)
        if (!controller.signal.aborted) { setOptions(data); setOptionsError(null) }
      } catch (requestError) {
        if (!controller.signal.aborted) setOptionsError(loadError(requestError))
      }
    }, 0)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [optionsReloadKey])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getProductBatches(filters, controller.signal)
        if (!controller.signal.aborted) { setItems(data.items); setTotalCount(data.totalCount) }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setItems([])
          setTotalCount(0)
          setError(loadError(requestError))
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 0)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [filters, reloadKey])

  const batchTabs = useMemo(() => [{ value: '', label: 'Tất cả' }, ...options.statuses.map(value => ({ value, label: getProductBatchStatusPresentation(value).label }))], [options.statuses])
  useEffect(() => { if (user?.role !== ROLES.OPERATION_STAFF) return; const timer = window.setTimeout(() => setFilters(old => old.batchCode === (batchCode.trim() || undefined) ? old : { ...old, batchCode: batchCode.trim() || undefined, page: 1 }), 300); return () => window.clearTimeout(timer) }, [batchCode, user?.role])
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
  const firstItem = totalCount === 0 ? 0 : (filters.page - 1) * pageSize + 1
  const lastItem = Math.min(filters.page * pageSize, totalCount)

  function applyFilters() {
    setFilters({
      batchCode: batchCode.trim() || undefined,
      supplierId: supplierId ? Number(supplierId) : undefined,
      cropTypeId: cropTypeId ? Number(cropTypeId) : undefined,
      status: status || undefined,
      sortBy,
      page: 1,
      pageSize,
    })
  }

  if (user?.role === ROLES.WAREHOUSE_MANAGER) {
    return <div className="saw-wm-batches">
      <header className="batch-header"><div><p>Quản lý kho / Quản lý lô hàng</p><h1>Quản lý lô hàng</h1><span>Tra cứu và theo dõi thông tin các lô hàng trong kho.</span></div><div className="batch-header-actions"><span>Chế độ xem</span><button type="button" onClick={() => {setReloadKey(value => value + 1); setOptionsReloadKey(value => value + 1)}} disabled={loading} className="batch-button"><RotateCw className={loading ? 'batch-spin' : ''} aria-hidden="true" /> Làm mới</button></div></header>
      <section className="batch-panel batch-filter-panel"><div className="batch-panel-heading"><div><h2>Tìm kiếm và bộ lọc</h2><p>Tìm nhanh lô hàng theo thông tin cần theo dõi.</p></div></div><div className="batch-filters">
        <label><span>Mã lô hàng</span><input aria-label="Mã lô hàng" value={batchCode} maxLength={50} onChange={event => setBatchCode(event.target.value)} onKeyDown={event => {if (event.key === 'Enter') applyFilters()}} placeholder="Tìm theo mã lô..." /></label>
        <label><span>Nhà cung cấp</span><select aria-label="Nhà cung cấp" value={supplierId} onChange={event => setSupplierId(event.target.value)}><option value="">Tất cả nhà cung cấp</option>{options.suppliers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span>Loại nông sản</span><select aria-label="Loại nông sản" value={cropTypeId} onChange={event => setCropTypeId(event.target.value)}><option value="">Tất cả loại nông sản</option>{options.cropTypes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span>Trạng thái</span><select aria-label="Trạng thái lô hàng" value={status} onChange={event => setStatus(event.target.value)}><option value="">Tất cả trạng thái</option>{options.statuses.map(value => <option key={value} value={value}>{getProductBatchStatusPresentation(value).label}</option>)}</select></label>
        <label><span>Sắp xếp</span><select aria-label="Sắp xếp" value={sortBy} onChange={event => setSortBy(event.target.value as ProductBatchSort)}><option value="createdAtDesc">Mới tạo gần đây</option><option value="createdAtAsc">Tạo sớm nhất</option><option value="updatedAtDesc">Mới cập nhật gần đây</option><option value="updatedAtAsc">Cập nhật sớm nhất</option></select></label>
        <div className="batch-filter-actions"><button type="button" className="batch-primary" onClick={applyFilters}>Áp dụng bộ lọc</button><button type="button" className="batch-button" onClick={() => {setBatchCode('');setSupplierId('');setCropTypeId('');setStatus('');setSortBy('createdAtDesc');setFilters({...initialFilters})}}>Đặt lại</button></div>
      </div>{optionsError && <div role="alert" className="batch-message batch-message--warning">Không thể tải bộ lọc: {optionsError} <button type="button" onClick={() => setOptionsReloadKey(value => value + 1)}>Thử lại</button></div>}</section>
      {error && <div role="alert" className="batch-message batch-message--error">{error} <button type="button" onClick={() => setReloadKey(value => value + 1)}>Thử lại</button></div>}
      <section className="batch-panel batch-list"><div className="batch-panel-heading"><div><h2>Danh sách lô hàng</h2><p>Theo dõi trạng thái và thông tin lô hàng.</p></div><span className="batch-count"><AnimatedNumber value={totalCount} /> lô hàng</span></div><div className="batch-table-wrap"><table className="batch-table"><thead><tr><th>Mã lô</th><th>Sản phẩm / loại</th><th>Nhà cung cấp</th><th>Ngày tạo</th><th>Trạng thái hiện tại</th><th>Thao tác</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={6} className="batch-empty">Đang tải danh sách lô hàng...</td></tr> : error ? null : items.length === 0 ? <tr><td colSpan={6} className="batch-empty">Không tìm thấy lô hàng phù hợp.</td></tr> : items.map(item => <tr key={item.id}><td><strong className="batch-code">{item.batchCode}</strong></td><td><strong>{item.productName}</strong><small>{item.cropTypeName} · {item.categoryName}</small></td><td>{item.supplierName}</td><td>{dateTime(item.createdAt)}</td><td><ProductBatchStatusBadge status={item.batchStatus} compact /></td><td><Link data-saw-transition="" to={ROUTES.OPERATION_PRODUCT_BATCH_DETAIL.replace(':id', String(item.id))} className="batch-detail" aria-label={`Xem chi tiết lô ${item.batchCode}`}><Eye aria-hidden="true" /> Chi tiết</Link></td></tr>)}
      </tbody></table></div><div className="batch-pagination"><span>Hiển thị {firstItem}–{lastItem} trong {totalCount} lô hàng</span><div><button type="button" className="batch-button" disabled={loading || filters.page <= 1} onClick={() => setFilters(current => ({...current,page:current.page - 1}))}>Trước</button><span className="batch-page" aria-label={`Trang ${filters.page} trên ${pageCount}`}>{filters.page}</span><span>/ {pageCount}</span><button type="button" className="batch-button" disabled={loading || filters.page >= pageCount} onClick={() => setFilters(current => ({...current,page:current.page + 1}))}>Sau</button></div></div></section>
    </div>
  }

  return <div className="mx-auto max-w-[1600px] space-y-4">
    <header className="op-page-header flex flex-wrap items-end justify-between gap-3">
      <span className="op-heading-icon"><Package /></span><div className="op-page-heading">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
          VẬN HÀNH
        </p>
        <h1 className="mt-1 text-xl font-bold text-slate-950">Quản lý lô hàng</h1>
        <p className="mt-1 text-sm text-slate-500">
          Theo dõi lô hàng, nhà cung cấp và trạng thái hiện tại.
        </p>
      </div>
      {user?.role === ROLES.OPERATION_STAFF && (
        <div className="flex items-center gap-2"><button type="button" title="Làm mới" aria-label="Làm mới danh sách và bộ lọc" disabled={loading} onClick={() => { setReloadKey(value => value + 1); setOptionsReloadKey(value => value + 1) }} className="grid size-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600"><RotateCw className="size-4" /></button><Link data-saw-transition="" to={ROUTES.OPERATION_PRODUCT_BATCH_CREATE} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"><CheckCircle2 className="size-4" />Xác nhận lô hàng</Link></div>
      )}
    </header>

    <OperationSmartFilters tabs={batchTabs} status={filters.status || ''} loadCount={batchCount} onStatus={value => { setStatus(value); setFilters(old => ({ ...old, status: value || undefined, page: 1 })) }}
      quick={<><label className="op-quick-field">Mã lô hàng<input aria-label="Mã lô hàng" className="op-filter-control" value={batchCode} maxLength={50} onChange={event => setBatchCode(event.target.value)} placeholder="Tìm theo mã lô..." /></label><label className="op-quick-field">Nhà cung cấp<select aria-label="Nhà cung cấp" className="op-filter-control" value={supplierId} onChange={event => { const value=event.target.value; setSupplierId(value); setFilters(old => ({ ...old, supplierId: Number(value) || undefined, page: 1 })) }}><option value="">Tất cả nhà cung cấp</option>{options.suppliers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="op-quick-field">Loại nông sản<select aria-label="Loại nông sản" className="op-filter-control" value={cropTypeId} onChange={event => { const value=event.target.value; setCropTypeId(value); setFilters(old => ({ ...old, cropTypeId: Number(value) || undefined, page: 1 })) }}><option value="">Tất cả loại nông sản</option>{options.cropTypes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></>}
      advanced={<label>Sắp xếp<select className="op-filter-control" aria-label="Sắp xếp" value={sortBy} onChange={event => setSortBy(event.target.value as ProductBatchSort)}><option value="createdAtDesc">Mới tạo gần đây</option><option value="createdAtAsc">Tạo sớm nhất</option><option value="updatedAtDesc">Mới cập nhật gần đây</option><option value="updatedAtAsc">Cập nhật sớm nhất</option></select></label>}
      chips={[...(filters.batchCode ? [{ label: `Tìm: ${filters.batchCode}`, remove: () => { setBatchCode(''); setFilters(old => ({ ...old, batchCode: undefined, page: 1 })) } }] : []), ...(filters.supplierId ? [{ label: options.suppliers.find(item => item.id === filters.supplierId)?.name || 'Nhà cung cấp', remove: () => { setSupplierId(''); setFilters(old => ({ ...old, supplierId: undefined, page: 1 })) } }] : []), ...(filters.cropTypeId ? [{ label: options.cropTypes.find(item => item.id === filters.cropTypeId)?.name || 'Nông sản', remove: () => { setCropTypeId(''); setFilters(old => ({ ...old, cropTypeId: undefined, page: 1 })) } }] : []), ...(filters.sortBy && filters.sortBy !== 'createdAtDesc' ? [{ label: `Sắp xếp: ${{ createdAtAsc: 'Tạo sớm nhất', updatedAtDesc: 'Mới cập nhật gần đây', updatedAtAsc: 'Cập nhật sớm nhất' }[filters.sortBy] || filters.sortBy}`, remove: () => { setSortBy('createdAtDesc'); setFilters(old => ({ ...old, sortBy: 'createdAtDesc', page: 1 })) } }] : [])]}
      onApply={() => { setFilters(old => ({ ...old, sortBy, page: 1 })); return true }} />
    {optionsError && <div role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Không thể tải bộ lọc: {optionsError} <button type="button" onClick={() => setOptionsReloadKey(value => value + 1)} className="underline">Thử lại</button></div>}

    {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><span>{error}</span><button type="button" onClick={() => setReloadKey((value) => value + 1)} className="font-semibold underline">Thử lại</button></div>}

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-lg font-semibold">Danh sách lô hàng <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 align-middle text-xs font-medium text-slate-500">{totalCount}</span></h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[930px] table-fixed text-left text-sm">
          <colgroup><col className="w-[18%]" /><col className="w-[22%]" /><col className="w-[19%]" /><col className="w-[17%]" /><col className="w-[16%]" /><col className="w-[8%]" /></colgroup>
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="h-12 px-3 font-semibold">Mã lô</th>
              <th className="h-12 px-3 font-semibold">Sản phẩm / loại</th>
              <th className="h-12 px-3 font-semibold">Nhà cung cấp</th>
              <th className="h-12 whitespace-nowrap px-3 font-semibold">Ngày tạo</th>
              <th className="h-12 px-3 text-center font-semibold">Trạng thái hiện tại</th>
              <th className="h-12 whitespace-nowrap px-2 text-center font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Đang tải danh sách lô hàng...</td></tr>
              : error ? null
                : items.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Không tìm thấy lô hàng phù hợp.</td></tr>
                  : items.map((item) => <tr key={item.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3 py-3.5 font-mono text-[13px] font-semibold text-emerald-700">{item.batchCode}</td>
                    <td className="px-3 py-3.5"><p className="text-sm font-semibold leading-5">{item.productName}</p><p className="mt-0.5 text-[13px] leading-5 text-slate-500">{item.cropTypeName} · {item.categoryName}</p></td>
                    <td className="px-3 py-3.5"><span className="line-clamp-2 max-w-[190px] leading-5">{item.supplierName}</span></td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-[13px] tabular-nums text-slate-600">{dateTime(item.createdAt)}</td>
                    <td className="px-3 py-3.5 text-center"><ProductBatchStatusBadge status={item.batchStatus} compact /></td>
                    <td className="px-2 py-3.5 text-center"><Link data-saw-transition="" to={ROUTES.OPERATION_PRODUCT_BATCH_DETAIL.replace(':id', String(item.id))} className="inline-grid size-9 place-items-center rounded-lg text-emerald-700 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600" aria-label={`Xem chi tiết lô ${item.batchCode}`} title={`Xem chi tiết lô ${item.batchCode}`}><Eye className="size-4" /></Link></td>
                  </tr>)}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
        <span className="text-xs text-slate-500">Hiển thị {firstItem}-{lastItem} trong {totalCount} lô hàng</span>
        <div className="flex items-center gap-2">
          <button type="button" disabled={loading || filters.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))} className="rounded border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50 disabled:opacity-40">Trước</button>
          <span className="min-w-8 text-center text-xs font-semibold text-slate-700">{filters.page}/{pageCount}</span>
          <button type="button" disabled={loading || filters.page >= pageCount} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))} className="rounded border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50 disabled:opacity-40">Sau</button>
        </div>
      </div>
    </section>
  </div>
}
