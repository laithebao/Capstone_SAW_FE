import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { apiClient } from '@/services/apiClient'
import { getAuthErrorMessage } from '@/services/authService'
import type { ApiResponse } from '@/types/api'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/constants/routes'
import AppIcon from '@/components/common/AppIcon'

interface Inbox { items: { id: number; title: string; message: string; entityType: string | null; entityId: string | null; isRead: boolean; createdAt: string }[]; unreadCount: number; totalCount: number; page: number; pageSize: number }
export default function NotificationInbox() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false), [data, setData] = useState<Inbox | null>(null), [error, setError] = useState(''), [page, setPage] = useState(1), [busy, setBusy] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const load = useCallback(async (signal?: AbortSignal) => {
    try { const r = await apiClient.get<ApiResponse<Inbox>>('/notifications', { params: { page, pageSize: 10 }, signal }); if (!signal?.aborted) { setData(r.data.data); setError('') } }
    catch (e) { if (!signal?.aborted) setError(getAuthErrorMessage(e, 'Không tải được thông báo.')) }
  }, [page])
  useEffect(() => { const c = new AbortController(); const timer = setTimeout(() => void load(c.signal), 0); return () => { clearTimeout(timer); c.abort() } }, [load])
  useEffect(() => { const focus = () => void load(); window.addEventListener('focus', focus); return () => window.removeEventListener('focus', focus) }, [load])
  useEffect(() => { if (!open) return; const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }; const outside = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }; document.addEventListener('keydown', close); document.addEventListener('mousedown', outside); return () => { document.removeEventListener('keydown', close); document.removeEventListener('mousedown', outside) } }, [open])
  const target = (type: string | null, id: string | null) => {
    if (!id || !/^\d+$/.test(id)) return null
    if (type === 'DISTRIBUTOR_ORDER' && user?.role === 'DISTRIBUTOR') return ROUTES.DISTRIBUTOR_ORDER_DETAIL.replace(':id', id)
    if (type === 'STOCK_ADJUSTMENT' && user?.role === 'WAREHOUSE_MANAGER') return ROUTES.WAREHOUSE_STOCK_ADJUSTMENT_DETAIL.replace(':id', id)
    if (type === 'STOCK_ADJUSTMENT' && user?.role === 'OPERATION_STAFF') return ROUTES.OPERATION_STOCK_ADJUSTMENT_DETAIL.replace(':id', id)
    return null
  }
  async function read(id: number) { setBusy(true); try { await apiClient.post('/notifications/' + id + '/read'); await load() } catch (e) { setError(getAuthErrorMessage(e, 'Không đánh dấu được thông báo.')) } finally { setBusy(false) } }
  return <div className="relative" ref={box}><button type="button" onClick={() => { setOpen(v => !v); void load() }} className="relative grid size-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100" aria-label="Thông báo" aria-expanded={open} aria-controls="notification-inbox"><AppIcon name="bell" className="size-5" />{!!data?.unreadCount && <span className="absolute -right-1 top-0 rounded-full bg-rose-600 px-1 text-xs text-white">{data.unreadCount}</span>}</button>{open && <section id="notification-inbox" aria-label="Hộp thông báo" className="absolute -right-24 top-12 max-h-[75vh] w-[min(90vw,420px)] overflow-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl sm:right-0"><div className="flex items-center justify-between"><h2 className="font-bold">Thông báo ({data?.unreadCount ?? 0} chưa đọc)</h2><button onClick={() => void load()} className="text-sm text-emerald-700 underline">Làm mới</button></div>{error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}{!data && !error && <p role="status">Đang tải…</p>}{data && !data.items.length && <p className="mt-4 text-sm text-slate-500">Chưa có thông báo.</p>}<ul className="mt-3 divide-y divide-slate-100">{data?.items.map(n => { const href = target(n.entityType, n.entityId); return <li key={n.id} className="space-y-2 py-3"><h3 className={n.isRead ? 'text-sm font-semibold' : 'text-sm font-bold text-emerald-800'}>{n.title}</h3><p className="whitespace-pre-wrap text-sm">{n.message}</p><p className="text-xs text-slate-500">{new Date(n.createdAt.endsWith('Z') ? n.createdAt : n.createdAt + 'Z').toLocaleString('vi-VN')}</p><div className="flex gap-3 text-sm">{href && <Link to={href} onClick={() => { void read(n.id); setOpen(false) }} className="font-semibold text-emerald-700 underline">Mở chi tiết</Link>}{!n.isRead && <button disabled={busy} onClick={() => void read(n.id)} className="underline">Đánh dấu đã đọc</button>}</div></li> })}</ul>{data && data.totalCount > data.pageSize && <div className="flex justify-between border-t pt-3 text-sm"><button disabled={page === 1} onClick={() => setPage(v => v - 1)}>Trước</button><span>Trang {page}</span><button disabled={page * data.pageSize >= data.totalCount} onClick={() => setPage(v => v + 1)}>Sau</button></div>}</section>}</div>
}
