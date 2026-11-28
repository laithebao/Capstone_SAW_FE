import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Filter, X } from 'lucide-react'
import './operation-receipt-filters.css'

type Tab = { value: string; label: string }
export function OperationSmartFilters({ tabs, status, onStatus, loadCount, quick, advanced, chips = [], onApply }: {
  tabs: Tab[]; status: string; onStatus: (value: string) => void
  loadCount: (status: string, signal: AbortSignal) => Promise<number>
  quick: ReactNode; advanced: ReactNode; chips?: { label: string; remove: () => void }[]
  onApply: () => boolean
}) {
  const [open, setOpen] = useState(false)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    void Promise.allSettled(tabs.map(tab => loadCount(tab.value, controller.signal))).then(results => {
      if (!controller.signal.aborted) setCounts(Object.fromEntries(results.flatMap((result, i) => result.status === 'fulfilled' ? [[tabs[i].value, result.value]] : [])))
    })
    return () => controller.abort()
  }, [loadCount, tabs])
  return <section className="op-smart-panel" aria-label="Tìm kiếm và bộ lọc"><div className="op-status-tabs" role="tablist" aria-label="Lọc trạng thái">{tabs.map(tab => <button key={tab.value} type="button" role="tab" aria-selected={status === tab.value} onClick={() => onStatus(tab.value)}>{tab.label}<span>{counts[tab.value] ?? '—'}</span></button>)}</div><div className="op-smart-body"><div className="op-quick-filter">{quick}<button type="button" className="op-filter-toggle" aria-expanded={open} onClick={() => setOpen(value => !value)}><Filter /> Bộ lọc</button></div>{open && <div className="op-advanced-filter">{advanced}<button type="button" className="op-filter-apply" onClick={() => { if (onApply()) { setError(''); setOpen(false) } else setError('Ngày bắt đầu không được lớn hơn ngày kết thúc.') }}>Áp dụng</button>{error && <p role="alert" className="op-filter-error">{error}</p>}</div>}<div className="op-filter-chips">{status && <button type="button" onClick={() => onStatus('')}>{tabs.find(tab => tab.value === status)?.label}<X /></button>}{chips.map(chip => <button type="button" key={chip.label} onClick={chip.remove}>{chip.label}<X /></button>)}</div></div></section>
}
