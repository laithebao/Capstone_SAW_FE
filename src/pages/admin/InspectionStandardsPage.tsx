import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router'
import AppIcon from '@/components/common/AppIcon'
import { getCropTypes, type CropType } from '@/services/cropTypeService'
import { createInspectionStandard, type SaveCriterion } from '@/services/inspectionStandardService'
import { getAuthErrorMessage } from '@/services/authService'
import { ROUTES } from '@/constants/routes'

// ── Local types ────────────────────────────────────────────────────────────────
interface CriterionRow extends SaveCriterion { _id: number }

const DATA_TYPES = ['NUMBER', 'TEXT', 'BOOLEAN'] as const
const GROUPS = ['ENVIRONMENT', 'LAB', 'SENSORY'] as const

const input = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'
const label = 'block space-y-1'
const labelText = 'text-[11px] font-bold uppercase tracking-wide text-slate-500'

let _nextId = 1
const uid = () => _nextId++

function makeEmpty(): CriterionRow {
  return {
    _id: uid(), code: '', name: '', criterionGroup: 'ENVIRONMENT',
    dataType: 'NUMBER', unit: '', isRequired: true, isCritical: false,
    minValue: undefined, maxValue: undefined, requiredTextValue: '', isFailRule: false,
  }
}

/** Clear threshold fields that don't apply to the given dataType */
function clearThresholdForType(row: CriterionRow, dataType: string): CriterionRow {
  if (dataType === 'NUMBER') {
    return { ...row, dataType, requiredTextValue: '', unit: row.unit }
  }
  if (dataType === 'TEXT') {
    return { ...row, dataType, minValue: undefined, maxValue: undefined, unit: '' }
  }
  // BOOLEAN
  return { ...row, dataType, minValue: undefined, maxValue: undefined, requiredTextValue: '', unit: '' }
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function InspectionStandardsPage() {
  const navigate = useNavigate()
  const formId = useId()

  const [code, setCode]               = useState('')
  const [name, setName]               = useState('')
  const [description, setDescription] = useState('')
  const [cropTypeId, setCropTypeId]   = useState(0)
  const [effectiveFrom, setEffectiveFrom] = useState('')
  const [criteria, setCriteria]       = useState<CriterionRow[]>([makeEmpty()])
  const [cropTypes, setCropTypes]     = useState<CropType[]>([])
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')

  useEffect(() => {
    void getCropTypes()
      .then(r => { setCropTypes(r.items); if (r.items[0]) setCropTypeId(r.items[0].id) })
      .catch(() => setError('Không thể tải danh sách loại nông sản.'))
  }, [])

  const updateRow = <K extends keyof CriterionRow>(id: number, key: K, value: CriterionRow[K]) =>
    setCriteria(rows => rows.map(r => r._id === id ? { ...r, [key]: value } : r))

  const changeDataType = (id: number, dt: string) =>
    setCriteria(rows => rows.map(r => r._id === id ? clearThresholdForType(r, dt) : r))

  const addRow    = () => setCriteria(r => [...r, makeEmpty()])
  const removeRow = (id: number) => setCriteria(r => r.filter(x => x._id !== id))

  // ── Summary stats
  const criticalCount = criteria.filter(r => r.isCritical).length
  const requiredCount = criteria.filter(r => r.isRequired).length

  // ── Validation checklist
  const checks = [
    { label: 'Mã bộ tiêu chuẩn',                    ok: code.trim().length > 0 },
    { label: 'Tên bộ tiêu chuẩn',                    ok: name.trim().length > 0 },
    { label: 'Loại nông sản',                        ok: cropTypeId > 0 },
    { label: 'Ngày hiệu lực (từ hôm nay trở đi)',    ok: effectiveFrom.length > 0 && effectiveFrom >= new Date().toISOString().split('T')[0] },
    { label: 'Có ít nhất 1 tiêu chí',                ok: criteria.length > 0 },
    { label: 'Tất cả tiêu chí có mã & tên',        ok: criteria.every(r => r.code.trim() && r.name.trim()) },
    { label: 'Tiêu chí số: có ít nhất Min hoặc Max', ok: criteria.every(r => r.dataType !== 'NUMBER' || r.minValue != null || r.maxValue != null) },
    { label: 'Tiêu chí số: điền đơn vị đo lường',     ok: criteria.every(r => r.dataType !== 'NUMBER' || (r.unit ?? '').trim().length > 0) },
    { label: 'Tiêu chí cảm quan: điền yêu cầu',       ok: criteria.every(r => r.dataType !== 'TEXT' || (r.requiredTextValue ?? '').trim().length > 0) },
    { label: 'Min ≤ Max ở tiêu chí số',             ok: criteria.every(r => !(r.dataType === 'NUMBER' && r.minValue != null && r.maxValue != null && r.minValue > r.maxValue)) },
  ]
  const canSave = checks.every(c => c.ok)

  const [success, setSuccess] = useState(false)

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
          code:               r.code.trim().toUpperCase(),
          name:               r.name.trim(),
          criterionGroup:     r.criterionGroup,
          dataType:           r.dataType,
          unit:               r.dataType === 'NUMBER' ? (r.unit?.trim() || undefined) : undefined,
          isRequired:         r.isRequired,
          isCritical:         r.isCritical,
          minValue:           r.dataType === 'NUMBER' ? r.minValue : undefined,
          maxValue:           r.dataType === 'NUMBER' ? r.maxValue : undefined,
          requiredTextValue:  r.dataType === 'TEXT' ? (r.requiredTextValue?.trim() || undefined) : undefined,
          isFailRule:         r.isFailRule,
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
          <p className="mt-1 text-sm text-slate-500">Thiết lập tiêu chí và quy tắc đánh giá chất lượng nông sản.</p>
        </div>
        <button onClick={() => navigate(ROUTES.ADMIN_INSPECTION_STANDARDS)}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50">
          Quay lại danh sách
        </button>
      </div>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {success && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">✓ Tạo bộ tiêu chuẩn thành công! Đang chuyển trang...</p>}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_280px]">
        {/* Left column */}
        <div className="space-y-5">
          {/* General info */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <SectionTitle icon="clipboard" title="Thông tin chung" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className={label}>
                <span className={labelText}>Mã bộ tiêu chuẩn *</span>
                <input id={`${formId}-code`} value={code} onChange={e => setCode(e.target.value)}
                  placeholder="VD: STD-RICE-001" className={input} />
              </label>
              <label className={`${label} sm:col-span-2`}>
                <span className={labelText}>Tên bộ tiêu chuẩn *</span>
                <input id={`${formId}-name`} value={name} onChange={e => setName(e.target.value)}
                  placeholder="VD: Tiêu chuẩn gạo Jasmine xuất khẩu" className={input} />
              </label>
              <label className={label}>
                <span className={labelText}>Loại nông sản *</span>
                <select id={`${formId}-cropType`} value={cropTypeId} onChange={e => setCropTypeId(Number(e.target.value))} className={input}>
                  <option value={0}>-- Chọn loại nông sản --</option>
                  {cropTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.name} · {ct.categoryName}</option>)}
                </select>
              </label>
              <label className={label}>
                <span className={labelText}>Ngày hiệu lực <span className="text-rose-500">*</span></span>
                <input id={`${formId}-effectiveFrom`} type="date" value={effectiveFrom} min={new Date().toISOString().split('T')[0]}
                  onChange={e => setEffectiveFrom(e.target.value)} className={input} required />
              </label>
            </div>
            <label className="mt-4 block space-y-1">
              <span className={labelText}>Mô tả chi tiết</span>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Mô tả mục đích và phạm vi áp dụng của bộ tiêu chuẩn này..."
                className="min-h-[80px] w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
            </label>
          </section>

          {/* Criteria table */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <SectionTitle icon="shield" title={`Tiêu chí kiểm định (${criteria.length})`} />
              <button onClick={addRow}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white hover:bg-emerald-800">
                <AppIcon name="plus" className="size-3" /> Thêm tiêu chí
              </button>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 border-b border-slate-100 bg-slate-50/60 px-5 py-2 text-[10px] text-slate-500">
              <span><b className="text-blue-600">NUMBER</b> – Nhập Min/Max + Đơn vị đo lường</span>
              <span><b className="text-violet-600">TEXT</b> – Nhập giá trị chấp nhận được (VD: XANH_TUOI)</span>
              <span><b className="text-amber-600">BOOLEAN</b> – Chỉ kiểm tra Đạt/Không đạt</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-8 px-3 py-3 text-center">#</th>
                    <th className="px-3 py-3">Mã *</th>
                    <th className="px-3 py-3">Tên tiêu chí *</th>
                    <th className="px-3 py-3">Nhóm</th>
                    <th className="px-3 py-3">Loại dữ liệu</th>
                    <th className="px-3 py-3">Ngưỡng / Giá trị đánh giá</th>
                    <th className="px-3 py-3 text-center">Bắt buộc</th>
                    <th className="px-3 py-3 text-center">Quan trọng</th>
                    <th className="w-10 px-3 py-3 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {criteria.map((row, idx) => (
                    <tr key={row._id} className="group hover:bg-slate-50/60">
                      <td className="px-3 py-2 text-center text-slate-400">{idx + 1}</td>

                      {/* Code */}
                      <td className="px-2 py-1.5">
                        <input value={row.code} onChange={e => updateRow(row._id, 'code', e.target.value)}
                          placeholder="VD: MC"
                          className="h-8 w-24 rounded border border-transparent bg-transparent px-2 text-xs font-mono uppercase focus:border-emerald-300 focus:bg-white focus:outline-none" />
                      </td>

                      {/* Name */}
                      <td className="px-2 py-1.5">
                        <input value={row.name} onChange={e => updateRow(row._id, 'name', e.target.value)}
                          placeholder="Tên tiêu chí"
                          className="h-8 w-full min-w-[140px] rounded border border-transparent bg-transparent px-2 text-xs focus:border-emerald-300 focus:bg-white focus:outline-none" />
                      </td>

                      {/* Group */}
                      <td className="px-2 py-1.5">
                        <select value={row.criterionGroup} onChange={e => updateRow(row._id, 'criterionGroup', e.target.value)}
                          className="h-8 rounded border-0 bg-transparent text-xs">
                          {GROUPS.map(g => <option key={g}>{g}</option>)}
                        </select>
                      </td>

                      {/* DataType */}
                      <td className="px-2 py-1.5">
                        <select value={row.dataType}
                          onChange={e => changeDataType(row._id, e.target.value)}
                          className={`h-8 rounded border-0 bg-transparent text-xs font-semibold ${
                            row.dataType === 'NUMBER' ? 'text-blue-600' :
                            row.dataType === 'TEXT'   ? 'text-violet-600' : 'text-amber-600'
                          }`}>
                          {DATA_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </td>

                      {/* Adaptive threshold cell */}
                      <td className="px-2 py-1.5">
                        {row.dataType === 'NUMBER' && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <span>Min</span>
                            <input type="number" value={row.minValue ?? ''}
                              onChange={e => updateRow(row._id, 'minValue', e.target.value ? Number(e.target.value) : undefined)}
                              className="h-7 w-16 rounded border border-slate-200 bg-white px-1.5 text-xs text-slate-900 focus:border-emerald-400 focus:outline-none" />
                            <span>Max</span>
                            <input type="number" value={row.maxValue ?? ''}
                              onChange={e => updateRow(row._id, 'maxValue', e.target.value ? Number(e.target.value) : undefined)}
                              className="h-7 w-16 rounded border border-slate-200 bg-white px-1.5 text-xs text-slate-900 focus:border-emerald-400 focus:outline-none" />
                            <input value={row.unit ?? ''} onChange={e => updateRow(row._id, 'unit', e.target.value)}
                              placeholder="Đơn vị"
                              className="h-7 w-16 rounded border border-slate-200 bg-white px-1.5 text-xs text-slate-600 focus:border-emerald-400 focus:outline-none" />
                          </div>
                        )}
                        {row.dataType === 'TEXT' && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <span className="text-violet-500 font-medium">Yêu cầu:</span>
                            <input value={row.requiredTextValue ?? ''}
                              onChange={e => updateRow(row._id, 'requiredTextValue', e.target.value)}
                              placeholder="VD: XANH_TUOI, THOM"
                              className="h-7 w-48 rounded border border-slate-200 bg-white px-1.5 text-xs text-slate-900 focus:border-violet-400 focus:outline-none" />
                          </div>
                        )}
                        {row.dataType === 'BOOLEAN' && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                            Đạt / Không đạt
                          </span>
                        )}
                      </td>

                      {/* IsRequired */}
                      <td className="px-2 py-1.5 text-center">
                        <input type="checkbox" checked={row.isRequired}
                          onChange={e => updateRow(row._id, 'isRequired', e.target.checked)}
                          className="size-4 accent-emerald-600" />
                      </td>

                      {/* IsCritical */}
                      <td className="px-2 py-1.5 text-center">
                        <input type="checkbox" checked={row.isCritical}
                          onChange={e => updateRow(row._id, 'isCritical', e.target.checked)}
                          className="size-4 accent-rose-600" />
                      </td>

                      {/* Delete */}
                      <td className="px-2 py-1.5 text-center">
                        <button onClick={() => removeRow(row._id)} title="Xóa tiêu chí"
                          className="h-7 w-14 rounded-md bg-rose-500 text-[11px] font-bold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                          disabled={criteria.length === 1}>
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={addRow}
              className="flex w-full items-center justify-center gap-2 border-t border-slate-100 py-3.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
              <AppIcon name="plus" className="size-4" /> Thêm tiêu chí kiểm định
            </button>
          </section>
        </div>

        {/* Right sidebar */}
        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-800">Tóm tắt</h2>
            <div className="mt-4 space-y-3">
              <SummaryRow label="Tổng tiêu chí" value={criteria.length.toString().padStart(2, '0')} />
              <SummaryRow label="Bắt buộc"      value={requiredCount.toString().padStart(2, '0')} />
              <SummaryRow label="Quan trọng"    value={criticalCount.toString().padStart(2, '0')} color="rose" />
              <SummaryRow label="NUMBER"  value={criteria.filter(r => r.dataType === 'NUMBER').length.toString().padStart(2,'0')} color="blue" />
              <SummaryRow label="TEXT"    value={criteria.filter(r => r.dataType === 'TEXT').length.toString().padStart(2,'0')} color="violet" />
              <SummaryRow label="BOOLEAN" value={criteria.filter(r => r.dataType === 'BOOLEAN').length.toString().padStart(2,'0')} color="amber" />
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
            <p className="text-xs font-bold text-emerald-800">💡 Hướng dẫn loại dữ liệu</p>
            <ul className="mt-2 space-y-1.5 text-xs leading-5 text-emerald-800">
              <li><b className="text-blue-600">NUMBER</b>: Đo lường (nhiệt độ, ẩm, nồng độ...) → nhập Min, Max, Đơn vị</li>
              <li><b className="text-violet-600">TEXT</b>: Cảm quan (màu, mùi, kết cấu...) → nhập giá trị chấp nhận</li>
              <li><b className="text-amber-600">BOOLEAN</b>: Kiểm tra có/không → chỉ ghi nhận Đạt/Không đạt</li>
              <li className="pt-1 border-t border-emerald-200">Tiêu chí <b>Quan trọng</b> sẽ gây fail cả lô nếu không đạt</li>
            </ul>
          </section>
        </aside>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Phiên bản <b>1</b> sẽ được tạo với trạng thái <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">Đang áp dụng</span>
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

// ── Sub-components ──────────────────────────────────────────────────────────────
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

function SummaryRow({ label, value, color = 'slate' }: { label: string; value: string; color?: 'slate' | 'rose' | 'blue' | 'violet' | 'amber' }) {
  const cls = { slate: 'text-slate-900', rose: 'text-rose-600', blue: 'text-blue-600', violet: 'text-violet-600', amber: 'text-amber-600' }
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <b className={cls[color]}>{value}</b>
    </div>
  )
}
