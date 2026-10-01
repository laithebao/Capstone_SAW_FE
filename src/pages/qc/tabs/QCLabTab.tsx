import { useState } from 'react'
import { getAuthErrorMessage } from '@/services/authService'
import { CriterionResultInput } from '@/components/inspection/QcSharedComponents'
import type {
  QcInspectionDetailDto,
  SaveLabResultRequest,
  SaveCriterionResultRequest,
  CriterionResultDto,
} from '@/types/inspection'

interface Props {
  inspection: QcInspectionDetailDto
  disabled: boolean
  onSaved: () => Promise<void>
  buildCriteriaResults: () => SaveCriterionResultRequest[]
  saveLabResult: (id: number, req: SaveLabResultRequest) => Promise<void>
}

export default function QCLabTab({
  inspection,
  disabled,
  onSaved,
  saveLabResult,
}: Props) {
  const labCriteria = inspection.criteriaResults.filter(
    c => c.criterionGroup === 'LAB'
  )

  const [criteriaValues, setCriteriaValues] = useState<Record<number, CriterionResultDto>>(
    () => Object.fromEntries(labCriteria.map(c => [c.criterionId, { ...c }]))
  )

  const [note,   setNote]   = useState(inspection.labResult?.note ?? '')
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
      await saveLabResult(inspection.id, {
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
      await onSaved()
    } catch (e) {
      setError(getAuthErrorMessage(e, 'Không thể lưu kết quả phòng lab.'))
    } finally {
      setSaving(false)
    }
  }

  if (labCriteria.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl">🧪</span>
        <p className="mt-3 text-sm font-semibold text-slate-600">
          Phiên bản tiêu chuẩn này không có tiêu chí phòng lab (LAB).
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Kiểm tra lại bộ tiêu chuẩn được chọn ở UC12/UC13.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-800">
            🧪 Tiêu chí phòng lab
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {labCriteria.length} tiêu chí · từ tiêu chuẩn{' '}
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
          ✓ Đã lưu kết quả phòng lab.
        </div>
      )}

      {/* Dynamic criteria list */}
      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        {labCriteria.map(c => (
          <div key={c.criterionId} className="px-5 py-4">
            <CriterionResultInput
              criterion={criteriaValues[c.criterionId] ?? c}
              disabled={disabled}
              onChange={updateCriterion}
            />
          </div>
        ))}
      </div>

      {/* Optional note */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
        <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
          Ghi chú phòng lab
        </label>
        <textarea
          disabled={disabled}
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
          placeholder="Nhận xét kết quả kiểm nghiệm phòng lab..."
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 resize-none"
        />
      </div>
    </div>
  )
}
