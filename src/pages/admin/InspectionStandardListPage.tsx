import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import AppIcon from '@/components/common/AppIcon'
import { ROUTES } from '@/constants/routes'
import { getAuthErrorMessage } from '@/services/authService'
import { getInspectionStandards, type InspectionStandardListItem } from '@/services/inspectionStandardService'

export default function InspectionStandardListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<InspectionStandardListItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async (query = '') => {
    setLoading(true); setError('')
    try { setItems(await getInspectionStandards(query)) }
    catch (e) { setError(getAuthErrorMessage(e, 'Không thể tải danh sách tiêu chuẩn kiểm định.')) }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const [cropFilter, setCropFilter] = useState('')

  const statusLabel: Record<string, string> = {
    DRAFT:          'Bản nháp',
    PENDING_REVIEW: 'Chờ duyệt',
    PUBLISHED:      'Đang áp dụng',
    RETIRED:        'Ngưng áp dụng',
  }
  const statusClass: Record<string, string> = {
    DRAFT:          'bg-amber-50 text-amber-700',
    PENDING_REVIEW: 'bg-blue-50 text-blue-700',
    PUBLISHED:      'bg-emerald-50 text-emerald-700',
    RETIRED:        'bg-slate-100 text-slate-500',
  }

  // Client-side filter by crop type name
  const displayed = cropFilter.trim()
    ? items.filter(i => i.cropTypeName.toLowerCase().includes(cropFilter.trim().toLowerCase()))
    : items

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Quản trị · Kiểm định</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">Tiêu chuẩn kiểm định</h1>
          <p className="mt-1 text-sm text-slate-500">Quản lý các bộ tiêu chuẩn và phiên bản áp dụng cho nông sản.</p>
        </div>
        <button id="btn-new-inspection-standard" onClick={() => navigate(ROUTES.ADMIN_INSPECTION_STANDARD_NEW)}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800">
          <AppIcon name="plus" className="size-4" /> Thêm tiêu chuẩn kiểm định
        </button>
      </div>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-bold">Danh sách bộ tiêu chuẩn <span className="text-slate-400">({displayed.length})</span></h2>
          <div className="flex flex-wrap gap-2">
            <input id="input-search-standards" value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void load(search) }}
              placeholder="Tìm mã hoặc tên tiêu chuẩn..."
              className="h-9 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-600" />
            <input id="input-filter-croptype" value={cropFilter} onChange={e => setCropFilter(e.target.value)}
              placeholder="Lọc theo tên nông sản..."
              className="h-9 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-600" />
            <button id="btn-search-standards" onClick={() => void load(search)}
              className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50">Tìm</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Mã</th>
                <th className="px-5 py-3">Tên tiêu chuẩn</th>
                <th className="px-5 py-3">Loại nông sản</th>
                <th className="px-5 py-3">Phiên bản</th>
                <th className="px-5 py-3">Tiêu chí</th>
                <th className="px-5 py-3">Hiệu lực từ</th>
                <th className="px-5 py-3">Trạng thái</th>
                <th className="px-5 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Đang tải dữ liệu...</td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Không có bộ tiêu chuẩn nào phù hợp.</td></tr>
              ) : displayed.map(item => (
                <tr key={item.id} className="cursor-pointer hover:bg-emerald-50/40"
                  onClick={() => navigate(ROUTES.ADMIN_INSPECTION_STANDARD_DETAIL.replace(':id', String(item.id)))}>
                  <td className="px-5 py-4 font-mono text-xs font-bold text-emerald-700">{item.code}</td>
                  <td className="px-5 py-4 font-semibold text-slate-800">{item.name}</td>
                  <td className="px-5 py-4 text-slate-600">{item.cropTypeName}</td>
                  <td className="px-5 py-4 tabular-nums">v{item.versionNo}.0</td>
                  <td className="px-5 py-4 tabular-nums">{item.criterionCount}</td>
                  <td className="px-5 py-4 text-slate-500">{item.effectiveFrom ?? '—'}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass[item.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {statusLabel[item.status] ?? item.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <button id={`btn-detail-${item.id}`}
                      onClick={() => navigate(ROUTES.ADMIN_INSPECTION_STANDARD_DETAIL.replace(':id', String(item.id)))}
                      className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 hover:border-emerald-300 hover:text-emerald-700">
                      Xem chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
