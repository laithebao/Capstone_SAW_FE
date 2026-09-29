import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import {
  getQcInspection,
  updateSamplingRatio,
  saveSensoryResult,
  saveLabResult,
  saveEnvironmentCriteria,
  finalizeInspection,
  rejectBatch,
  addQualityImage,
  deleteQualityImage,
  createEnvironmentLog,
} from '@/services/inspectionService'
import { getAuthErrorMessage } from '@/services/authService'
import { ROUTES } from '@/constants/routes'
import { QcStatusBadge, QcResultBadge, GradeEvaluationBadge } from '@/components/inspection/QcSharedComponents'
import type {
  QcInspectionDetailDto,
  SaveCriterionResultRequest,
  FinalizeQcResultDto,
} from '@/types/inspection'
import QCSensoryTab    from './tabs/QCSensoryTab'
import QCLabTab        from './tabs/QCLabTab'
import QCImagesTab                from './tabs/QCImagesTab'
import QCEnvironmentTab           from './tabs/QCEnvironmentTab'
import QCEnvironmentCriteriaTab   from './tabs/QCEnvironmentCriteriaTab'

type TabKey = 'overview' | 'sensory' | 'lab' | 'environment' | 'images' | 'temp_log'

export default function QCInspectionDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const inspId    = Number(id)
  const { user }  = useAuth()
  const isAdmin   = user?.role === 'ADMINISTRATOR'

  const [inspection, setInspection] = useState<QcInspectionDetailDto | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [activeTab,  setActiveTab]  = useState<TabKey>('overview')

  // Action states
  const [samplingRatio,    setSamplingRatio]    = useState('')
  const [savingSampling,   setSavingSampling]   = useState(false)
  const [finalizing,       setFinalizing]       = useState(false)
  const [finalizeResult,   setFinalizeResult]   = useState<FinalizeQcResultDto | null>(null)
  const [rejecting,        setRejecting]        = useState(false)
  const [rejectReason,     setRejectReason]     = useState('')
  const [showRejectForm,   setShowRejectForm]   = useState(false)
  const [actionMsg,        setActionMsg]        = useState('')

  const isCompleted = inspection?.inspectionStatus === 'COMPLETED'
  const isInProgress = inspection?.inspectionStatus === 'IN_PROGRESS'
  const isDraft = inspection?.inspectionStatus === 'DRAFT'

  const reload = useCallback(async () => {
    try {
      const data = await getQcInspection(inspId)
      setInspection(data)
      if (data.samplingRatio) setSamplingRatio(String(data.samplingRatio))
    } catch (e) {
      setError(getAuthErrorMessage(e, 'Không thể tải phiếu kiểm định.'))
    }
  }, [inspId])

  useEffect(() => {
    setLoading(true)
    reload().finally(() => setLoading(false))
  }, [reload])

  async function handleSaveSampling() {
    const ratio = Number(samplingRatio)
    if (!ratio || ratio <= 0 || ratio > 1) {
      setError('Tỷ lệ lấy mẫu phải trong khoảng (0, 1]. Ví dụ: 0.10 = 10%')
      return
    }
    setSavingSampling(true); setError(''); setActionMsg('')
    try {
      await updateSamplingRatio(inspId, { samplingRatio: ratio })
      setActionMsg('✓ Đã lưu tỷ lệ lấy mẫu.')
      await reload()
    } catch (e) {
      setError(getAuthErrorMessage(e, 'Không thể lưu tỷ lệ lấy mẫu.'))
    } finally {
      setSavingSampling(false)
    }
  }

  async function handleFinalize() {
    if (!confirm('Hoàn thành kiểm định và đánh giá chất lượng? Sau khi hoàn thành phiếu sẽ bị khóa.')) return
    setFinalizing(true); setError(''); setActionMsg('')
    try {
      const res = await finalizeInspection(inspId)
      setFinalizeResult(res)
      await reload()
    } catch (e) {
      setError(getAuthErrorMessage(e, 'Không thể hoàn thành kiểm định.'))
    } finally {
      setFinalizing(false)
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) { setError('Vui lòng nhập lý do từ chối.'); return }
    setRejecting(true); setError('')
    try {
      await rejectBatch(inspId, { rejectionReason: rejectReason.trim() })
      setActionMsg('✓ Đã từ chối lô hàng.')
      setShowRejectForm(false)
      await reload()
    } catch (e) {
      setError(getAuthErrorMessage(e, 'Không thể từ chối lô hàng.'))
    } finally {
      setRejecting(false)
    }
  }

  // Criterion result updater (used by tabs)
  function buildCriteriaResults(group?: 'SENSORY' | 'LAB'): SaveCriterionResultRequest[] {
    if (!inspection) return []
    return inspection.criteriaResults
      .filter(c => !group || c.criterionGroup === group)
      .map(c => ({
        inspectionCriterionId: c.criterionId,
        numericValue: c.numericValue ?? undefined,
        textValue: c.textValue ?? undefined,
        booleanValue: c.booleanValue ?? undefined,
        remarks: c.remarks ?? undefined,
      }))
  }

  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: 'overview',    label: 'Tổng quan' },
    { key: 'sensory',     label: 'Cảm quan',
      count: inspection?.criteriaResults.filter(c => c.criterionGroup === 'SENSORY').length },
    { key: 'lab',         label: 'Phòng lab',
      count: inspection?.criteriaResults.filter(c => c.criterionGroup === 'LAB').length },
    { key: 'environment', label: 'Môi trường',
      count: inspection?.criteriaResults.filter(c => c.criterionGroup === 'ENVIRONMENT').length },
    { key: 'images',      label: 'Ảnh bằng chứng',
      count: inspection?.images.length },
    { key: 'temp_log',    label: 'Nhiệt độ bảo quản',
      count: inspection?.environmentLogs.length },
  ]

  const inputCls = 'h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50'

  if (loading) return (
    <div className="mx-auto max-w-[1100px] space-y-5 pb-10">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  )

  if (!inspection) return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
      {error || 'Không tìm thấy phiếu kiểm định.'}
    </div>
  )

  return (
    <div className="mx-auto max-w-[1100px] space-y-5 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Kiểm định ·{' '}
            <button onClick={() => navigate(ROUTES.QC_INSPECTIONS)} className="hover:underline">
              Danh sách
            </button>{' '}
            · Chi tiết
          </p>
          <h1 className="mt-1 font-mono text-xl font-bold text-slate-950 sm:text-2xl">
            {inspection.inspectionCode}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <QcStatusBadge status={inspection.inspectionStatus} />
            {inspection.qcResult && <QcResultBadge result={inspection.qcResult} />}
            {inspection.qualityGrade && <GradeEvaluationBadge grade={inspection.qualityGrade} />}
          </div>
        </div>

        {/* Action buttons */}
        {!isCompleted && (
          <div className="flex flex-wrap gap-2">
            {/* Chỉ ADMINISTRATOR mới được từ chối thủ công — hệ thống tự động từ chối qua Finalize */}
            {isAdmin && !showRejectForm && (
              <button
                onClick={() => setShowRejectForm(true)}
                className="h-9 rounded-lg border border-rose-300 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                title="Ghi đè thủ công — chỉ dành cho Quản trị viên"
              >
                Từ chối thủ công
              </button>
            )}
            {isInProgress && (
              <button
                id="btn-finalize"
                disabled={finalizing}
                onClick={() => void handleFinalize()}
                className="h-9 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {finalizing ? 'Đang đánh giá...' : '✓ Hoàn thành & Đánh giá'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      {error      && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {actionMsg  && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{actionMsg}</div>}

      {/* Finalize result banner */}
      {finalizeResult && (
        <div className={`rounded-xl border px-5 py-4 ${
          finalizeResult.qcResult === 'PASS'
            ? 'border-emerald-200 bg-emerald-50'
            : 'border-rose-200 bg-rose-50'
        }`}>
          <p className={`text-sm font-bold ${finalizeResult.qcResult === 'PASS' ? 'text-emerald-800' : 'text-rose-800'}`}>
            {finalizeResult.qcResult === 'PASS' ? '✓ LÔ HÀNG ĐẠT' : '✕ LÔ HÀNG BỊ TỪ CHỐI'}
          </p>
          <p className="mt-1 text-xs text-slate-600">{finalizeResult.summary}</p>
        </div>
      )}

      {/* Reject form */}
      {showRejectForm && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3">
          <p className="text-sm font-bold text-rose-800">Từ chối lô hàng</p>
          <textarea
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Nhập lý do từ chối bắt buộc..."
            rows={3}
            className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 resize-none"
          />
          <div className="flex gap-2">
            <button disabled={rejecting} onClick={() => void handleReject()}
              className="h-9 rounded-lg bg-rose-600 px-5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60">
              {rejecting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </button>
            <button onClick={() => { setShowRejectForm(false); setRejectReason('') }}
              className="h-9 rounded-lg border border-slate-300 px-4 text-sm font-semibold hover:bg-white">
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Info cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <InfoCard label="Lô hàng" value={inspection.batchCode} mono />
        <InfoCard label="Sản phẩm" value={`${inspection.productName} (${inspection.cropTypeName})`} />
        <InfoCard label="KTV kiểm định" value={inspection.qcAccountName} />
        <InfoCard label="Tiêu chuẩn" value={`[${inspection.standardCode}] ${inspection.standardName} v${inspection.versionNo}`} />
        <InfoCard label="Ngày bắt đầu" value={new Date(inspection.startedAt).toLocaleString('vi-VN')} />
        {inspection.completedAt && (
          <InfoCard label="Ngày hoàn thành" value={new Date(inspection.completedAt).toLocaleString('vi-VN')} />
        )}
      </div>

      {/* UC21 — Sampling Ratio */}
      {!isCompleted && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-800">
            🎯 UC21 — Tỷ lệ lấy mẫu (Sampling Ratio)
          </h2>
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Tỷ lệ (0 &lt; ratio ≤ 1) <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="1"
                  value={samplingRatio}
                  onChange={e => setSamplingRatio(e.target.value)}
                  placeholder="VD: 0.10"
                  className={`${inputCls} w-36`}
                />
                <span className="text-sm text-slate-500">
                  {samplingRatio ? `= ${(Number(samplingRatio) * 100).toFixed(1)}%` : ''}
                </span>
              </div>
            </div>
            {inspection.sampleSize && (
              <div className="text-sm text-slate-600">
                → Cỡ mẫu: <b>{inspection.sampleSize.toFixed(2)} kg</b>
              </div>
            )}
            <button
              disabled={savingSampling}
              onClick={() => void handleSaveSampling()}
              className="h-9 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {savingSampling ? 'Đang lưu...' : 'Lưu tỷ lệ'}
            </button>
          </div>
          {isDraft && (
            <p className="text-xs text-amber-600">
              ⚠ Phiếu đang ở DRAFT — khai báo tỷ lệ lấy mẫu để chuyển sang IN_PROGRESS.
            </p>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-5 py-3.5 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5">
          {activeTab === 'overview' && (
            <OverviewTab inspection={inspection} />
          )}

          {activeTab === 'sensory' && (
            <QCSensoryTab
              inspection={inspection}
              disabled={isCompleted}
              onSaved={reload}
              buildCriteriaResults={() => buildCriteriaResults('SENSORY')}
              saveSensoryResult={saveSensoryResult}
            />
          )}

          {activeTab === 'lab' && (
            <QCLabTab
              inspection={inspection}
              disabled={isCompleted}
              onSaved={reload}
              buildCriteriaResults={() => buildCriteriaResults('LAB')}
              saveLabResult={saveLabResult}
            />
          )}

          {activeTab === 'images' && (
            <QCImagesTab
              inspection={inspection}
              disabled={isCompleted}
              onSaved={reload}
              addImage={addQualityImage}
              deleteImage={deleteQualityImage}
            />
          )}

          {activeTab === 'environment' && (
            <QCEnvironmentCriteriaTab
              inspection={inspection}
              disabled={isCompleted}
              onSaved={reload}
              saveEnvironmentCriteria={saveEnvironmentCriteria}
            />
          )}

          {activeTab === 'temp_log' && (
            <QCEnvironmentTab
              inspection={inspection}
              onSaved={reload}
              createEnvironmentLog={createEnvironmentLog}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Small helper components ───────────────────────────────────────────────────

function InfoCard({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-semibold text-slate-800 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}

function OverviewTab({ inspection }: { inspection: QcInspectionDetailDto }) {
  const gradedCriteria = inspection.criteriaResults.filter(c => c.dataType !== 'BOOLEAN')
  const boolCriteria   = inspection.criteriaResults.filter(c => c.dataType === 'BOOLEAN')
  const totalRequired  = inspection.criteriaResults.filter(c => c.isRequired).length

  // "Đã nhập" = có ít nhất 1 trong 3 giá trị không null
  const isFilled = (c: { numericValue: number | null; textValue: string | null; booleanValue: boolean | null }) =>
    c.numericValue !== null || c.textValue !== null || c.booleanValue !== null

  const filledCount = inspection.criteriaResults.filter(c => c.isRequired && isFilled(c)).length

  // "Đạt" = chỉ đếm những tiêu chí ĐÃ NHẬP và isPassed = true
  const passedCount  = inspection.criteriaResults.filter(c => isFilled(c) && c.isPassed).length
  const failedCount  = inspection.criteriaResults.filter(c => isFilled(c) && !c.isPassed).length

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Tiêu chí bắt buộc',  value: totalRequired,  cls: 'text-slate-700' },
          { label: 'Đã nhập',             value: filledCount,    cls: 'text-blue-700' },
          { label: 'Đạt',                 value: passedCount,    cls: 'text-emerald-700' },
          { label: 'Bị từ chối',         value: failedCount,    cls: 'text-rose-700' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-center">
            <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="mt-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* BOOLEAN criteria summary */}
      {boolCriteria.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-rose-600">
            🔴 Tiêu chí cổng Pass/Fail (BOOLEAN) — không tham gia xếp hạng A-E
          </h3>
          <div className="space-y-2">
          {boolCriteria.map(c => (
              <div key={c.criterionId} className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${
                c.booleanValue === false && c.isCritical
                  ? 'border-rose-300 bg-rose-50'
                  : 'border-slate-100'
              }`}>
                <div>
                  <span className="font-mono font-semibold text-xs text-slate-600">{c.criterionCode}</span>
                  <span className="ml-2 text-slate-700">{c.criterionName}</span>
                  {c.isCritical && <span className="ml-2 text-[10px] font-bold text-rose-600">NGHIÊM TRỌNG</span>}
                  {/* Hiện rõ nguyên nhân từ chối lô */}
                  {c.booleanValue === false && c.isCritical && (
                    <span className="ml-2 rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      🔴 Gây từ chối lô
                    </span>
                  )}
                </div>
                <div>
                  {c.booleanValue === null ? (
                    <span className="text-xs text-slate-400">Chưa nhập</span>
                  ) : c.booleanValue ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">✓ Đạt</span>
                  ) : (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                      {c.isCritical ? '✕ Bị từ chối' : '✕ Không đạt'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Graded criteria summary */}
      {gradedCriteria.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            📊 Tiêu chí xếp hạng A-E
          </h3>
          <div className="space-y-2">
            {gradedCriteria.map(c => {
              const causesRejection = !c.isPassed && c.isCritical
              return (
                <div key={c.criterionId} className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${
                  causesRejection ? 'border-rose-300 bg-rose-50' : 'border-slate-100'
                }`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-slate-600">{c.criterionCode}</span>
                    <span className="text-slate-700">{c.criterionName}</span>
                    <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${
                      c.criterionGroup === 'SENSORY'     ? 'bg-violet-50 text-violet-700' :
                      c.criterionGroup === 'LAB'         ? 'bg-blue-50 text-blue-700' :
                                                           'bg-teal-50 text-teal-700'
                    }`}>{c.criterionGroup}</span>
                    {c.isCritical && <span className="text-[10px] font-bold text-rose-600">NGHIÊM TRỌNG</span>}
                    {/* Hiện rõ nguyên nhân từ chối lô */}
                    {causesRejection && (
                      <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        🔴 Gây từ chối lô
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {c.numericValue !== null && <span className="text-xs text-slate-500">{c.numericValue} {c.unit}</span>}
                    {c.textValue    !== null && <span className="text-xs text-slate-500">{c.textValue}</span>}
                    <GradeEvaluationBadge grade={c.evaluatedGrade} />
                    {c.evaluatedGrade && (
                      <span className={`text-[10px] font-bold ${c.isPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {c.isPassed ? '✓' : causesRejection ? '🔴' : '✕'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
