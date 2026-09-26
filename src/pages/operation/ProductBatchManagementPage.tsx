import axios from 'axios'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Eye, RotateCw } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { getProductBatchFilterOptions, getProductBatches } from '@/services/batchService'
import { getAuthErrorMessage } from '@/services/authService'
import type {
  ProductBatchFilterOptions,
  ProductBatchFilters,
  ProductBatchListItem,
  ProductBatchSort,
} from '@/types/batch'

const pageSize = 10
const initialFilters: ProductBatchFilters = { page: 1, pageSize, sortBy: 'createdAtDesc' }
const emptyOptions: ProductBatchFilterOptions = { suppliers: [], cropTypes: [], statuses: [] }
const dateTime = (value: string) => {
  const date = new Date(value)
  const day = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
  const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
  return `${day} · ${time}`
}
const quantity = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value)

function statusTone(status: string): string {
  if (status === 'PENDING_QC' || status.startsWith('PENDING_')) return 'bg-amber-50 text-amber-700'
  if (status === 'SUBMITTED') return 'bg-sky-50 text-sky-700'
  if (status === 'APPROVED' || status === 'COMMITTED') return 'bg-emerald-50 text-emerald-700'
  if (status === 'REJECTED' || status === 'CANCELLED') return 'bg-rose-50 text-rose-700'
  return 'bg-slate-100 text-slate-700'
}

function loadError(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 403) return 'You are not allowed to access this page.'
  if (axios.isAxiosError(error) && (error.response?.status ?? 0) >= 500) return 'Failed to retrieve product batch data.'
  return getAuthErrorMessage(error, 'Failed to load product batch list.')
}

export default function ProductBatchManagementPage() {
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
        setOptions(data)
        setOptionsError(null)
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
        setItems(data.items)
        setTotalCount(data.totalCount)
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

  return <div className="mx-auto max-w-[1600px] space-y-4">
    <header>
      <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">VẬN HÀNH</p>
      <h1 className="mt-1 text-xl font-bold text-slate-950">QUẢN LÝ LÔ HÀNG</h1>
      <p className="mt-1 text-sm text-slate-500">Theo dõi lô hàng, nhà cung cấp và trạng thái hiện tại.</p>
    </header>

    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tìm kiếm và bộ lọc</h2>
        <button type="button" onClick={() => { setReloadKey((value) => value + 1); setOptionsReloadKey((value) => value + 1) }} className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700" aria-label="Làm mới danh sách và bộ lọc" title="Làm mới danh sách và bộ lọc"><RotateCw className="size-4" /></button>
      </div>
      <div className="grid gap-2.5 md:grid-cols-2 min-[1200px]:grid-cols-[minmax(150px,1.4fr)_repeat(4,minmax(110px,1fr))_auto]">
        <input aria-label="Mã lô hàng" value={batchCode} maxLength={50} onChange={(event) => setBatchCode(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') applyFilters() }} placeholder="Tìm theo mã lô..." className="h-9 min-w-0 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        <select aria-label="Nhà cung cấp" value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className="h-9 min-w-0 rounded-lg border border-slate-200 px-3 text-sm"><option value="">Tất cả nhà cung cấp</option>{options.suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select aria-label="Loại nông sản" value={cropTypeId} onChange={(event) => setCropTypeId(event.target.value)} className="h-9 min-w-0 rounded-lg border border-slate-200 px-3 text-sm"><option value="">Tất cả loại nông sản</option>{options.cropTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select aria-label="Trạng thái lô hàng" value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 min-w-0 rounded-lg border border-slate-200 px-3 text-sm"><option value="">Tất cả trạng thái</option>{options.statuses.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select>
        <select aria-label="Sắp xếp" value={sortBy} onChange={(event) => setSortBy(event.target.value as ProductBatchSort)} className="h-9 min-w-0 rounded-lg border border-slate-200 px-3 text-sm"><option value="createdAtDesc">Mới tạo gần đây</option><option value="createdAtAsc">Tạo sớm nhất</option><option value="updatedAtDesc">Mới cập nhật gần đây</option><option value="updatedAtAsc">Cập nhật sớm nhất</option></select>
        <button type="button" onClick={applyFilters} className="h-9 whitespace-nowrap rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800">Áp dụng bộ lọc</button>
      </div>
      {optionsError && <div role="alert" className="mt-3 flex items-center gap-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800"><span>Không thể tải bộ lọc: {optionsError}</span><button type="button" onClick={() => setOptionsReloadKey((value) => value + 1)} className="font-semibold underline">Thử lại</button></div>}
    </section>

    {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><span>{error}</span><button type="button" onClick={() => setReloadKey((value) => value + 1)} className="font-semibold underline">Thử lại</button></div>}

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-lg font-semibold">Danh sách lô hàng <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 align-middle text-xs font-medium text-slate-500">{totalCount}</span></h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[930px] table-fixed text-left text-sm">
          <colgroup><col className="w-[16%]" /><col className="w-[18%]" /><col className="w-[17%]" /><col className="w-[12%]" /><col className="w-[16%]" /><col className="w-[13%]" /><col className="w-[8%]" /></colgroup>
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="h-12 px-3 font-semibold">Mã lô</th>
              <th className="h-12 px-3 font-semibold">Sản phẩm / loại</th>
              <th className="h-12 px-3 font-semibold">Nhà cung cấp</th>
              <th className="h-12 whitespace-nowrap px-3 text-left font-semibold">Số lượng</th>
              <th className="h-12 whitespace-nowrap px-3 font-semibold">Ngày tạo</th>
              <th className="h-12 px-3 text-center font-semibold">Trạng thái hiện tại</th>
              <th className="h-12 whitespace-nowrap px-2 text-center font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Đang tải danh sách lô hàng...</td></tr>
              : error ? null
                : items.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No product batches found.</td></tr>
                  : items.map((item) => <tr key={item.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3 py-3.5 font-mono text-[13px] font-semibold text-emerald-700">{item.batchCode}</td>
                    <td className="px-3 py-3.5"><p className="text-sm font-semibold leading-5">{item.productName}</p><p className="mt-0.5 text-[13px] leading-5 text-slate-500">{item.cropTypeName} · {item.categoryName}</p></td>
                    <td className="px-3 py-3.5"><span className="line-clamp-2 max-w-[190px] leading-5">{item.supplierName}</span></td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-left tabular-nums">{quantity(item.quantity)} {item.unit}</td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-[13px] tabular-nums text-slate-600">{dateTime(item.createdAt)}</td>
                    <td className="px-3 py-3.5 text-center"><span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(item.batchStatus)}`}>{item.batchStatus.replaceAll('_', ' ')}</span></td>
                    <td className="px-2 py-3.5 text-center"><Link to={ROUTES.OPERATION_PRODUCT_BATCH_DETAIL.replace(':id', String(item.id))} className="inline-grid size-9 place-items-center rounded-lg text-emerald-700 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600" aria-label={`Xem chi tiết lô ${item.batchCode}`} title={`Xem chi tiết lô ${item.batchCode}`}><Eye className="size-4" /></Link></td>
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
