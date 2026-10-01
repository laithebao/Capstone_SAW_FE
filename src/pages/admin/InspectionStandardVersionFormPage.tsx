import { useEffect, useId, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import AppIcon from '@/components/common/AppIcon'
import {
  getInspectionStandard,
  createInspectionStandardVersion,
  type InspectionStandardDetail,
  type CriterionDto,
} from '@/services/inspectionStandardService'
import { getAuthErrorMessage } from '@/services/authService'
import { ROUTES } from '@/constants/routes'
import {
  CriterionBlock,
  type CriterionRow,
  type GradeRuleRow,
  ALL_GRADES,
  makeEmptyCriterion,
  makeEmptyGradeRule,
  nextSequentialGrade,
  resetGradeRulesForType,
  buildChecks,
  uid,
} from '@/components/inspection/CriterionBlock'

const inputCls = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'

/** Pre-fill a CriterionRow from an existing CriterionDto (previous version data) */
function rowFromDto(c: CriterionDto): CriterionRow {
  const gradeRules: GradeRuleRow[] = c.gradeRules
    // Sort by grade order before mapping
    .slice()
    .sort((a, b) => ALL_GRADES.indexOf(a.grade as never) - ALL_GRADES.indexOf(b.grade as never))
    .map(r => ({
      _id:               uid(),
      grade:             r.grade,
      minValue:          r.minValue ?? undefined,
      maxValue:          r.maxValue ?? undefined,
      requiredTextValue: r.requiredTextValue ?? '',
      isFailRule:        r.isFailRule,
    }))

  return {
    _id:            uid(),
    code:           c.code,
    name:           c.name,
    criterionGroup: c.criterionGroup,
    dataType:       c.dataType,
    unit:           c.unit ?? '',
    isRequired:     c.isRequired,
    isCritical:     c.isCritical,
    gradeRules,
    expanded: false,  // collapsed by default for pre-filled rows
  }
}

export default function InspectionStandardVersionFormPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const formId    = useId()
  const setId     = Number(id)

  const [detail, setDetail]               = useState<InspectionStandardDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(true)
  const [effectiveFrom, setEffectiveFrom] = useState('')
  const [criteria, setCriteria]           = useState<CriterionRow[]>([makeEmptyCriterion()])
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState('')
  const [success, setSuccess]             = useState(false)

  useEffect(() => {
    if (!setId) return
    setLoadingDetail(true)
    void getInspectionStandard(setId)
      .then(d => {
        setDetail(d)
        const latest = d.versions[0]
        if (latest?.criteria.length) {
          setCriteria(latest.criteria.map(rowFromDto))
        }
      })
      .catch(e => setError(getAuthErrorMessage(e, 'Không thể tải bộ tiêu chuẩn.')))
      .finally(() => setLoadingDetail(false))
  }, [setId])

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

  const addGradeRule = (criterionId: number) =>
    setCriteria(rows => rows.map(r => {
      if (r._id !== criterionId) return r
      const next = nextSequentialGrade(r.gradeRules)
      if (!next) return r
      return { ...r, gradeRules: [...r.gradeRules, makeEmptyGradeRule(next)] }
    }))

  const removeLastGradeRule = (criterionId: number) =>
    setCriteria(rows => rows.map(r => {
      if (r._id !== criterionId || r.gradeRules.length <= 1) return r
      const sorted = [...r.gradeRules].sort(
        (a, b) => ALL_GRADES.indexOf(a.grade as never) - ALL_GRADES.indexOf(b.grade as never)
      )
      const lastId = sorted[sorted.length - 1]._id
      return { ...r, gradeRules: r.gradeRules.filter(g => g._id !== lastId) }
    }))

  // ── Derived values ──────────────────────────────────────────────────────────
  const latestVersionNo = detail?.versions[0]?.versionNo ?? 0
  const nextVersionNo   = latestVersionNo + 1
  const criticalCount   = criteria.filter(r => r.isCritical).length
  const today           = new Date().toISOString().split('T')[0]

  const checks = [
    { label: 'Ngày hiệu lực (từ hôm nay trở đi)', ok: effectiveFrom.length > 0 && effectiveFrom >= today },
    ...buildChecks(criteria, effectiveFrom, false),
  ]
  const canSave = checks.every(c => c.ok)

  const detailRoute = ROUTES.ADMIN_INSPECTION_STANDARD_DETAIL.replace(':id', String(setId))

  // ── Save ────────────────────────────────────────────────────────────────────
  async function save() {
    if (!canSave) { setError('Vui lòng kiểm tra lại các trường bắt buộc.'); return }
    setSaving(true); setError('')
    try {
      await createInspectionStandardVersion(setId, {
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
      setTimeout(() => navigate(detailRoute), 1200)
    } catch (e) {
      setError(getAuthErrorMessage(e, 'Không thể tạo phiên bản mới.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-24">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Quản trị ·{' '}
            <button onClick={() => navigate(ROUTES.ADMIN_INSPECTION_STANDARDS)} className="hover:underline">Tiêu chuẩn</button>
            {detail && (
              <> · <button onClick={() => navigate(detailRoute)} className="hover:underline">{detail.code}</button></>
            )}
            {' '}· Phiên bản mới
          </p>
          {loadingDetail ? (
            <div className="mt-2 h-8 w-64 animate-pulse rounded bg-slate-100" />
          ) : (
            <>
              <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">
                Tạo phiên bản {nextVersionNo} — {detail?.name}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Phiên bản mới trạng thái{' '}
                <span className="font-semibold text-emerald-700">Đang áp dụng</span>, số{' '}
                <b>v{nextVersionNo}</b>. Phiên bản cũ tự động chuyển sang Retired.
              </p>
            </>
          )}
        </div>
        <button onClick={() => navigate(detailRoute)}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50">
          Hủy bỏ
        </button>
      </div>

      {error   && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {success && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">✓ Tạo phiên bản thành công! Đang chuyển trang...</p>}

      {detail?.versions[0] && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          💡 Các tiêu chí đã được <b>sao chép từ phiên bản {detail.versions[0].versionNo}</b> bao gồm đầy đủ grade rules.
          Bấm <b>▶</b> vào từng tiêu chí để chỉnh sửa. Hạng thêm/xóa luôn theo thứ tự A→B→C→D→E.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">
        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Version info */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="grid size-7 place-items-center rounded bg-emerald-50 text-emerald-700">
                <AppIcon name="clipboard" className="size-4" />
              </span>
              <h2 className="text-sm font-bold text-slate-800">Thông tin phiên bản</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Số phiên bản (tự động)</span>
                <div className={`${inputCls} flex cursor-not-allowed items-center bg-slate-50 text-slate-500`}>
                  v{nextVersionNo}
                </div>
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Ngày hiệu lực <span className="text-rose-500">*</span>
                </span>
                <input id={`${formId}-eff`} type="date" value={effectiveFrom} min={today}
                  onChange={e => setEffectiveFrom(e.target.value)} className={inputCls} />
              </label>
            </div>
          </section>

          {/* Grade legend */}
          <div className="flex flex-wrap gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-[11px]">
            <span className="font-bold text-slate-500 mr-1">Hạng:</span>
            {ALL_GRADES.map(g => (
              <span key={g} className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                g==='A' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                g==='B' ? 'bg-sky-100 text-sky-800 border-sky-200' :
                g==='C' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                g==='D' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                          'bg-rose-100 text-rose-800 border-rose-200'
              }`}>{g}{g==='A'?' (Tốt nhất)':g==='E'?' (Kém nhất)':''}</span>
            ))}
            <span className="ml-2 text-rose-500">🔴 Nghiêm trọng + Ngưỡng từ chối = từ chối lô hàng khi vi phạm</span>
          </div>

          {/* Criteria */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded bg-emerald-50 text-emerald-700">
                  <AppIcon name="shield" className="size-4" />
                </span>
                <h2 className="text-sm font-bold text-slate-800">Tiêu chí kiểm định ({criteria.length})</h2>
              </div>
              <button onClick={addRow}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white hover:bg-emerald-800">
                <AppIcon name="plus" className="size-3" /> Thêm tiêu chí
              </button>
            </div>

            <div className="flex flex-wrap gap-4 border-b border-slate-100 bg-slate-50/60 px-5 py-2 text-[10px] text-slate-500">
              <span><b className="text-blue-600">NUMBER</b> – Min/Max theo từng hạng</span>
              <span><b className="text-violet-600">TEXT</b> – Giá trị chấp nhận theo từng hạng</span>
              <span><b className="text-amber-600">BOOLEAN</b> – Đạt/Không đạt</span>
              <span className="text-slate-400">Bấm <b>▶</b> để mở/đóng · Hạng luôn theo thứ tự A→B→C→D→E</span>
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
            <h2 className="font-bold text-slate-800">Tóm tắt phiên bản</h2>
            <div className="mt-4 space-y-3">
              {[
                { label: 'Phiên bản sẽ tạo', value: `v${nextVersionNo}` },
                { label: 'Tổng tiêu chí',    value: String(criteria.length).padStart(2,'0') },
                { label: 'Quan trọng',        value: String(criticalCount).padStart(2,'0'), red: true },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm">
                  <span className="text-slate-500">{item.label}</span>
                  <b className={item.red ? 'text-rose-600' : 'text-slate-900'}>{item.value}</b>
                </div>
              ))}
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

          <section className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs font-bold text-emerald-800">💡 Lưu ý phiên bản mới</p>
            <ul className="mt-2 space-y-1.5 text-xs leading-5 text-emerald-800">
              <li>Phiên bản cũ tự động → <b>RETIRED</b></li>
              <li>Grade rules sao chép từ phiên bản trước để tiện chỉnh sửa</li>
              <li>Có thể thêm hạng mới (nút <b>+ Thêm hạng X</b>) hoặc xóa hạng cuối</li>
              <li className="pt-1 border-t border-emerald-200">Hạng A <b>không được</b> là ngưỡng từ chối</li>
            </ul>
          </section>
        </aside>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Tạo phiên bản <b>v{nextVersionNo}</b> trạng thái{' '}
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">Đang áp dụng</span>
          </p>
          <div className="flex gap-3">
            <button onClick={() => navigate(detailRoute)}
              className="h-9 rounded-lg border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50">
              Hủy bỏ
            </button>
            <button disabled={saving || !canSave || loadingDetail} onClick={() => void save()}
              className="h-9 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
              {saving ? 'Đang lưu...' : `Tạo phiên bản v${nextVersionNo}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
