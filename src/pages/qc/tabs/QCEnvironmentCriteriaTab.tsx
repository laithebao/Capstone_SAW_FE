import { useState } from 'react'
import { getAuthErrorMessage } from '@/services/authService'
import { CriterionResultInput } from '@/components/inspection/QcSharedComponents'
import type {
  QcInspectionDetailDto,
  SaveEnvironmentCriteriaRequest,
  CriterionResultDto,
} from '@/types/inspection'

interface Props {
  inspection: QcInspectionDetailDto
  disabled: boolean
  onSaved: () => Promise<void>
  saveEnvironmentCriteria: (id: number, req: SaveEnvironmentCriteriaRequest) => Promise<void>
}

/**
 * Tab nhập kết quả tiêu chí môi trường (criterionGroup = 'ENVIRONMENT').
 * Gọi PUT /api/qc-inspections/{id}/environment-criteria — lưu vào INSPECTION_RESULT_DETAIL.
 */
export default function QCEnvironmentCriteriaTab({
  inspection,
  disabled,
  onSaved,
  saveEnvironmentCriteria,
}: Props) {
  const envCriteria = inspection.criteriaResults.filter(
    c => c.criterionGroup === 'ENVIRONMENT'
  )

  const [criteriaValues, setCriteriaValues] = useState<Record<number, CriterionResultDto>>(
    () => Object.fromEntries(envCriteria.map(c => [c.criterionId, { ...c }]))
  )

  const [note,   setNote]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [saved,  setSaved]  = useState(false)

  function updateCriterion(
    id: number,
    field: 'numericValue' | 'textValue' | 'booleanValue' | 'remarks',
    value: unknown
  ) {
    setCriteriaValues(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
  }

  async function handleSave() {
    setSaving(true); setError(''); setSaved(false)
    try {
      await saveEnvironmentCriteria(inspection.id, {
        note: note.trim() || undefined,
        criteriaResults: Object.values(criteriaValues).map(c => ({
          inspectionCriterionId: c.criterionId,
          numericValue:  c.numericValue  ?? undefined,
          textValue:     c.textValue     ?? undefined,
          booleanValue:  c.booleanValue  ?? undefined,
          remarks:       c.remarks       ?? undefined,
        })),
      })
      setSaved(true)
      await onSaved()   // reload → cập nhật tổng quan
    } catch (e) {
      setError(getAuthErrorMessage(e, 'Không thể lưu kết quả môi trường.'))
    } finally {
      setSaving(false)
    }
  }

  if (envCriteria.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl">🌿</span>
        <p className="mt-3 text-sm font-semibold text-slate-600">
          Phiên bản tiêu chuẩn này không có tiêu chí môi trường (ENVIRONMENT).
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Kiểm tra lại bộ tiêu chuẩn được chọn ở UC12/UC13.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-800">🌿 Tiêu chí môi trường</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {envCriteria.length} tiêu chí · từ tiêu chuẩn{' '}
            <span className="font-semibold">{inspection.standardCode}</span> v{inspection.versionNo}
          </p>
        </div>
        {!disabled && (
          <button
            disabled={saving}
            onClick={() => void handleSave()}
            className="h-9 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {saving ? 'Đang lưu...' : 'Lưu kết quả'}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          ✓ Đã lưu kết quả môi trường.
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        {envCriteria.map(c => (
          <div key={c.criterionId} className="px-5 py-4">
            <CriterionResultInput
              criterion={criteriaValues[c.criterionId] ?? c}
              disabled={disabled}
              onChange={updateCriterion}
            />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
        <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
          Ghi chú môi trường
        </label>
        <textarea
          disabled={disabled}
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
          placeholder="Nhận xét về điều kiện môi trường..."
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 resize-none"
        />
      </div>
    </div>
  )
}
