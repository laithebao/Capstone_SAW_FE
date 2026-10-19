import type { FormEventHandler, ReactNode } from 'react'
import { Eye, RotateCw } from 'lucide-react'
import { Link } from 'react-router'

export const warehouseFilterInput = 'h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'

export function WarehouseListFilters({ children, onSubmit, onReset, columns = 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3' }: {
  children: ReactNode
  onSubmit: FormEventHandler<HTMLFormElement>
  onReset: () => void
  columns?: string
}) {
  return <form aria-label="Tìm kiếm và bộ lọc" onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="font-semibold text-slate-900">Tìm kiếm và bộ lọc</h2>
      <button type="button" aria-label="Đặt lại bộ lọc" title="Đặt lại bộ lọc" onClick={onReset} className="grid size-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
        <RotateCw className="size-4" aria-hidden="true" />
      </button>
    </div>
    <div className={columns}>{children}<button type="submit" className="h-10 self-end rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">Áp dụng bộ lọc</button></div>
  </form>
}

export function WarehouseDetailLink({ to, label }: { to: string; label: string }) {
  return <Link to={to} aria-label={label} title={label} className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-emerald-700 transition-colors hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
    <Eye className="size-4" aria-hidden="true" />
  </Link>
}
