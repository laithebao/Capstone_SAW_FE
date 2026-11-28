import type { ReactNode } from 'react'
import { DashboardLink } from './DashboardLink'
import { ArrowRight } from 'lucide-react'

type DashboardPanelProps = { children: ReactNode; className?: string }

/** Shared surface for dashboard sections, including responsive padding. */
export function DashboardPanel({ children, className = '' }: DashboardPanelProps) {
  return <section className={`min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 ${className}`}>{children}</section>
}

export function DashboardSectionHeading({ eyebrow, title, description, to, linkLabel }: {
  eyebrow: string; title: string; description: string; to: string; linkLabel: string
}) {
  return <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">{eyebrow}</p><h2 className="mt-1 text-lg font-bold">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div><DashboardLink to={to} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-900">{linkLabel} <ArrowRight aria-hidden="true" className="size-4" /></DashboardLink></div>
}
