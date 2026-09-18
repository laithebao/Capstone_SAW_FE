import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import AppIcon from '@/components/common/AppIcon'
import { getInspectionStandard, type InspectionStandardDetail, type InspectionStandardVersionDto } from '@/services/inspectionStandardService'
import { getAuthErrorMessage } from '@/services/authService'
import { ROUTES } from '@/constants/routes'

// ── Status badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT:          'bg-amber-50 text-amber-700 border border-amber-200',
    PENDING_REVIEW: 'bg-blue-50 text-blue-700 border border-blue-200',
    PUBLISHED:      'bg-emerald-50 text-emerald-700 border border-emerald-200',
    RETIRED:        'bg-slate-100 text-slate-500 border border-slate-200',
  }
  const label: Record<string, string> = {
    DRAFT:          'Bản nháp',
    PENDING_REVIEW: 'Chờ duyệt',
    PUBLISHED:      'Đang áp dụng',
    RETIRED:        'Ngừng áp dụng',
  }
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {label[status] ?? status}
    </span>
  )
}

// ── Version panel ──────────────────────────────────────────────────────────────
function VersionPanel({ version, isLatest }: { version: InspectionStandardVersionDto; isLatest: boolean }) {
  const [expanded, setExpanded] = useState(isLatest)

  return (
    <div className={`rounded-xl border shadow-sm ${isLatest ? 'border-emerald-200 bg-white' : 'border-slate-200 bg-white'}`}>
      {/* Version header */}
      <button
        onClick={() => setExpanded(x => !x)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className={`grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold ${isLatest ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
            v{version.versionNo}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">Phiên bản {version.versionNo}</span>
              {isLatest && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Mới nhất</span>}
              <StatusBadge status={version.status} />
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {version.criterionCount} tiêu chí
              {version.effectiveFrom ? ` · Hiệu lực từ ${version.effectiveFrom}` : ''}
              {' · '}Tạo lúc {new Date(version.createdAt).toLocaleDateString('vi-VN')}
            </p>
          </div>
        </div>
        <AppIcon name={expanded ? 'chevron-up' : 'chevron-down'} className="size-4 shrink-0 text-slate-400" />
      </button>

      {/* Criteria table */}
      {expanded && (
        <div className="border-t border-slate-100">
          {version.criteria.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-400">Phiên bản này chưa có tiêu chí nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Mã</th>
                    <th className="px-4 py-3">Tên tiêu chí</th>
                    <th className="px-4 py-3">Nhóm</th>
                    <th className="px-4 py-3">Loại dữ liệu</th>
                    <th className="px-4 py-3">Ngưỡng / Giá trị đánh giá</th>
                    <th className="px-4 py-3 text-center">Bắt buộc</th>
                    <th className="px-4 py-3 text-center">Quan trọng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {version.criteria.map(c => (
                    <tr key={c.id} className={`${c.isCritical ? 'bg-rose-50/40' : ''} hover:bg-slate-50/60`}>
                      <td className="px-4 py-2.5 font-mono font-bold text-emerald-700">{c.code}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{c.name}</td>
                      <td className="px-4 py-2.5">
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600">
                          {c.criterionGroup}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          c.dataType === 'NUMBER'  ? 'bg-blue-50 text-blue-700' :
                          c.dataType === 'TEXT'    ? 'bg-violet-50 text-violet-700' :
                                                     'bg-amber-50 text-amber-700'
                        }`}>
                          {c.dataType}
                        </span>
                      </td>

                      {/* ── Adaptive threshold cell ── */}
                      <td className="px-4 py-2.5">
                        {c.dataType === 'NUMBER' && (
                          <span className="tabular-nums text-slate-700">
                            {c.minValue != null || c.maxValue != null ? (
                              <>
                                <span className="text-slate-400 text-[10px] mr-1">min</span>
                                <b>{c.minValue ?? '—'}</b>
                                <span className="mx-1.5 text-slate-300">~</span>
                                <span className="text-slate-400 text-[10px] mr-1">max</span>
                                <b>{c.maxValue ?? '—'}</b>
                                {c.unit && <span className="ml-1.5 text-slate-400">{c.unit}</span>}
                              </>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </span>
                        )}
                        {c.dataType === 'TEXT' && (
                          c.requiredTextValue ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-[10px] text-violet-400 font-medium">Yêu cầu:</span>
                              <span className="rounded bg-violet-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-violet-700">
                                {c.requiredTextValue}
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )
                        )}
                        {c.dataType === 'BOOLEAN' && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                            Đạt / Không đạt
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-2.5 text-center">
                        {c.isRequired ? <span className="text-emerald-600">✓</span> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {c.isCritical ? <span className="font-bold text-rose-600">⚠</span> : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function InspectionStandardDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<InspectionStandardDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const setId = Number(id)

  useEffect(() => {
    if (!setId) return
    setLoading(true)
    void getInspectionStandard(setId)
      .then(setDetail)
      .catch(e => setError(getAuthErrorMessage(e, 'Không thể tải chi tiết bộ tiêu chuẩn.')))
      .finally(() => setLoading(false))
  }, [setId])

  const latestVersion = detail?.versions[0]
  // Allow creating new version as long as the set is active (versions are created as PUBLISHED directly)
  const canCreateVersion = !!detail?.isActive

  const goToNewVersion = () => {
    navigate(ROUTES.ADMIN_INSPECTION_STANDARD_VERSION_NEW.replace(':id', String(setId)))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center">
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error || 'Không tìm thấy bộ tiêu chuẩn.'}</p>
        <button onClick={() => navigate(ROUTES.ADMIN_INSPECTION_STANDARDS)}
          className="mt-4 text-sm text-emerald-700 hover:underline">← Quay lại danh sách</button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 pb-12">
      {/* Breadcrumb + header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Quản trị · <button onClick={() => navigate(ROUTES.ADMIN_INSPECTION_STANDARDS)} className="hover:underline">Tiêu chuẩn kiểm định</button> · Chi tiết
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">{detail.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span className="font-mono font-bold text-emerald-700">{detail.code}</span>
            <span>·</span>
            <span>{detail.cropTypeName}</span>
            <span>·</span>
            <span>{detail.versions.length} phiên bản</span>
            {!detail.isActive && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">Ngừng hoạt động</span>}
          </div>
          {detail.description && <p className="mt-2 text-sm text-slate-500">{detail.description}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => navigate(ROUTES.ADMIN_INSPECTION_STANDARDS)}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50">
            ← Quay lại
          </button>
          <button
            onClick={goToNewVersion}
            disabled={!detail.isActive}
            title={!canCreateVersion ? 'Phiên bản hiện tại đang DRAFT – hãy phê duyệt trước' : undefined}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <AppIcon name="plus" className="size-4" />
            Tạo phiên bản mới
          </button>
        </div>
      </div>

      {/* Warning when set is inactive */}
      {!detail.isActive && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          ⚠ Bộ tiêu chuẩn này đã <b>ngừng hoạt động</b>. Không thể tạo phiên bản mới.
        </div>
      )}

      {/* Versions */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
          Lịch sử phiên bản ({detail.versions.length})
        </h2>
        {detail.versions.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-400">
            Chưa có phiên bản nào.
          </p>
        ) : (
          <div className="space-y-3">
            {detail.versions.map((v, idx) => (
              <VersionPanel key={v.versionId} version={v} isLatest={idx === 0} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
