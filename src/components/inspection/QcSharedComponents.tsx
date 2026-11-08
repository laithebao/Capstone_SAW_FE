// Shared QC helper components: status/grade badges, criterion input

import type { CriterionResultDto } from '@/types/inspection'

// ── Grade badge ───────────────────────────────────────────────────────────────

const GRADE_META: Record<string, { label: string; cls: string }> = {
  A: { label: 'Hạng A · Tốt nhất', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  B: { label: 'Hạng B · Tốt',      cls: 'bg-sky-100 text-sky-800 border-sky-200' },
  C: { label: 'Hạng C · Trung bình', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  D: { label: 'Hạng D · Yếu',      cls: 'bg-orange-100 text-orange-800 border-orange-200' },
  E: { label: 'Hạng E · Kém nhất', cls: 'bg-rose-100 text-rose-800 border-rose-200' },
}

export function GradeEvaluationBadge({ grade }: { grade: string | null | undefined }) {
  if (!grade) return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">
      —
    </span>
  )

  const meta = GRADE_META[grade]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${meta?.cls ?? 'bg-slate-100 text-slate-800'}`}>
      {grade}
    </span>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

type InspectionStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED'
type QcResult = 'PASS' | 'FAIL' | null

const STATUS_META: Record<InspectionStatus, { label: string; cls: string }> = {
  DRAFT:       { label: 'Nháp',          cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  IN_PROGRESS: { label: 'Đang kiểm định', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  COMPLETED:   { label: 'Đã hoàn thành', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
}

export function QcStatusBadge({ status }: { status: InspectionStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${meta.cls}`}>
      {meta.label}
    </span>
  )
}

export function QcResultBadge({ result }: { result: QcResult }) {
  if (!result) return null
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
      result === 'PASS'
        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
        : 'bg-rose-100 text-rose-800 border-rose-200'
    }`}>
      {result === 'PASS' ? '✓ ĐẠT' : '✕ BỊ TỪ CHỐI'}
    </span>
  )
}

// ── Criterion result input ────────────────────────────────────────────────────

interface CriterionResultInputProps {
  criterion: CriterionResultDto
  disabled?: boolean
  onChange: (id: number, field: 'numericValue' | 'textValue' | 'booleanValue' | 'remarks', value: unknown) => void
}

const inputCls = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50'

export function CriterionResultInput({
  criterion,
  disabled = false,
  onChange,
}: CriterionResultInputProps) {
  const { dataType, unit, criterionCode, criterionName, criterionGroup, isCritical, isRequired } = criterion

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-700">{criterionCode}</span>
        <span className="text-xs text-slate-500">{criterionName}</span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
          criterionGroup === 'SENSORY' ? 'bg-violet-50 text-violet-700' :
          criterionGroup === 'LAB'     ? 'bg-blue-50 text-blue-700' :
                                        'bg-teal-50 text-teal-700'
        }`}>{criterionGroup}</span>
        {isCritical && (
          <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
            Nghiêm trọng
          </span>
        )}
        {isRequired && (
          <span className="text-[10px] text-rose-500">*</span>
        )}
      </div>

      {/* BOOLEAN — Pass/Fail gate only (not graded) */}
      {dataType === 'BOOLEAN' && (
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`bool-${criterion.criterionId}`}
              disabled={disabled}
              checked={criterion.booleanValue === true}
              onChange={() => onChange(criterion.criterionId, 'booleanValue', true)}
              className="accent-emerald-600"
            />
            <span className="text-sm text-emerald-700 font-semibold">✓ Đạt (Detected/Compliant)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`bool-${criterion.criterionId}`}
              disabled={disabled}
              checked={criterion.booleanValue === false}
              onChange={() => onChange(criterion.criterionId, 'booleanValue', false)}
              className="accent-rose-600"
            />
            <span className="text-sm text-rose-700 font-semibold">✕ Không đạt (Not Detected/Fail)</span>
          </label>
          <span className="text-[10px] text-slate-400 italic ml-2">
            ⚠ Cổng Pass/Fail — không tham gia xếp hạng A-E
          </span>
        </div>
      )}

      {/* NUMBER */}
      {dataType === 'NUMBER' && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            disabled={disabled}
            value={criterion.numericValue ?? ''}
            onChange={e => onChange(criterion.criterionId, 'numericValue',
              e.target.value === '' ? undefined : Number(e.target.value))}
            className={`${inputCls} max-w-[200px]`}
            placeholder="Nhập giá trị số..."
            step="any"
          />
          {unit && <span className="text-sm text-slate-500 font-medium">{unit}</span>}
          {criterion.evaluatedGrade && (
            <GradeEvaluationBadge grade={criterion.evaluatedGrade} />
          )}
        </div>
      )}

      {/* TEXT */}
      {dataType === 'TEXT' && (
        <div className="flex items-center gap-2">
          <select
            disabled={disabled}
            value={criterion.textValue ?? ''}
            onChange={e => onChange(criterion.criterionId, 'textValue', e.target.value || undefined)}
            className={`${inputCls} max-w-[300px]`}
          >
            <option value="">— Chọn giá trị —</option>
            {criterion.gradeRules.map(r => (
              <option key={r.grade} value={r.requiredTextValue ?? ''}>
                [{r.grade}] {r.requiredTextValue}
                {r.isFailRule ? ' (Từ chối)' : ''}
              </option>
            ))}
          </select>
          {criterion.evaluatedGrade && (
            <GradeEvaluationBadge grade={criterion.evaluatedGrade} />
          )}
        </div>
      )}

      {/* Remarks */}
      <input
        type="text"
        disabled={disabled}
        value={criterion.remarks ?? ''}
        onChange={e => onChange(criterion.criterionId, 'remarks', e.target.value || undefined)}
        placeholder="Ghi chú (tùy chọn)..."
        className={`${inputCls} text-xs text-slate-500`}
      />
    </div>
  )
}
