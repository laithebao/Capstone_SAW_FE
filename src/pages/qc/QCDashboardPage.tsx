import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { listQcInspections } from '@/services/inspectionService'
import { QcStatusBadge, QcResultBadge, GradeEvaluationBadge } from '@/components/inspection/QcSharedComponents'
import AppIcon from '@/components/common/AppIcon'
import type { QcInspectionListItem } from '@/types/inspection'

// ─── helpers ──────────────────────────────────────────────────────────────────
function StatCard({
  label, value, note, icon, tone,
}: {
  label: string
  value: string | number
  note: string
  icon: string
  tone: 'green' | 'orange' | 'blue' | 'red'
}) {
  const cls = {
    green:  'bg-emerald-50 text-emerald-700',
    orange: 'bg-orange-50 text-orange-600',
    blue:   'bg-sky-50 text-sky-700',
    red:    'bg-red-50 text-red-600',
  }[tone]

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <span className={`grid size-10 place-items-center rounded-lg ${cls}`}>
          <AppIcon name={icon as never} className="size-5" />
        </span>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${cls}`}>{note}</span>
      </div>
      <p className="mt-4 text-[11px] font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
    </article>
  )
}

// ─── main ─────────────────────────────────────────────────────────────────────
export default function QCDashboardPage() {
  const navigate = useNavigate()

  const [items,   setItems]   = useState<QcInspectionListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Lấy tối đa 100 phiếu gần nhất để tính thống kê
    listQcInspections({ pageSize: 100 })
      .then(r => setItems(r.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  // ── Derived stats ──────────────────────────────────────────────────────────
  const draft      = items.filter(i => i.inspectionStatus === 'DRAFT').length
  const inProgress = items.filter(i => i.inspectionStatus === 'IN_PROGRESS').length
  const completed  = items.filter(i => i.inspectionStatus === 'COMPLETED').length
  const failed     = items.filter(i => i.qcResult === 'FAIL').length
  const passRate   = completed
    ? Math.round(((completed - failed) / completed) * 100)
    : null

  const recent = items.slice(0, 8)

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 pb-10">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Kiểm soát chất lượng</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Bảng điều khiển</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tổng quan phiếu kiểm định và tiến độ công việc của bạn.
          </p>
        </div>
        <button
          id="btn-create-inspection"
          onClick={() => navigate(ROUTES.QC_INSPECTION_NEW)}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
        >
          <AppIcon name="plus" className="size-4" />
          Tạo phiếu kiểm định
        </button>
      </div>

      {/* ── Quick-access pills ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Bảng điều khiển', icon: 'dashboard', route: ROUTES.QC },
          { label: 'Phiếu kiểm định', icon: 'clipboard',  route: ROUTES.QC_INSPECTIONS },
          { label: 'Tạo phiếu mới',  icon: 'plus',       route: ROUTES.QC_INSPECTION_NEW },
        ].map(item => (
          <button
            key={item.label}
            onClick={() => navigate(item.route)}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <AppIcon name={item.icon as never} className="size-4" />
            {item.label}
          </button>
        ))}
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Chờ kiểm định (DRAFT)"
            value={draft}
            note={draft > 0 ? 'Cần khai báo tỷ lệ' : 'Không có'}
            icon="pending"
            tone="orange"
          />
          <StatCard
            label="Đang thực hiện"
            value={inProgress}
            note={inProgress > 0 ? 'Đang nhập kết quả' : 'Không có'}
            icon="clipboard"
            tone="blue"
          />
          <StatCard
            label="Hoàn thành"
            value={completed}
            note={passRate !== null ? `Tỷ lệ đạt ${passRate}%` : 'Chưa có'}
            icon="shield"
            tone="green"
          />
          <StatCard
            label="Không đạt (FAIL)"
            value={failed}
            note={failed > 0 ? 'Cần xem xét' : 'Không có'}
            icon="alert"
            tone={failed > 0 ? 'red' : 'green'}
          />
        </div>
      )}

      {/* ── Main content: Recent inspections + Quick actions ───────────────── */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_320px]">

        {/* Recent inspections table */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <header className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800">Phiếu kiểm định gần đây</h2>
            <button
              onClick={() => navigate(ROUTES.QC_INSPECTIONS)}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Xem tất cả →
            </button>
          </header>

          {loading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
              <AppIcon name="clipboard" className="size-10 opacity-30" />
              <p className="text-sm font-semibold">Chưa có phiếu kiểm định nào</p>
              <button
                onClick={() => navigate(ROUTES.QC_INSPECTION_NEW)}
                className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-700 px-4 text-xs font-bold text-white hover:bg-emerald-800"
              >
                <AppIcon name="plus" className="size-3.5" />
                Tạo phiếu đầu tiên
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Mã phiếu</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Lô hàng</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Sản phẩm</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Kết quả</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Ngày bắt đầu</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recent.map(item => (
                    <tr
                      key={item.id}
                      onClick={() => navigate(`${ROUTES.QC_INSPECTIONS}/${item.id}`)}
                      className="cursor-pointer hover:bg-emerald-50/40 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-700">
                        {item.inspectionCode}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-slate-600">{item.batchCode}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {item.productName}
                        <span className="ml-1 text-slate-400">({item.cropTypeName})</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <QcStatusBadge status={item.inspectionStatus} />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {item.qcResult && <QcResultBadge result={item.qcResult} />}
                          {item.qualityGrade && <GradeEvaluationBadge grade={item.qualityGrade} />}
                          {!item.qcResult && <span className="text-xs text-slate-400">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {new Date(item.startedAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-4 py-3.5">
                        <AppIcon name="package" className="size-4 text-slate-300" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Quick actions panel */}
        <aside className="space-y-4">

          {/* Công việc */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <header className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800">Công việc cần xử lý</h2>
            </header>
            <div className="divide-y divide-slate-50 px-5">
              {[
                {
                  icon: 'clipboard' as const,
                  title: 'Danh sách phiếu',
                  desc: 'Tra cứu và theo dõi tiến độ',
                  route: ROUTES.QC_INSPECTIONS,
                  badge: items.length > 0 ? `${items.length} phiếu` : undefined,
                },
                {
                  icon: 'plus' as const,
                  title: 'Tạo phiếu mới',
                  desc: 'Chọn lô hàng PENDING_QC',
                  route: ROUTES.QC_INSPECTION_NEW,
                },
                {
                  icon: 'pending' as const,
                  title: 'Phiếu đang thực hiện',
                  desc: inProgress > 0 ? `${inProgress} phiếu chờ nhập kết quả` : 'Không có phiếu đang thực hiện',
                  route: ROUTES.QC_INSPECTIONS,
                  badge: inProgress > 0 ? String(inProgress) : undefined,
                  badgeTone: 'orange' as const,
                },
              ].map(item => (
                <div
                  key={item.title}
                  onClick={() => navigate(item.route)}
                  className="flex cursor-pointer items-center gap-3 py-4 -mx-5 px-5 hover:bg-emerald-50/40 transition-colors rounded-lg"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                    <AppIcon name={item.icon} className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="truncate text-xs text-slate-500">{item.desc}</p>
                  </div>
                  {item.badge && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      item.badgeTone === 'orange'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Phân bổ trạng thái */}
          {!loading && items.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-bold text-slate-800">Phân bổ trạng thái</h2>
              <div className="space-y-3">
                {[
                  { label: 'DRAFT',       count: draft,      color: 'bg-amber-400',   pct: items.length },
                  { label: 'IN_PROGRESS', count: inProgress, color: 'bg-blue-500',    pct: items.length },
                  { label: 'COMPLETED',   count: completed,  color: 'bg-emerald-500', pct: items.length },
                ].map(row => (
                  <div key={row.label}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-semibold text-slate-600">{row.label}</span>
                      <span className="text-slate-400">{row.count} phiếu</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all ${row.color}`}
                        style={{ width: row.pct > 0 ? `${Math.round((row.count / row.pct) * 100)}%` : '0%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </aside>
      </div>
    </div>
  )
}
