import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router'
import AppIcon from '@/components/common/AppIcon'
import { getCropTypes, type CropType } from '@/services/cropTypeService'
import { createInspectionStandard } from '@/services/inspectionStandardService'
import { getAuthErrorMessage } from '@/services/authService'
import { ROUTES } from '@/constants/routes'
import {
  CriterionBlock,
  type CriterionRow,
  type GradeRuleRow,
  ALL_GRADES,
  GRADE_BADGE,
  makeEmptyCriterion,
  makeEmptyGradeRule,
  nextSequentialGrade,
  resetGradeRulesForType,
  buildChecks,
} from '@/components/inspection/CriterionBlock'

const inputCls  = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'
const labelCls  = 'block space-y-1'
const labelText = 'text-[11px] font-bold uppercase tracking-wide text-slate-500'

export default function InspectionStandardsPage() {
  const navigate = useNavigate()
  const formId   = useId()

  const [code, setCode]                   = useState('')
  const [name, setName]                   = useState('')
  const [description, setDescription]     = useState('')
  const [cropTypeId, setCropTypeId]       = useState(0)
  const [effectiveFrom, setEffectiveFrom] = useState('')
  const [criteria, setCriteria]           = useState<CriterionRow[]>([makeEmptyCriterion()])
  const [cropTypes, setCropTypes]         = useState<CropType[]>([])
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState('')
  const [success, setSuccess]             = useState(false)

  useEffect(() => {
    void getCropTypes()
      .then(r => { setCropTypes(r.items); if (r.items[0]) setCropTypeId(r.items[0].id) })
      .catch(() => setError('Không thể tải danh sách loại nông sản.'))
  }, [])

  // ── Criterion row helpers ───────────────────────────────────────────────────
  const updateRow = <K extends keyof CriterionRow>(id: number, key: K, value: CriterionRow[K]) =>
    setCriteria(rows => rows.map(r => r._id === id ? { ...r, [key]: value } : r))

  const toggleExpand = (id: number) =>
    setCriteria(rows => rows.map(r => r._id === id ? { ...r, expanded: !r.expanded } : r))

  const changeDataType = (id: number, dt: string) =>
    setCriteria(rows => rows.map(r => r._id === id
      ? {
          ...r,
          dataType: dt,
          unit: dt !== 'NUMBER' ? '' : r.unit,
          gradeRules: resetGradeRulesForType(dt),
          // BOOLEAN luôn là Nghiêm trọng theo Tiêu chuẩn Nhà nước/Quốc tế
          isCritical: dt === 'BOOLEAN' ? true : r.isCritical,
        }
      : r))

  const addRow    = () => setCriteria(r => [...r, makeEmptyCriterion()])
  const removeRow = (id: number) => setCriteria(r => r.filter(x => x._id !== id))

  // ── Grade rule helpers ──────────────────────────────────────────────────────
  const updateGradeRule = <K extends keyof GradeRuleRow>(
    criterionId: number, ruleId: number, key: K, value: GradeRuleRow[K]
  ) => setCriteria(rows => rows.map(r => r._id !== criterionId ? r : {
    ...r, gradeRules: r.gradeRules.map(g => g._id === ruleId ? { ...g, [key]: value } : g)
  }))

  /** Add the NEXT sequential grade (A→B→C→D→E) */
  const addGradeRule = (criterionId: number) =>
    setCriteria(rows => rows.map(r => {
      if (r._id !== criterionId) return r
      const next = nextSequentialGrade(r.gradeRules)
      if (!next) return r
      return { ...r, gradeRules: [...r.gradeRules, makeEmptyGradeRule(next)] }
    }))

  /** Remove ONLY the last grade rule (enforces sequential constraint) */
  const removeLastGradeRule = (criterionId: number) =>
    setCriteria(rows => rows.map(r => {
      if (r._id !== criterionId || r.gradeRules.length <= 1) return r
      const sorted = [...r.gradeRules].sort(
        (a, b) => ALL_GRADES.indexOf(a.grade as never) - ALL_GRADES.indexOf(b.grade as never)
      )
      const lastId = sorted[sorted.length - 1]._id
      return { ...r, gradeRules: r.gradeRules.filter(g => g._id !== lastId) }
    }))

  // ── Summary & validation ────────────────────────────────────────────────────
  const today  = new Date().toISOString().split('T')[0]
  const checks = [
    { label: 'Mã bộ tiêu chuẩn', ok: code.trim().length > 0 },
    { label: 'Tên bộ tiêu chuẩn', ok: name.trim().length > 0 },
    { label: 'Loại nông sản', ok: cropTypeId > 0 },
    { label: 'Ngày hiệu lực (từ hôm nay trở đi)', ok: effectiveFrom.length > 0 && effectiveFrom >= today },
    ...buildChecks(criteria, effectiveFrom, false),
  ]
  const canSave = checks.every(c => c.ok)

  const criticalCount = criteria.filter(r => r.isCritical).length
  const requiredCount = criteria.filter(r => r.isRequired).length

  // ── Save ────────────────────────────────────────────────────────────────────
  async function save() {
    if (!canSave) { setError('Vui lòng kiểm tra lại các trường bắt buộc.'); return }
    setSaving(true); setError(''); setSuccess(false)
    try {
      await createInspectionStandard({
        cropTypeId,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || undefined,
        versionNo: 1,
        effectiveFrom: effectiveFrom || undefined,
        criteria: criteria.map(r => ({
          code:           r.code.trim().toUpperCase(),
          name:           r.name.trim(),
          criterionGroup: r.criterionGroup,
          dataType:       r.dataType,
          unit:           r.dataType === 'NUMBER' ? (r.unit?.trim() || undefined) : undefined,
          isRequired:     r.isRequired,
          isCritical:     r.isCritical,
          gradeRules: r.gradeRules.map(g => ({
            grade:             g.grade,
            minValue:          r.dataType === 'NUMBER' ? g.minValue : undefined,
            maxValue:          r.dataType === 'NUMBER' ? g.maxValue : undefined,
            requiredTextValue: r.dataType === 'TEXT' ? (g.requiredTextValue?.trim() || undefined) : undefined,
            isFailRule:        g.isFailRule,
          })),
        })),
      })
      setSuccess(true)
      setTimeout(() => navigate(ROUTES.ADMIN_INSPECTION_STANDARDS), 1200)
    } catch (e) {
      setError(getAuthErrorMessage(e, 'Không thể lưu bộ tiêu chuẩn kiểm định.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-24">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Quản trị · Tiêu chuẩn kiểm định</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">Tạo bộ tiêu chuẩn kiểm định</h1>
          <p className="mt-1 text-sm text-slate-500">Thiết lập tiêu chí và quy tắc phân hạng chất lượng nông sản (A → E).</p>
        </div>
        <button onClick={() => navigate(ROUTES.ADMIN_INSPECTION_STANDARDS)}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50">
          Quay lại danh sách
        </button>
      </div>

      {error   && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {success && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">✓ Tạo bộ tiêu chuẩn thành công! Đang chuyển trang...</p>}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">
        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* General info */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <SectionTitle icon="clipboard" title="Thông tin chung" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className={labelCls}>
                <span className={labelText}>Mã bộ tiêu chuẩn *</span>
                <input id={`${formId}-code`} value={code} onChange={e => setCode(e.target.value)}
                  placeholder="VD: STD-RICE-001" className={inputCls} />
              </label>
              <label className={`${labelCls} sm:col-span-2`}>
                <span className={labelText}>Tên bộ tiêu chuẩn *</span>
                <input id={`${formId}-name`} value={name} onChange={e => setName(e.target.value)}
                  placeholder="VD: Tiêu chuẩn gạo Jasmine xuất khẩu" className={inputCls} />
              </label>
              <label className={labelCls}>
                <span className={labelText}>Loại nông sản *</span>
                <select id={`${formId}-cropType`} value={cropTypeId}
                  onChange={e => setCropTypeId(Number(e.target.value))} className={inputCls}>
                  <option value={0}>-- Chọn loại nông sản --</option>
                  {cropTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.name} · {ct.categoryName}</option>)}
                </select>
              </label>
              <label className={labelCls}>
                <span className={labelText}>Ngày hiệu lực <span className="text-rose-500">*</span></span>
                <input id={`${formId}-effectiveFrom`} type="date" value={effectiveFrom} min={today}
                  onChange={e => setEffectiveFrom(e.target.value)} className={inputCls} />
              </label>
            </div>
            <label className="mt-4 block space-y-1">
              <span className={labelText}>Mô tả chi tiết</span>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Mô tả mục đích và phạm vi áp dụng..."
                className="min-h-[80px] w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
            </label>
          </section>

          {/* Grade legend */}
          <div className="flex flex-wrap gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-[11px]">
            <span className="font-bold text-slate-500 mr-1">Hạng chất lượng:</span>
            {ALL_GRADES.map(g => (
              <span key={g} className={`rounded-full border px-2.5 py-0.5 font-bold ${GRADE_BADGE[g]}`}>
                {g}{g === 'A' ? ' (Tốt nhất)' : g === 'E' ? ' (Kém nhất)' : ''}
              </span>
            ))}
            <span className="ml-2 text-rose-500 font-semibold">🔴 Nghiêm trọng + Ngưỡng từ chối = từ chối lô hàng khi vi phạm</span>
          </div>

          {/* Criteria section */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <SectionTitle icon="shield" title={`Tiêu chí kiểm định (${criteria.length})`} />
              <button onClick={addRow}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white hover:bg-emerald-800">
                <AppIcon name="plus" className="size-3" /> Thêm tiêu chí
              </button>
            </div>

            <div className="flex flex-wrap gap-4 border-b border-slate-100 bg-slate-50/60 px-5 py-2 text-[10px] text-slate-500">
              <span><b className="text-blue-600">NUMBER</b> – Đo lường: Min/Max theo từng hạng</span>
              <span><b className="text-violet-600">TEXT</b> – Cảm quan: giá trị chấp nhận theo từng hạng</span>
              <span><b className="text-amber-600">BOOLEAN</b> – Đạt/Không đạt (không cần cấu hình hạng)</span>
              <span className="text-slate-400">Hạng luôn theo thứ tự A→B→C→D→E, không được bỏ hạng giữa</span>
            </div>

            <div className="divide-y divide-slate-100">
              {criteria.map((row, idx) => (
                <CriterionBlock
                  key={row._id}
                  row={row}
                  idx={idx}
                  isLast={criteria.length === 1}
                  onToggleExpand={() => toggleExpand(row._id)}
                  onUpdateRow={(key, val) => updateRow(row._id, key, val)}
                  onChangeDataType={dt => changeDataType(row._id, dt)}
                  onRemoveRow={() => removeRow(row._id)}
                  onUpdateGradeRule={(ruleId, key, val) => updateGradeRule(row._id, ruleId, key, val)}
                  onAddGradeRule={() => addGradeRule(row._id)}
                  onRemoveLastGradeRule={() => removeLastGradeRule(row._id)}
                />
              ))}
            </div>

            <button onClick={addRow}
              className="flex w-full items-center justify-center gap-2 border-t border-slate-100 py-3.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
              <AppIcon name="plus" className="size-4" /> Thêm tiêu chí kiểm định
            </button>
          </section>
        </div>

        {/* ── Right sidebar ────────────────────────────────────────────────── */}
        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-800">Tóm tắt</h2>
            <div className="mt-4 space-y-3">
              <SummaryRow label="Tổng tiêu chí"  value={String(criteria.length).padStart(2,'0')} />
              <SummaryRow label="Bắt buộc"        value={String(requiredCount).padStart(2,'0')} />
              <SummaryRow label="Quan trọng"      value={String(criticalCount).padStart(2,'0')} color="rose" />
              <SummaryRow label="NUMBER"  value={String(criteria.filter(r=>r.dataType==='NUMBER').length).padStart(2,'0')} color="blue" />
              <SummaryRow label="TEXT"    value={String(criteria.filter(r=>r.dataType==='TEXT').length).padStart(2,'0')} color="violet" />
              <SummaryRow label="BOOLEAN" value={String(criteria.filter(r=>r.dataType==='BOOLEAN').length).padStart(2,'0')} color="amber" />
            </div>
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Kiểm tra</p>
              <ul className="mt-3 space-y-1.5">
                {checks.map(c => (
                  <li key={c.label} className={`text-xs ${c.ok ? 'text-emerald-700' : 'text-slate-400'}`}>
                    <span className="mr-1.5">{c.ok ? '✓' : '○'}</span>{c.label}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-bold text-emerald-800">💡 Hướng dẫn phân hạng</p>
            <ul className="mt-2 space-y-1.5 text-xs leading-5 text-emerald-800">
              <li>Hạng phải bắt đầu từ <b>A</b> và liên tục xuống</li>
              <li>Không bắt buộc đủ 5 hạng: {'{A}'}, {'{A,B}'}, {'{A,B,C}'}... đều hợp lệ</li>
              <li>Tiêu chí <b>Nghiêm trọng</b>: sau đó chọn hạng nào là <b className="text-rose-600">ngưỡng từ chối</b> (thường D hoặc E)</li>
              <li className="pt-1 border-t border-emerald-200">Hạng A <b>không được</b> là ngưỡng từ chối</li>
              <li>Khoảng trống giữa ranges → giá trị trong vùng đó tự xếp hạng thấp hơn</li>
            </ul>
          </section>
        </aside>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Phiên bản <b>1</b> sẽ được tạo với trạng thái{' '}
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">Đang áp dụng</span>
          </p>
          <div className="flex gap-3">
            <button onClick={() => navigate(ROUTES.ADMIN_INSPECTION_STANDARDS)}
              className="h-9 rounded-lg border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50">
              Hủy bỏ
            </button>
            <button disabled={saving || !canSave} onClick={() => void save()}
              className="h-9 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
              {saving ? 'Đang lưu...' : 'Tạo bộ tiêu chuẩn'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ icon, title }: { icon: 'clipboard' | 'shield'; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid size-7 place-items-center rounded bg-emerald-50 text-emerald-700">
        <AppIcon name={icon} className="size-4" />
      </span>
      <h2 className="text-sm font-bold text-slate-800">{title}</h2>
    </div>
  )
}

function SummaryRow({ label, value, color = 'slate' }: {
  label: string; value: string; color?: 'slate' | 'rose' | 'blue' | 'violet' | 'amber'
}) {
  const cls = { slate: 'text-slate-900', rose: 'text-rose-600', blue: 'text-blue-600', violet: 'text-violet-600', amber: 'text-amber-600' }
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <b className={cls[color]}>{value}</b>
    </div>
  )
}
