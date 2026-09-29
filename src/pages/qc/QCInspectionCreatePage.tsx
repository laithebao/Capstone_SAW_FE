import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router'
import { createQcInspection } from '@/services/inspectionService'
import { getAuthErrorMessage } from '@/services/authService'
import { apiClient } from '@/services/apiClient'
import { ROUTES } from '@/constants/routes'

// Mirrors ProductBatchListItem from BE
interface BatchOption {
  id: number
  batchCode: string
  productName: string
  cropTypeName: string
  cropTypeId: number    // needed to filter compatible standards
  quantity: number
  unit: string
  batchStatus: string
}

// Mirrors PublishedVersionOption from BE
interface StandardVersionOption {
  versionId: number    // REAL InspectionStandardVersionId
  setId: number
  setCode: string
  setName: string
  cropTypeId: number
  cropTypeName: string
  versionNo: number
  effectiveFrom: string | null
  criterionCount: number
}

interface ApiResponse<T> { data: T }
interface ProductBatchListResponse {
  items: BatchOption[]
  totalCount: number
  page: number
  pageSize: number
}

export default function QCInspectionCreatePage() {
  const navigate = useNavigate()
  const formId   = useId()

  // Lookup data
  const [batches,   setBatches]   = useState<BatchOption[]>([])
  const [versions,  setVersions]  = useState<StandardVersionOption[]>([])
  const [loadingBatches,  setLoadingBatches]  = useState(true)
  const [loadingVersions, setLoadingVersions] = useState(false)

  // Form state
  const [productBatchId,              setProductBatchId]              = useState<number | ''>('')
  const [inspectionStandardVersionId, setInspectionStandardVersionId] = useState<number | ''>('')
  const [note,                        setNote]                        = useState('')
  const [saving,                      setSaving]                      = useState(false)
  const [error,                       setError]                       = useState('')
  const [success,                     setSuccess]                     = useState(false)

  const selectedBatch   = batches.find(b => b.id === productBatchId)
  const selectedVersion = versions.find(v => v.versionId === inspectionStandardVersionId)

  // Load batches awaiting QC
  // URL: /api/operation/product-batches?status=PENDING_QC
  useEffect(() => {
    setLoadingBatches(true)
    setError('')
    apiClient
      .get<ApiResponse<ProductBatchListResponse>>(
        '/operation/product-batches?status=PENDING_QC&pageSize=100'
      )
      .then(r => setBatches(r.data.data?.items ?? []))
      .catch(err => {
        console.error('[QCCreatePage] Failed to load batches:', err)
        setError('Không thể tải danh sách lô hàng. Kiểm tra kết nối API.')
      })
      .finally(() => setLoadingBatches(false))
  }, [])

  // When batch changes — load ONLY versions matching this crop type
  useEffect(() => {
    if (!productBatchId) { setVersions([]); setInspectionStandardVersionId(''); return }
    const batch = batches.find(b => b.id === productBatchId)
    if (!batch) return

    setLoadingVersions(true)
    setInspectionStandardVersionId('')
    setVersions([])

    // GET /api/inspection-standards/published-versions?cropTypeId={id}
    // cropTypeId lọc đúng tiêu chuẩn phù hợp với loại nông sản của lô
    apiClient.get<ApiResponse<StandardVersionOption[]>>(
      `/inspection-standards/published-versions?cropTypeId=${batch.cropTypeId}`
    )
      .then(r => setVersions(r.data.data ?? []))
      .catch(err => {
        console.error('[QCCreatePage] Failed to load versions:', err)
        setError('Không thể tải bộ tiêu chuẩn kiểm định.')
      })
      .finally(() => setLoadingVersions(false))
  }, [productBatchId]) // eslint-disable-line react-hooks/exhaustive-deps

  const canSave = productBatchId !== '' && inspectionStandardVersionId !== '' && !saving

  async function save() {
    if (!canSave) return
    setSaving(true)
    setError('')
    try {
      const result = await createQcInspection({
        productBatchId:              productBatchId as number,
        inspectionStandardVersionId: inspectionStandardVersionId as number,
        note: note.trim() || undefined,
      })
      setSuccess(true)
      setTimeout(() => navigate(ROUTES.QC_INSPECTION_DETAIL.replace(':id', String(result.id))), 1200)
    } catch (e) {
      setError(getAuthErrorMessage(e, 'Không thể tạo phiếu kiểm định.'))
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:cursor-not-allowed'

  return (
    <div className="mx-auto max-w-[800px] space-y-5 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Kiểm định chất lượng ·{' '}
            <button onClick={() => navigate(ROUTES.QC_INSPECTIONS)} className="hover:underline">
              Danh sách
            </button>{' '}
            · Tạo phiếu mới
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">
            Tạo phiếu kiểm định
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Chỉ lô hàng <b>chờ kiểm định (PENDING_QC)</b> được hiển thị bên dưới.
          </p>
        </div>
        <button
          onClick={() => navigate(ROUTES.QC_INSPECTIONS)}
          className="h-9 rounded-lg border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50"
        >
          Hủy bỏ
        </button>
      </div>

      {error   && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">✓ Tạo phiếu thành công! Đang chuyển trang...</div>}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
        {/* Batch selection */}
        <div className="space-y-2">
          <label
            htmlFor={`${formId}-batch`}
            className="block text-[11px] font-bold uppercase tracking-wide text-slate-500"
          >
            Lô hàng <span className="text-rose-500">*</span>
          </label>
          {loadingBatches ? (
            <div className="h-9 w-full animate-pulse rounded-lg bg-slate-100" />
          ) : (
            <select
              id={`${formId}-batch`}
              value={productBatchId}
              onChange={e => setProductBatchId(e.target.value ? Number(e.target.value) : '')}
              className={inputCls}
            >
              <option value="">— Chọn lô hàng cần kiểm định —</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>
                  [{b.batchCode}] {b.productName} · {b.cropTypeName} · {b.quantity} {b.unit}
                </option>
              ))}
            </select>
          )}
          {batches.length === 0 && !loadingBatches && (
            <p className="text-xs text-amber-600 font-medium">
              ⚠ Không có lô hàng nào đang chờ kiểm định.
            </p>
          )}
        </div>

        {/* Selected batch info */}
        {selectedBatch && (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <div><span className="text-xs text-slate-500">Mã lô:</span> <b className="font-mono">{selectedBatch.batchCode}</b></div>
              <div><span className="text-xs text-slate-500">Sản phẩm:</span> {selectedBatch.productName}</div>
              <div><span className="text-xs text-slate-500">Loại nông sản:</span> {selectedBatch.cropTypeName}</div>
              <div><span className="text-xs text-slate-500">Khối lượng khai báo:</span> {selectedBatch.quantity} {selectedBatch.unit}</div>
            </div>
          </div>
        )}

        {/* Standard version selection */}
        <div className="space-y-2">
          <label
            htmlFor={`${formId}-version`}
            className="block text-[11px] font-bold uppercase tracking-wide text-slate-500"
          >
            Bộ tiêu chuẩn kiểm định <span className="text-rose-500">*</span>
          </label>
          {loadingVersions ? (
            <div className="h-9 w-full animate-pulse rounded-lg bg-slate-100" />
          ) : (
            <select
              id={`${formId}-version`}
              value={inspectionStandardVersionId}
              onChange={e => setInspectionStandardVersionId(e.target.value ? Number(e.target.value) : '')}
              disabled={!productBatchId || loadingVersions}
              className={inputCls}
            >
              <option value="">— Chọn phiên bản tiêu chuẩn —</option>
              {versions.map(v => (
                <option key={v.versionId} value={v.versionId}>
                  [{v.setCode}] {v.setName} · v{v.versionNo} · {v.criterionCount} tiêu chí
                </option>
              ))}
            </select>
          )}
          {!productBatchId && (
            <p className="text-xs text-slate-400">Chọn lô hàng trước để hiển thị bộ tiêu chuẩn phù hợp.</p>
          )}
          {productBatchId && versions.length === 0 && !loadingVersions && (
            <p className="text-xs text-rose-600 font-medium">
              ✕ Không tìm thấy bộ tiêu chuẩn PUBLISHED cho loại nông sản này.
            </p>
          )}
        </div>

        {selectedVersion && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">Thông tin tiêu chuẩn</p>
            <div className="mt-1 grid gap-1 sm:grid-cols-3 text-blue-900">
              <div><span className="text-xs text-blue-600">Mã:</span> {selectedVersion.setCode}</div>
              <div><span className="text-xs text-blue-600">Tên:</span> {selectedVersion.setName}</div>
              <div><span className="text-xs text-blue-600">Phiên bản:</span> v{selectedVersion.versionNo}</div>
              <div><span className="text-xs text-blue-600">Số tiêu chí:</span> {selectedVersion.criterionCount}</div>
            </div>
          </div>
        )}

        {/* Note */}
        <div className="space-y-2">
          <label
            htmlFor={`${formId}-note`}
            className="block text-[11px] font-bold uppercase tracking-wide text-slate-500"
          >
            Ghi chú (tùy chọn)
          </label>
          <textarea
            id={`${formId}-note`}
            value={note}
            onChange={e => setNote(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Ghi chú về phiếu kiểm định..."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 resize-none"
          />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-[800px] items-center justify-end gap-3">
          <button
            onClick={() => navigate(ROUTES.QC_INSPECTIONS)}
            className="h-9 rounded-lg border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50"
          >
            Hủy bỏ
          </button>
          <button
            id="btn-save-inspection"
            disabled={!canSave}
            onClick={() => void save()}
            className="h-9 rounded-lg bg-emerald-700 px-6 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Đang tạo...' : 'Tạo phiếu kiểm định'}
          </button>
        </div>
      </div>
    </div>
  )
}
