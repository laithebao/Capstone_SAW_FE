import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router'
import { listQcInspections } from '@/services/inspectionService'
import { getAuthErrorMessage } from '@/services/authService'
import { ROUTES } from '@/constants/routes'
import { QcStatusBadge, QcResultBadge, GradeEvaluationBadge } from '@/components/inspection/QcSharedComponents'
import type { QcInspectionListItem, QcInspectionListQuery, PagedResult } from '@/types/inspection'

const STATUS_OPTIONS = [
  { value: '',            label: 'Tất cả trạng thái' },
  { value: 'DRAFT',       label: 'Nháp' },
  { value: 'IN_PROGRESS', label: 'Đang kiểm định' },
  { value: 'COMPLETED',   label: 'Đã hoàn thành' },
]

const QC_RESULT_OPTIONS = [
  { value: '',     label: 'Tất cả kết quả' },
  { value: 'PASS', label: 'Đạt' },
  { value: 'FAIL', label: 'Bị từ chối' },
]

export default function QCInspectionListPage() {
  const navigate = useNavigate()
  const formId   = useId()

  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [result,  setResult]  = useState<PagedResult<QcInspectionListItem> | null>(null)

  const [batchCode,      setBatchCode]      = useState('')
  const [inspectionCode, setInspectionCode] = useState('')
  const [status,         setStatus]         = useState('')
  const [qcResult,       setQcResult]       = useState('')
  const [fromDate,       setFromDate]       = useState('')
  const [toDate,         setToDate]         = useState('')
  const [page,           setPage]           = useState(1)
  const pageSize = 20

  async function fetchList(override?: Partial<QcInspectionListQuery>) {
    setLoading(true)
    setError('')
    try {
      const q: QcInspectionListQuery = {
        batchCode:      batchCode      || undefined,
        inspectionCode: inspectionCode || undefined,
        status:         status         || undefined,
        qcResult:       qcResult       || undefined,
        fromDate:       fromDate       || undefined,
        toDate:         toDate         || undefined,
        page,
        pageSize,
        ...override,
      }
      setResult(await listQcInspections(q))
    } catch (e) {
      setError(getAuthErrorMessage(e, 'Không thể tải danh sách kiểm định.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchList() }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  function applyFilter(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    void fetchList({ page: 1 })
  }

  function resetFilter() {
    setBatchCode('')
    setInspectionCode('')
    setStatus('')
    setQcResult('')
    setFromDate('')
    setToDate('')
    setPage(1)
    void fetchList({
      batchCode: undefined, inspectionCode: undefined,
      status: undefined, qcResult: undefined,
      fromDate: undefined, toDate: undefined, page: 1,
    })
  }

  const totalPages = result ? Math.ceil(result.totalCount / pageSize) : 1
  const inputCls = 'h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Kiểm định chất lượng
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">
            Danh sách phiếu kiểm định
          </h1>
          {result && (
            <p className="mt-1 text-sm text-slate-500">
              Tổng cộng <b>{result.totalCount}</b> phiếu
            </p>
          )}
        </div>
        <button
          id="btn-create-inspection"
          onClick={() => navigate(ROUTES.QC_INSPECTION_NEW)}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow hover:bg-emerald-800 transition-colors"
        >
          <span className="text-lg leading-none">＋</span>
          Tạo phiếu kiểm định
        </button>
      </div>

      {/* Filter panel */}
      <form
        id={`${formId}-filter`}
        onSubmit={applyFilter}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Mã lô hàng
            </label>
            <input
              id={`${formId}-batchCode`}
              value={batchCode}
              onChange={e => setBatchCode(e.target.value)}
              placeholder="VD: BATCH-001"
              className={`${inputCls} w-full`}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Mã phiếu kiểm định
            </label>
            <input
              id={`${formId}-inspCode`}
              value={inspectionCode}
              onChange={e => setInspectionCode(e.target.value)}
              placeholder="VD: QC-BATCH001-..."
              className={`${inputCls} w-full`}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Trạng thái
            </label>
            <select id={`${formId}-status`} value={status} onChange={e => setStatus(e.target.value)} className={`${inputCls} w-full`}>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Kết quả QC
            </label>
            <select id={`${formId}-qcResult`} value={qcResult} onChange={e => setQcResult(e.target.value)} className={`${inputCls} w-full`}>
              {QC_RESULT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Từ ngày</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className={`${inputCls} w-full`} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Đến ngày</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className={`${inputCls} w-full`} />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="submit" className="h-9 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800">
            Tìm kiếm
          </button>
          <button type="button" onClick={resetFilter} className="h-9 rounded-lg border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50">
            Xóa bộ lọc
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-5 py-4">
                <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                <div className="ml-auto h-5 w-20 animate-pulse rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        ) : result?.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl">📋</span>
            <p className="mt-3 text-sm font-semibold text-slate-700">Chưa có phiếu kiểm định</p>
            <p className="text-xs text-slate-400 mt-1">Thử thay đổi bộ lọc hoặc tạo phiếu mới</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 text-left">Mã phiếu</th>
                  <th className="px-3 py-3 text-left">Lô hàng</th>
                  <th className="px-3 py-3 text-left">Nông sản</th>
                  <th className="px-3 py-3 text-left">KTV kiểm định</th>
                  <th className="px-3 py-3 text-left">Trạng thái</th>
                  <th className="px-3 py-3 text-left">Kết quả</th>
                  <th className="px-3 py-3 text-left">Hạng</th>
                  <th className="px-3 py-3 text-left">Ngày bắt đầu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result?.items.map(item => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(ROUTES.QC_INSPECTION_DETAIL.replace(':id', String(item.id)))}
                    className="cursor-pointer transition-colors hover:bg-emerald-50/40 group"
                  >
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-semibold text-emerald-700 group-hover:underline">
                        {item.inspectionCode}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <span className="font-mono text-xs font-medium text-slate-700">{item.batchCode}</span>
                    </td>
                    <td className="px-3 py-4 text-sm text-slate-700">
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-xs text-slate-400">{item.cropTypeName}</div>
                    </td>
                    <td className="px-3 py-4 text-sm text-slate-600">{item.qcAccountName}</td>
                    <td className="px-3 py-4"><QcStatusBadge status={item.inspectionStatus} /></td>
                    <td className="px-3 py-4"><QcResultBadge result={item.qcResult} /></td>
                    <td className="px-3 py-4"><GradeEvaluationBadge grade={item.qualityGrade} /></td>
                    <td className="px-3 py-4 text-xs text-slate-500">
                      {new Date(item.startedAt).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <span className="text-xs text-slate-500">
              Trang {page} / {totalPages} · {result.totalCount} phiếu
            </span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="h-8 rounded-lg border border-slate-300 px-3 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50">
                ← Trước
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="h-8 rounded-lg border border-slate-300 px-3 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50">
                Tiếp →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
