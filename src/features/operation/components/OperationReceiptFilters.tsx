import { useEffect, useState } from 'react'
import { Filter, Search, X } from 'lucide-react'
import { getGoodsReceipts } from '@/services/goodsReceiptService'
import type { GoodsReceiptFilters, GoodsReceiptOptions } from '@/types/goodsReceipt'
import './operation-receipt-filters.css'

const tabs = [{ value: '', label: 'Tất cả' }, { value: 'DRAFT', label: 'Nháp' }, { value: 'COMMITTED', label: 'Đã xác nhận nhập kho' }]
export default function OperationReceiptFilters({ draft, setDraft, filters, setFilters, options }: {
  draft: GoodsReceiptFilters; setDraft: (value: GoodsReceiptFilters) => void
  filters: GoodsReceiptFilters; setFilters: (value: GoodsReceiptFilters) => void
  options: GoodsReceiptOptions | null
}) {
  const [open, setOpen] = useState(false)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    void Promise.allSettled(tabs.map(tab => getGoodsReceipts({ status: tab.value || undefined, sortBy: 'receivedAtDesc', page: 1, pageSize: 1 }, controller.signal))).then(results => {
      if (!controller.signal.aborted) setCounts(Object.fromEntries(results.flatMap((result, i) => result.status === 'fulfilled' ? [[tabs[i].value, result.value.totalCount]] : [])))
    })
    return () => controller.abort()
  }, [])
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if ((draft.search || '') !== (filters.search || '')) setFilters({ ...filters, search: draft.search || undefined, page: 1 })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [draft.search, filters, setFilters])
  const quick = (patch: Partial<GoodsReceiptFilters>) => { setDraft({ ...draft, ...patch }); setFilters({ ...filters, ...patch, page: 1 }) }
  const remove = (key: 'fromDate' | 'toDate' | 'supplierId' | 'warehouseLocationId' | 'status') => { setDraft({ ...draft, [key]: undefined }); setFilters({ ...filters, [key]: undefined, page: 1 }) }
  const apply = () => {
    if (draft.fromDate && draft.toDate && draft.fromDate > draft.toDate) { setError('Ngày bắt đầu không được lớn hơn ngày kết thúc.'); return }
    setError(''); setFilters({ ...filters, fromDate: draft.fromDate, toDate: draft.toDate, sortBy: draft.sortBy, page: 1 }); setOpen(false)
  }
  return <section className="op-smart-panel" aria-label="Tìm kiếm và bộ lọc phiếu nhập">
    <div className="op-status-tabs" role="tablist" aria-label="Trạng thái phiếu nhập">{tabs.map(tab => <button key={tab.value} type="button" role="tab" aria-selected={(filters.status || '') === tab.value} onClick={() => quick({ status: tab.value || undefined })}>{tab.label}<span>{counts[tab.value] ?? '—'}</span></button>)}</div>
    <div className="op-smart-body"><div className="op-quick-filter"><label className="op-filter-search"><Search /><input className="op-filter-control" aria-label="Mã phiếu hoặc mã lô" placeholder="Tìm mã phiếu / mã lô" maxLength={100} value={draft.search ?? ''} onChange={event => setDraft({ ...draft, search: event.target.value || undefined })} /></label><select className="op-filter-control op-filter-select" aria-label="Nhà cung cấp" value={draft.supplierId ?? ''} onChange={event => quick({ supplierId: Number(event.target.value) || undefined })}><option value="">Tất cả nhà cung cấp</option>{options?.suppliers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select className="op-filter-control op-filter-select" aria-label="Vị trí kho" value={draft.warehouseLocationId ?? ''} onChange={event => quick({ warehouseLocationId: Number(event.target.value) || undefined })}><option value="">Tất cả vị trí</option>{options?.locations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button type="button" className="op-filter-toggle" aria-expanded={open} onClick={() => setOpen(value => !value)}><Filter /> Bộ lọc</button></div>
    {open && <div className="op-advanced-filter"><label>Ngày nhận từ<input type="date" className="op-filter-control" value={draft.fromDate ?? ''} max={draft.toDate} onChange={event => setDraft({ ...draft, fromDate: event.target.value || undefined })} /></label><label>Ngày nhận đến<input type="date" className="op-filter-control" value={draft.toDate ?? ''} min={draft.fromDate} onChange={event => setDraft({ ...draft, toDate: event.target.value || undefined })} /></label><label>Sắp xếp<select className="op-filter-control" value={draft.sortBy} onChange={event => setDraft({ ...draft, sortBy: event.target.value })}><option value="receivedAtDesc">Ngày nhận mới nhất</option><option value="receivedAtAsc">Ngày nhận cũ nhất</option><option value="idDesc">Thứ tự lập mới nhất</option><option value="idAsc">Thứ tự lập cũ nhất</option></select></label><button type="button" className="op-filter-apply" onClick={apply}>Áp dụng</button>{error && <p role="alert" className="op-filter-error">{error}</p>}</div>}
    <div className="op-filter-chips">{filters.search && <button type="button" onClick={() => { setDraft({ ...draft, search: undefined }); setFilters({ ...filters, search: undefined, page: 1 }) }}>Tìm: {filters.search}<X /></button>}{filters.sortBy !== 'receivedAtDesc' && <button type="button" onClick={() => { setDraft({ ...draft, sortBy: 'receivedAtDesc' }); setFilters({ ...filters, sortBy: 'receivedAtDesc', page: 1 }) }}>Sắp xếp: { { receivedAtAsc: 'Ngày nhận cũ nhất', idDesc: 'Phiếu tạo mới nhất', idAsc: 'Phiếu tạo cũ nhất' }[filters.sortBy] || filters.sortBy}<X /></button>}{filters.status && <button type="button" onClick={() => remove('status')}>{tabs.find(tab => tab.value === filters.status)?.label}<X /></button>}{filters.supplierId && <button type="button" onClick={() => remove('supplierId')}>{options?.suppliers.find(item => item.id === filters.supplierId)?.name || 'Nhà cung cấp'}<X /></button>}{filters.warehouseLocationId && <button type="button" onClick={() => remove('warehouseLocationId')}>{options?.locations.find(item => item.id === filters.warehouseLocationId)?.name || 'Vị trí'}<X /></button>}{filters.fromDate && <button type="button" onClick={() => remove('fromDate')}>Từ {filters.fromDate}<X /></button>}{filters.toDate && <button type="button" onClick={() => remove('toDate')}>Đến {filters.toDate}<X /></button>}</div></div>
  </section>
}
