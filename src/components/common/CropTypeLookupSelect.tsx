import { useEffect, useId, useRef, useState } from 'react'
import { getCropType, getCropTypeLookup, type CropType, type CropTypeListResponse } from '@/services/cropTypeService'

export default function CropTypeLookupSelect({ value, onChange, categoryId, enabled = true, disabledIds = [] }: {
  value: number; onChange: (crop: CropType) => void; categoryId?: number; enabled?: boolean; disabledIds?: number[]
}) {
  const listId = useId(), cache = useRef(new Map<number, CropType>())
  const [search, setSearch] = useState(''), [page, setPage] = useState(1), [attempt, setAttempt] = useState(0)
  const [open, setOpen] = useState(false), [index, setIndex] = useState(-1)
  const [result, setResult] = useState<{ key: string; data?: CropTypeListResponse; error?: string }>()
  const [selected, setSelected] = useState<CropType>(), [selectedError, setSelectedError] = useState('')
  const key = JSON.stringify([categoryId, enabled, search.trim(), page, attempt])
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      void getCropTypeLookup({ categoryId, search: search.trim(), page, pageSize: 20 }, controller.signal).then(data => {
        if (controller.signal.aborted) return
        data.items.forEach(c => cache.current.set(c.id, c)); setResult({ key, data })
      }).catch(() => { if (!controller.signal.aborted) setResult({ key, error: 'Không tải được gợi ý. Vui lòng thử lại.' }) })
    }, 200)
    return () => { clearTimeout(timer); controller.abort() }
  }, [key, categoryId, enabled, search, page])
  useEffect(() => {
    const controller = new AbortController(); setSelectedError('')
    if (!value) { setSelected(undefined); return }
    const apply = (crop: CropType) => { if (!controller.signal.aborted) { cache.current.set(crop.id, crop); setSelected(crop); setSearch(crop.name) } }
    const known = cache.current.get(value)
    if (known) apply(known)
    else void getCropType(value, controller.signal).then(apply).catch(() => { if (!controller.signal.aborted) setSelectedError('Không đọc được nông sản đã chọn.') })
    return () => controller.abort()
  }, [value, attempt])
  const current = result?.key === key ? result : undefined, loading = enabled && !current
  const items = current?.data?.items ?? [], pages = Math.max(1, Math.ceil((current?.data?.totalCount ?? 0) / 20))
  const choose = (crop: CropType) => {
    if (disabledIds.includes(crop.id)) return
    cache.current.set(crop.id, crop); setSearch(crop.name); setSelected(crop); setOpen(false); setIndex(-1); setPage(1); onChange(crop)
  }
  return <div className="relative space-y-1" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false) }}>
    <input aria-label="Tìm nông sản" role="combobox" aria-autocomplete="list" aria-expanded={enabled && open} aria-controls={listId}
      aria-activedescendant={open && items[index] ? `${listId}-${index}` : undefined} autoComplete="off" disabled={!enabled}
      placeholder="Gõ tên hoặc mã để chọn nông sản" value={search}
      className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50 disabled:bg-slate-100"
      onFocus={() => setOpen(true)} onChange={e => { setSearch(e.target.value); setPage(1); setIndex(-1); setOpen(true) }}
      onKeyDown={e => {
        if (e.nativeEvent.isComposing) return
        if (e.key === 'Escape') { setOpen(false); return }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault(); setOpen(true)
          const step = e.key === 'ArrowDown' ? 1 : -1
          let next = index < 0 ? step > 0 ? 0 : items.length - 1 : index + step
          while (next >= 0 && next < items.length && disabledIds.includes(items[next].id)) next += step
          if (next >= 0 && next < items.length) setIndex(next)
        }
        if (e.key === 'Enter' && open) { e.preventDefault(); const crop = items[index] ?? items.find(c => !disabledIds.includes(c.id)); if (crop && !loading) choose(crop) }
      }} />
    {enabled && open && <div className="absolute left-0 right-0 z-40 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
      <ul id={listId} role="listbox" aria-label="Gợi ý nông sản" aria-busy={loading} className="max-h-64 overflow-y-auto">
        {loading ? <li className="p-3 text-sm text-slate-500">Đang tìm nông sản...</li> : current?.error ? <li role="alert" className="p-3 text-sm text-rose-700">{current.error}<button type="button" onClick={() => setAttempt(n => n + 1)} className="ml-2 underline">Thử lại</button></li> : !items.length ? <li className="p-3 text-sm text-slate-500">Không có nông sản phù hợp.</li> : items.map((crop, i) => <li id={`${listId}-${i}`} key={crop.id} role="option" aria-selected={value === crop.id} aria-disabled={disabledIds.includes(crop.id)}
          onMouseDown={e => e.preventDefault()} onMouseEnter={() => setIndex(i)} onClick={() => choose(crop)}
          className={`px-3 py-2.5 text-sm ${disabledIds.includes(crop.id) ? 'cursor-default text-slate-400' : `cursor-pointer ${index === i ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}`}>
          <span className="block font-semibold">{crop.name}{disabledIds.includes(crop.id) ? ' · Đã chọn' : ''}</span><span className="block break-all text-xs text-slate-500">{crop.code}</span>
        </li>)}
      </ul>
      {!loading && current?.data && current.data.totalCount > 20 && <div className="flex items-center justify-between gap-2 border-t border-slate-100 p-2 text-xs text-slate-500"><button type="button" disabled={page <= 1} className="rounded border px-2 py-1 disabled:opacity-40" onClick={() => { setPage(n => n - 1); setIndex(-1) }}>Trước</button><span>Trang {page}/{pages} · {current.data.totalCount} nông sản</span><button type="button" disabled={page >= pages} className="rounded border px-2 py-1 disabled:opacity-40" onClick={() => { setPage(n => n + 1); setIndex(-1) }}>Sau</button></div>}
    </div>}
    {selectedError && <p role="alert" className="text-xs text-rose-700">{selectedError}<button type="button" className="ml-2 underline" onClick={() => setAttempt(n => n + 1)}>Thử lại</button></p>}
    {value > 0 && selected?.id === value && <p className="text-xs text-slate-500">Đã chọn: {selected.name}</p>}
  </div>
}
