import { getProductBatchStatusPresentation, type ProductBatchStatusTone } from '@/features/operation/productBatchStatus'

const badgeClasses: Record<ProductBatchStatusTone, string> = {
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  red: 'border-red-200 bg-red-50 text-red-700',
  slate: 'border-slate-200 bg-slate-100 text-slate-700',
}

const dotClasses: Record<ProductBatchStatusTone, string> = {
  amber: 'bg-amber-500',
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  red: 'bg-red-500',
  slate: 'bg-slate-500',
}

export default function ProductBatchStatusBadge({ status, compact = false }: { status: string; compact?: boolean }) {
  const { label, tone } = getProductBatchStatusPresentation(status)

  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-medium whitespace-nowrap ${compact ? 'text-[11px]' : 'text-xs'} ${badgeClasses[tone]}`}>
    <span className={`size-1.5 shrink-0 rounded-full ${dotClasses[tone]}`} aria-hidden="true" />
    {label}
  </span>
}
