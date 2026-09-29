/**
 * Shared CriterionBlock component for UC12 and UC13.
 * Enforces sequential grade rules: A → B → C → D → E (no skipping, no reordering).
 */
import type { GradeRuleRequest } from '@/services/inspectionStandardService'

// ── Constants ──────────────────────────────────────────────────────────────────
export const DATA_TYPES  = ['NUMBER', 'TEXT', 'BOOLEAN'] as const
export const GROUPS      = ['SENSORY', 'LAB', 'ENVIRONMENT'] as const
export const ALL_GRADES  = ['A', 'B', 'C', 'D', 'E'] as const
export type Grade = 'A' | 'B' | 'C' | 'D' | 'E'

export const GRADE_COLORS: Record<Grade, string> = {
  A: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  B: 'bg-sky-50 text-sky-700 border-sky-200',
  C: 'bg-amber-50 text-amber-700 border-amber-200',
  D: 'bg-orange-50 text-orange-700 border-orange-200',
  E: 'bg-rose-50 text-rose-700 border-rose-200',
}
export const GRADE_BADGE: Record<Grade, string> = {
  A: 'bg-emerald-100 text-emerald-800',
  B: 'bg-sky-100 text-sky-800',
  C: 'bg-amber-100 text-amber-800',
  D: 'bg-orange-100 text-orange-800',
  E: 'bg-rose-100 text-rose-800',
}

// ── Local types ────────────────────────────────────────────────────────────────
export interface GradeRuleRow extends GradeRuleRequest { _id: number }

export interface CriterionRow {
  _id: number
  code: string
  name: string
  criterionGroup: string
  dataType: string
  unit: string
  isRequired: boolean
  isCritical: boolean
  gradeRules: GradeRuleRow[]
  expanded: boolean
}

// ── UID generator ──────────────────────────────────────────────────────────────
let _uid = 1
export const uid = () => _uid++

export function makeEmptyGradeRule(grade: Grade): GradeRuleRow {
  return { _id: uid(), grade, minValue: undefined, maxValue: undefined, requiredTextValue: '', isFailRule: false }
}

export function makeEmptyCriterion(): CriterionRow {
  return {
    _id: uid(), code: '', name: '', criterionGroup: 'SENSORY',
    dataType: 'NUMBER', unit: '', isRequired: true, isCritical: false,
    gradeRules: [makeEmptyGradeRule('A')],
    expanded: true,
  }
}

/** When dataType changes → reset grade rules to sensible default */
export function resetGradeRulesForType(dataType: string): GradeRuleRow[] {
  if (dataType === 'BOOLEAN') return []
  return [makeEmptyGradeRule('A')]
}

/**
 * Returns the next sequential grade after the current last grade.
 * E.g. if rows are [A, B, C] → returns 'D'.  If all 5 used → returns null.
 */
export function nextSequentialGrade(gradeRules: GradeRuleRow[]): Grade | null {
  const used = new Set(gradeRules.map(r => r.grade))
  return ALL_GRADES.find(g => !used.has(g)) ?? null
}

// ── Range overlap detection (mirrors backend Rule 13) ────────────────────────
interface RangeInfo { grade: Grade; min?: number; max?: number }

/** Returns a description of the first overlap found, or null if clean. */
export function detectOverlap(rules: GradeRuleRow[]): string | null {
  const ranges: RangeInfo[] = rules
    .filter(r => r.minValue != null || r.maxValue != null)
    .map(r => ({ grade: r.grade as Grade, min: r.minValue, max: r.maxValue }))

  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      const ri = ranges[i]
      const rj = ranges[j]
      const riMin = ri.min ?? -Infinity
      const riMax = ri.max ?? Infinity
      const rjMin = rj.min ?? -Infinity
      const rjMax = rj.max ?? Infinity
      if (riMax >= rjMin && rjMax >= riMin)
        return `Hạng ${ri.grade} và hạng ${rj.grade} chồng lấp nhau`
    }
  }
  return null
}

/**
 * Returns a human-readable continuity description for a criterion's grade rules.
 * Used for the indicator text below the grade rules table.
 */
export function describeRangeContinuity(rules: GradeRuleRow[]): {
  status: 'ok' | 'gap' | 'open-ended'
  message: string
} {
  if (rules.length === 0) return { status: 'ok', message: '' }

  const sorted = [...rules].sort((a, b) =>
    ALL_GRADES.indexOf(a.grade as Grade) - ALL_GRADES.indexOf(b.grade as Grade))

  // Check if last grade has no MaxValue → open-ended (covers everything above min)
  const lastRule = sorted[sorted.length - 1]
  const openEnded = !lastRule.maxValue

  // Detect gaps between consecutive rules (when both have defined boundaries)
  const gaps: string[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i]
    const next = sorted[i + 1]
    if (curr.maxValue != null && next.minValue != null && next.minValue > curr.maxValue + 0.001) {
      gaps.push(`${curr.maxValue}–${next.minValue} (hạng ${curr.grade}→${next.grade})`)
    }
  }

  if (gaps.length > 0) {
    return {
      status: 'gap',
      message: `⚠️ Khoảng trống: ${gaps.join(', ')} — giá trị trong vùng này sẽ tự động xếp hạng thấp hơn liền kề.`,
    }
  }

  if (openEnded) {
    return {
      status: 'open-ended',
      message: `✅ Hạng ${lastRule.grade} không có Max → bao phủ mọi giá trị vượt hơn Min.`,
    }
  }

  return { status: 'ok', message: `✅ Các khoảng giá trị liên tục, không có khoảng trống.` }
}

// ── Shared validation logic (mirrors backend) ────────────────────────────────
export function buildChecks(criteria: CriterionRow[], effectiveFrom: string, requireEffectiveFrom: boolean) {
  const today = new Date().toISOString().split('T')[0]
  return [
    ...(requireEffectiveFrom
      ? [{ label: 'Ngày hiệu lực (từ hôm nay trở đi)', ok: effectiveFrom.length > 0 && effectiveFrom >= today }]
      : []),
    { label: 'Có ít nhất 1 tiêu chí', ok: criteria.length > 0 },
    { label: 'Tất cả tiêu chí có mã & tên', ok: criteria.every(r => r.code.trim() && r.name.trim()) },
    {
      label: 'Mã tiêu chí không trùng nhau',
      ok: (() => {
        const codes = criteria.map(r => r.code.trim().toUpperCase()).filter(Boolean)
        return codes.length === new Set(codes).size
      })(),
    },
    {
      label: 'Tiêu chí NUMBER/TEXT có ít nhất 1 grade rule',
      ok: criteria.every(r => r.dataType === 'BOOLEAN' || r.gradeRules.length > 0),
    },
    {
      label: 'Hạng bắt đầu từ A và liên tục (A→B→C, không bỏ hạng giữa)',
      ok: criteria.every(r => {
        if (r.dataType === 'BOOLEAN' || r.gradeRules.length === 0) return true
        const sorted = [...r.gradeRules]
          .map(g => g.grade)
          .sort((a, b) => ALL_GRADES.indexOf(a as Grade) - ALL_GRADES.indexOf(b as Grade))
        if (sorted[0] !== 'A') return false
        for (let i = 0; i < sorted.length; i++) {
          if (sorted[i] !== ALL_GRADES[i]) return false
        }
        return true
      }),
    },
    {
      label: 'Tiêu chí NUMBER: khoảng giá trị không chồng lấp',
      ok: criteria.every(r =>
        r.dataType !== 'NUMBER' || r.gradeRules.length <= 1 || detectOverlap(r.gradeRules) === null
      ),
    },
    {
      label: 'Tiêu chí NUMBER: có Min hoặc Max ở mỗi grade',
      ok: criteria.every(r =>
        r.dataType !== 'NUMBER' ||
        r.gradeRules.every(g => g.minValue != null || g.maxValue != null)
      ),
    },
    {
      label: 'Tiêu chí NUMBER: Min ≤ Max ở mỗi grade',
      ok: criteria.every(r =>
        r.dataType !== 'NUMBER' ||
        r.gradeRules.every(g => !(g.minValue != null && g.maxValue != null && g.minValue > g.maxValue))
      ),
    },
    {
      label: 'Tiêu chí TEXT: nhập giá trị chấp nhận ở mỗi grade',
      ok: criteria.every(r =>
        r.dataType !== 'TEXT' ||
        r.gradeRules.every(g => (g.requiredTextValue ?? '').trim().length > 0)
      ),
    },
    {
      label: 'Tiêu chí Nghiêm trọng (NUMBER/TEXT) phải có ngưỡng từ chối',
      ok: criteria.every(r => r.dataType === 'BOOLEAN' || !r.isCritical || r.gradeRules.some(g => g.isFailRule)),
    },
    {
      label: 'Ngưỡng từ chối chỉ được đặt khi tiêu chí là Nghiêm trọng',
      ok: criteria.every(r => r.isCritical || !r.gradeRules.some(g => g.isFailRule)),
    },
    {
      label: 'Hạng A không được là ngưỡng từ chối',
      ok: criteria.every(r => !r.gradeRules.some(g => g.grade === 'A' && g.isFailRule)),
    },
    {
      label: 'BOOLEAN phải là Nghiêm trọng (Tiêu chuẩn Nhà nước/Quốc tế)',
      ok: criteria.every(r => r.dataType !== 'BOOLEAN' || r.isCritical),
    },
    {
      label: 'Ngưỡng từ chối cascade: hạng tệ hơn cũng phải là ngưỡng từ chối',
      ok: criteria.every(r => {
        if (r.dataType === 'BOOLEAN' || r.gradeRules.length === 0) return true
        const failIndexes = r.gradeRules
          .filter(g => g.isFailRule)
          .map(g => ALL_GRADES.indexOf(g.grade as Grade))
        if (failIndexes.length === 0) return true
        const firstFail = Math.min(...failIndexes)
        // Tất cả hạng được định nghĩa sau firstFail phải là fail rule
        return r.gradeRules.every(g => {
          const idx = ALL_GRADES.indexOf(g.grade as Grade)
          return idx <= firstFail || g.isFailRule
        })
      }),
    },
  ]
}

// ── Cascade helper (mirrors backend Rule 14) ────────────────────────────────
/** Returns true if this grade is auto-cascaded (a worse grade exists that is a fail rule before it). */
export function isCascadedFailRule(grade: Grade, gradeRules: GradeRuleRow[]): boolean {
  const gradeIdx = ALL_GRADES.indexOf(grade)
  // Is there any fail-rule grade BEFORE this one (i.e., better grade that already triggers)?
  return gradeRules.some(r => r.isFailRule && ALL_GRADES.indexOf(r.grade as Grade) < gradeIdx)
}

// ── CriterionBlock ─────────────────────────────────────────────────────────────
interface CriterionBlockProps {
  row: CriterionRow
  idx: number
  isLast: boolean
  onToggleExpand: () => void
  onUpdateRow: <K extends keyof CriterionRow>(key: K, val: CriterionRow[K]) => void
  onChangeDataType: (dt: string) => void
  onRemoveRow: () => void
  onUpdateGradeRule: <K extends keyof GradeRuleRow>(ruleId: number, key: K, val: GradeRuleRow[K]) => void
  onAddGradeRule: () => void       // always adds the NEXT sequential grade
  onRemoveLastGradeRule: () => void // only allows removing the last grade
}

export function CriterionBlock({
  row, idx, isLast,
  onToggleExpand, onUpdateRow, onChangeDataType, onRemoveRow,
  onUpdateGradeRule, onAddGradeRule, onRemoveLastGradeRule,
}: CriterionBlockProps) {
  const hasFailRule   = row.gradeRules.some(g => g.isFailRule)
  const nextGrade     = nextSequentialGrade(row.gradeRules)
  const canAddGrade   = row.dataType !== 'BOOLEAN' && nextGrade !== null
  const overlapError  = row.dataType === 'NUMBER' ? detectOverlap(row.gradeRules) : null
  const continuity    = row.dataType === 'NUMBER' && row.gradeRules.length > 0
    ? describeRangeContinuity(row.gradeRules)
    : null

  // Sorted grade rules always displayed in order A → B → C → D → E
  const sortedRules = [...row.gradeRules].sort(
    (a, b) => ALL_GRADES.indexOf(a.grade as Grade) - ALL_GRADES.indexOf(b.grade as Grade)
  )
  const lastGrade = sortedRules[sortedRules.length - 1]

  return (
    <div>
      {/* ── Main row ── */}
      <div className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50/60">
        {/* Index */}
        <span className="w-6 shrink-0 text-center text-xs text-slate-400">{idx + 1}</span>

        {/* Expand toggle */}
        <button
          onClick={onToggleExpand}
          className="shrink-0 grid size-6 place-items-center rounded text-slate-400 hover:bg-slate-100"
          title={row.expanded ? 'Thu gọn' : 'Mở rộng cấu hình grade'}>
          <span className={`text-xs transition-transform duration-200 ${row.expanded ? 'rotate-90' : ''}`}>▶</span>
        </button>

        {/* Code */}
        <input value={row.code} onChange={e => onUpdateRow('code', e.target.value)}
          placeholder="Mã (VD: MC)"
          className="h-8 w-24 rounded border border-transparent bg-transparent px-2 text-xs font-mono uppercase focus:border-emerald-300 focus:bg-white focus:outline-none" />

        {/* Name */}
        <input value={row.name} onChange={e => onUpdateRow('name', e.target.value)}
          placeholder="Tên tiêu chí"
          className="h-8 min-w-[130px] flex-1 rounded border border-transparent bg-transparent px-2 text-xs focus:border-emerald-300 focus:bg-white focus:outline-none" />

        {/* Group */}
        <select value={row.criterionGroup} onChange={e => onUpdateRow('criterionGroup', e.target.value)}
          className="h-8 rounded border-0 bg-transparent text-xs text-slate-600">
          {GROUPS.map(g => <option key={g}>{g}</option>)}
        </select>

        {/* DataType */}
        <select value={row.dataType} onChange={e => onChangeDataType(e.target.value)}
          className={`h-8 rounded border-0 bg-transparent text-xs font-semibold ${
            row.dataType === 'NUMBER' ? 'text-blue-600' :
            row.dataType === 'TEXT'   ? 'text-violet-600' : 'text-amber-600'
          }`}>
          {DATA_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>

        {/* Unit (NUMBER only) */}
        {row.dataType === 'NUMBER' && (
          <input value={row.unit} onChange={e => onUpdateRow('unit', e.target.value)}
            placeholder="Đơn vị"
            className="h-8 w-16 rounded border border-slate-200 bg-white px-2 text-xs text-slate-600 focus:border-emerald-400 focus:outline-none" />
        )}

        {/* Grade badges (compact summary) */}
        {row.dataType !== 'BOOLEAN' ? (
          <div className="flex gap-1">
            {sortedRules.map(g => (
              <span key={g.grade}
                className={`rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${GRADE_COLORS[g.grade as Grade]}
                  ${row.isCritical && g.isFailRule ? 'ring-1 ring-rose-400' : ''}`}>
                {/* Chỉ hiện 🔴 khi cả 2 điều kiện: Nghiêm trọng + ngưỡng từ chối */}
                {g.grade}{row.isCritical && g.isFailRule ? '🔴' : ''}
              </span>
            ))}
          </div>
        ) : (
          // BOOLEAN: không có hạng, luôn là Nghiêm trọng, hiển thị rõ hậu quả
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600 border border-rose-200">
            🔴 Không đạt → Từ chối lô
          </span>
        )}

        {/* IsRequired */}
        <label className="flex items-center gap-1 text-[10px] text-slate-500">
          <input type="checkbox" checked={row.isRequired}
            onChange={e => onUpdateRow('isRequired', e.target.checked)}
            className="size-3.5 accent-emerald-600" />
          Bắt buộc
        </label>

        {/* IsCritical — khoá khi BOOLEAN */}
        {row.dataType === 'BOOLEAN' ? (
          <span
            className="flex items-center gap-1 text-[10px] font-semibold text-rose-600 cursor-not-allowed"
            title="Tiêu chí Không đạt tự động Từ chối lô">
            <input type="checkbox" checked disabled className="size-3.5 accent-rose-600 opacity-60" />
            🔴 Nghiêm trọng
          </span>
        ) : (
          <label className={`flex items-center gap-1 text-[10px] font-semibold ${row.isCritical ? 'text-rose-600' : 'text-slate-500'}`}>
            <input type="checkbox" checked={row.isCritical}
              onChange={e => {
                // Khi tắt Nghiêm trọng → tự động xoá tất cả ngưỡng từ chối đã đặt
                if (!e.target.checked) {
                  row.gradeRules.forEach(g => {
                    if (g.isFailRule) onUpdateGradeRule(g._id, 'isFailRule', false)
                  })
                }
                onUpdateRow('isCritical', e.target.checked)
              }}
              className="size-3.5 accent-rose-600" />
            {row.isCritical ? '🔴 Nghiêm trọng (từ chối lô nếu vi phạm ngưỡng)' : 'Nghiêm trọng'}
          </label>
        )}

        {/* Warning: Nghiêm trọng bật nhưng chưa có ngưỡng từ chối (chỉ NUMBER/TEXT) */}
        {row.isCritical && row.dataType !== 'BOOLEAN' && !hasFailRule && (
          <span className="text-[10px] text-rose-500 font-medium">⚠ Chưa đặt ngưỡng từ chối!</span>
        )}
        {overlapError && (
          <span className="text-[10px] text-red-600 font-medium" title={overlapError}>🔴 Overlap!</span>
        )}

        {/* Delete row */}
        <button onClick={onRemoveRow} disabled={isLast}
          className="ml-auto h-7 w-10 rounded-md bg-rose-500 text-[10px] font-bold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400">
          Xóa
        </button>
      </div>

      {/* ── Expanded grade rules panel ── */}
      {row.expanded && row.dataType !== 'BOOLEAN' && (
        <div className="mx-4 mb-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Quy tắc phân hạng
              {row.dataType === 'NUMBER' && ' — nhập Min / Max theo từng hạng'}
              {row.dataType === 'TEXT' && ' — nhập giá trị chấp nhận theo từng hạng'}
            </p>
            <div className="flex items-center gap-2">
              {/* Remove LAST grade only */}
              {row.gradeRules.length > 1 && (
                <button onClick={onRemoveLastGradeRule}
                  className="inline-flex h-6 items-center gap-1 rounded bg-rose-50 border border-rose-200 px-2 text-[10px] font-bold text-rose-600 hover:bg-rose-100"
                  title={`Xóa hạng ${lastGrade?.grade} (hạng cuối)`}>
                  − Xóa hạng {lastGrade?.grade}
                </button>
              )}
              {/* Add NEXT sequential grade */}
              {canAddGrade && (
                <button onClick={onAddGradeRule}
                  className="inline-flex h-6 items-center gap-1 rounded bg-slate-100 px-2 text-[10px] font-bold text-slate-600 hover:bg-emerald-100 hover:text-emerald-700">
                  + Thêm hạng {nextGrade}
                </button>
              )}
              {!canAddGrade && row.gradeRules.length === 5 && (
                <span className="text-[10px] text-slate-400 italic">Đủ 5 hạng A → E</span>
              )}
            </div>
          </div>

          {/* Overlap error banner */}
          {overlapError && (
            <div className="border-b border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] text-rose-700 font-medium">
              🔴 {overlapError} — vui lòng điều chỉnh lại khoảng Min/Max để không chồng lấp.
            </div>
          )}

          {/* Grade rules table */}
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-white text-[10px] font-bold uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2 text-left w-16">Hạng</th>
                {row.dataType === 'NUMBER' && <>
                  <th className="px-3 py-2 text-left">Min</th>
                  <th className="px-3 py-2 text-left">Max</th>
                </>}
                {row.dataType === 'TEXT' && (
                  <th className="px-3 py-2 text-left">Giá trị chấp nhận</th>
                )}
                <th className="px-3 py-2 text-center w-44">
                  <span className="text-rose-400">🔴 Ngưỡng từ chối</span>
                  {!row.isCritical && (
                    <div className="mt-0.5 text-[9px] font-normal text-slate-400 normal-case tracking-normal">
                      (bật &ldquo;Nghiêm trọng&rdquo; để kích hoạt)
                    </div>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRules.map(rule => (
                <tr key={rule._id}
                  className={`${row.isCritical && rule.isFailRule ? 'bg-rose-50/50' : 'bg-white'}`}>
                  {/* Grade — static badge (no dropdown) */}
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded border px-2 py-1 text-xs font-bold ${GRADE_COLORS[rule.grade as Grade]}`}>
                      {rule.grade}
                      {rule.grade === 'A' && <span className="ml-1 text-[9px] font-normal opacity-60">tốt nhất</span>}
                      {rule.grade === 'E' && <span className="ml-1 text-[9px] font-normal opacity-60">kém nhất</span>}
                    </span>
                  </td>

                  {/* NUMBER: Min / Max */}
                  {row.dataType === 'NUMBER' && <>
                    <td className="px-3 py-2">
                      <input type="number" step="any" value={rule.minValue ?? ''}
                        onChange={e => onUpdateGradeRule(rule._id, 'minValue',
                          e.target.value !== '' ? Number(e.target.value) : undefined)}
                        placeholder="∅ (không giới hạn)"
                        className="h-7 w-32 rounded border border-slate-200 bg-white px-2 text-xs focus:border-emerald-400 focus:outline-none" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" step="any" value={rule.maxValue ?? ''}
                        onChange={e => onUpdateGradeRule(rule._id, 'maxValue',
                          e.target.value !== '' ? Number(e.target.value) : undefined)}
                        placeholder="∅ (không giới hạn)"
                        className="h-7 w-32 rounded border border-slate-200 bg-white px-2 text-xs focus:border-emerald-400 focus:outline-none" />
                    </td>
                  </>}

                  {/* TEXT: RequiredTextValue */}
                  {row.dataType === 'TEXT' && (
                    <td className="px-3 py-2">
                      <input value={rule.requiredTextValue ?? ''}
                        onChange={e => onUpdateGradeRule(rule._id, 'requiredTextValue', e.target.value)}
                        placeholder="VD: XANH_TUOI, đỏ tươi..."
                        className="h-7 w-full min-w-[200px] rounded border border-slate-200 bg-white px-2 text-xs focus:border-violet-400 focus:outline-none" />
                    </td>
                  )}

                  {/* Ngưỡng từ chối: chỉ khả dụng khi IsCritical = true */}
                  <td className="px-3 py-2 text-center">
                    {rule.grade === 'A' ? (
                      // Hạng A luôn bị khoá: vô nghĩa nghiệp vụ
                      <span className="text-[9px] text-slate-300 italic">Hạng tốt nhất, không áp dụng</span>
                    ) : !row.isCritical ? (
                      // Tiêu chí không Nghiêm trọng: khoá toàn bộ, giải thích rõ
                      <span
                        className="text-[9px] text-slate-300 italic cursor-not-allowed"
                        title="Bật 'Nghiêm trọng' trên tiêu chí này để có thể đặt ngưỡng từ chối">
                        — (cần bật Nghiêm trọng)
                      </span>
                    ) : isCascadedFailRule(rule.grade as Grade, row.gradeRules) ? (
                      // Hạng bị cascade: hiển thị locked, state đã được cập nhật bởi onChange của hạng đầu tiên
                      <label className="inline-flex flex-col items-center gap-0.5 cursor-not-allowed"
                        title="Tự động từ chối vì hạng tốt hơn đã là ngưỡng từ chối">
                        <input type="checkbox" checked disabled className="size-4 accent-rose-600 opacity-60" />
                        <span className="text-[9px] font-semibold text-rose-400">→ Từ chối lô</span>
                      </label>
                    ) : (
                      // Hạng chưa bị cascade: cho phép chọn
                      <label className="inline-flex flex-col items-center gap-0.5">
                        <input type="checkbox" checked={rule.isFailRule}
                          onChange={e => {
                            const checked = e.target.checked
                            // Cập nhật hạng hiện tại
                            onUpdateGradeRule(rule._id, 'isFailRule', checked)
                            // CASCADE: cập nhật tất cả hạng tệ hơn vào state
                            const ruleIdx = ALL_GRADES.indexOf(rule.grade as Grade)
                            sortedRules.forEach(r => {
                              if (ALL_GRADES.indexOf(r.grade as Grade) > ruleIdx) {
                                onUpdateGradeRule(r._id, 'isFailRule', checked)
                              }
                            })
                          }}
                          className="size-4 accent-rose-600" />
                        <span className={`text-[9px] font-semibold ${
                          rule.isFailRule ? 'text-rose-600' : 'text-slate-400'
                        }`}>
                          {rule.isFailRule ? '→ Từ chối lô' : 'Không từ chối'}
                        </span>
                      </label>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Continuity indicator (NUMBER only) */}
          {continuity && continuity.message && (
            <>
              <div className={`px-3 py-2 text-[10px] border-t ${
                continuity.status === 'gap' ? 'text-amber-700 bg-amber-50 border-amber-100' :
                continuity.status === 'open-ended' ? 'text-sky-700 bg-sky-50 border-sky-100' :
                'text-emerald-700 bg-emerald-50 border-emerald-100'
              }`}>
                {continuity.message}
              </div>

              {/* Gap fallback warning — giải thích rõ hành vi khi có khoảng trắng */}
              {continuity.status === 'gap' && row.dataType === 'NUMBER' && (
                <div className="px-3 py-2 text-[10px] border-t border-amber-200 bg-amber-100 text-amber-900 font-medium">
                  ℹ️ <strong>Lưu ý:</strong> Khi QC nhập giá trị rơi vào khoảng trắng giữa 2 hạng,{' '}
                  hệ thống sẽ <strong>tự động xếp vào hạng liền kề tệ hơn</strong>.{' '}
                  Ví dụ: A là 7–8, B là 5–6, giá trị 6.5 sẽ bị xếp vào Hạng B.{' '}
                  Nếu muốn tránh, hãy điền kín khoảng giữa các hạng.
                </div>
              )}
            </>
          )}

          {/* Grade sequencing hint */}
          <div className="flex items-center gap-2 border-t border-slate-100 px-3 py-1.5 bg-white">
            <span className="text-[10px] text-slate-400">Thứ tự hạng:</span>
            {ALL_GRADES.map((g, i) => {
              const isUsed = row.gradeRules.some(r => r.grade === g)
              const isNext = g === nextGrade
              return (
                <span key={g} className="flex items-center gap-1">
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold border ${
                    isUsed ? GRADE_COLORS[g] :
                    isNext ? 'bg-slate-100 text-slate-400 border-dashed border-slate-300' :
                    'text-slate-200 border-slate-100'
                  }`}>
                    {g}
                  </span>
                  {i < 4 && <span className="text-[9px] text-slate-300">→</span>}
                </span>
              )
            })}
            <span className="ml-2 text-[10px] text-slate-400 italic">
              {nextGrade ? `Tiếp theo: thêm hạng ${nextGrade}` : 'Đã đủ 5 hạng'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
