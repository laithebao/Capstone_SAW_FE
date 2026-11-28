import { formatVietnamDateTime } from '@/utils/vietnamTime'
import { useEffect, useRef, useState } from 'react'
import { apiClient } from '@/services/apiClient'
import type { ApiResponse } from '@/types/api'
import type { NotificationItem } from '@/types/notification'
import { watchNotificationUpdates } from '@/services/notificationEvents'
import { isVisibleNotification, notificationMessage } from '@/services/notificationFormat'
export default function NotificationPopups({ onOpen }: { onOpen: (item: NotificationItem) => void }) {
  const [queue, setQueue] = useState<NotificationItem[]>([]), seen = useRef(new Set<number>())
  // Per mounted tab/account. Survives StrictMode's effect replay without taking a
  // second snapshot that could hide a notification arriving during initialization.
  const baselineRequest = useRef<Promise<number[]> | null>(null)
  useEffect(() => {
    const controller = new AbortController(); let baseline: number[] | undefined, busy = false
    const load = async () => {
      if (busy || controller.signal.aborted) return; busy = true
      try {
        if (!baseline) {
          baselineRequest.current ??= apiClient.post<ApiResponse<{ baselineIds: number[] }>>('/notifications/popup/initialize')
            .then(response => response.data.data.baselineIds).catch(error => { baselineRequest.current = null; throw error })
          baseline = await baselineRequest.current
        }
        if (controller.signal.aborted) return
        const result = await apiClient.post<ApiResponse<NotificationItem[]>>('/notifications/popup/poll', { baselineIds: baseline }, { signal: controller.signal })
        if (controller.signal.aborted) return
        const old = result.data.data.filter(x => seen.current.has(x.id))
        if (old.length) await apiClient.post('/notifications/popup/acknowledge', old.map(x => x.id), { signal: controller.signal })
        if (controller.signal.aborted) return
        setQueue(current => [...current, ...result.data.data.filter(x => isVisibleNotification(x) && !seen.current.has(x.id) && !current.some(c => c.id === x.id))])
      } catch { /* Retry next poll; retain pending rows on the server. */ } finally { busy = false }
    }
    void load(); const stop = watchNotificationUpdates(() => void load())
    return () => { controller.abort(); stop() }
  }, [])
  const visible = queue.slice(0, 3)
  useEffect(() => {
    const fresh = visible.filter(x => !seen.current.has(x.id)); if (!fresh.length) return
    fresh.forEach(x => seen.current.add(x.id))
    void apiClient.post('/notifications/popup/acknowledge', fresh.map(x => x.id)).catch(() => {})
  }, [visible])
  const dismiss = (id: number) => setQueue(items => items.filter(x => x.id !== id))
  return <div aria-live="polite" className="fixed right-4 top-20 z-[100] flex w-[min(400px,calc(100vw-2rem))] flex-col gap-3">{visible.map(item => <Popup key={item.id} item={item} onClose={() => dismiss(item.id)} onOpen={() => { dismiss(item.id); onOpen(item) }} />)}</div>
}
function Popup({ item, onClose, onOpen }: { item: NotificationItem; onClose: () => void; onOpen: () => void }) {
  const closeRef = useRef(onClose); closeRef.current = onClose
  useEffect(() => { const timer = setTimeout(() => closeRef.current(), 7000); return () => clearTimeout(timer) }, [])
  return <section className="relative rounded-xl border border-emerald-200 bg-white p-4 pr-10 shadow-lg"><button type="button" aria-label="Đóng thông báo" onClick={onClose} className="absolute right-3 top-2 text-xl text-slate-500">×</button><button type="button" onClick={onOpen} className="w-full text-left"><h3 className="text-sm font-bold text-slate-900">{item.title}</h3><p className="mt-1 text-sm text-slate-600">{notificationMessage(item)}</p><time className="mt-2 block text-xs text-slate-400">{formatVietnamDateTime(/Z$|[+-]\d\d:\d\d$/.test(item.createdAt) ? item.createdAt : item.createdAt + 'Z', { timeZone: 'Asia/Ho_Chi_Minh' })}</time></button></section>
}
